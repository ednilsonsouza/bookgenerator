import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '@/lib/appwrite/config'
import { Query } from 'node-appwrite'
import { openai, MODEL } from '@/lib/openai/client'
import {
  buildLiteraryChapterSystem,
  buildLiteraryChapterUser,
  buildAcademicChapterSystem,
  buildAcademicChapterUser,
  type AcademicSource,
  type ChapterContext,
} from '@/lib/openai/prompts/chapterPrompt'
import { truncate } from '@/lib/utils'
import { ID } from 'node-appwrite'
import type { BookProject, Chapter } from '@/types/book'
import type { AcademicSubtype, LiteraryGenre } from '@/types/book'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

// ── Cosine similarity (inline para não importar módulo cliente) ───────────────
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, nA = 0, nB = 0
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; nA += a[i]*a[i]; nB += b[i]*b[i] }
  const d = Math.sqrt(nA) * Math.sqrt(nB)
  return d === 0 ? 0 : dot / d
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: [text.slice(0, 2000)],
    dimensions: 256,
  })
  return res.data[0].embedding
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params

  try {
    const { userId, jobId, chapterId, previousContent } = await req.json()
    const { databases } = createAdminClient()

    // Segurança
    const book = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId) as Record<string, unknown>
    if ((book.userId as string) !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    // Busca capítulo
    const chapterDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, chapterId) as Record<string, unknown>

    // Todos capítulos para contexto
    const allChaptersRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAPTERS, [
      Query.equal('bookProjectId', bookId),
      Query.orderAsc('order'),
      Query.limit(50),
    ])

    const allChapters: Chapter[] = allChaptersRes.documents.map((c) => ({
      id:            c.$id,
      bookProjectId: bookId,
      title:         c.title as string,
      order:         c.order as number,
      targetPages:   c.targetPages as number,
      targetWords:   c.targetWords as number,
      description:   c.description as string | undefined,
      status:        c.status as Chapter['status'],
    }))

    const chapter: Chapter = {
      id:            chapterDoc.$id as string,
      bookProjectId: bookId,
      title:         chapterDoc.title as string,
      order:         chapterDoc.order as number,
      targetPages:   chapterDoc.targetPages as number,
      targetWords:   chapterDoc.targetWords as number,
      description:   chapterDoc.description as string | undefined,
      status:        chapterDoc.status as Chapter['status'],
    }

    const bookObj: BookProject = {
      id:              book.$id as string,
      userId:          book.userId as string,
      title:           book.title as string,
      theme:           book.theme as string,
      type:            book.type as 'academic' | 'literary',
      academicSubtype: book.academicSubtype as AcademicSubtype | undefined,
      literaryGenre:   book.literaryGenre as LiteraryGenre | undefined,
      description:     book.description as string,
      targetPages:     book.targetPages as number,
      status:          book.status as BookProject['status'],
      visibility:      book.visibility as BookProject['visibility'],
      coverFileId:     book.coverFileId as string | undefined,
      finalPdfFileId:  book.finalPdfFileId as string | undefined,
      createdAt:       book.$createdAt as string,
      updatedAt:       book.$updatedAt as string,
    }

    // Atualiza status do capítulo para generating
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, chapterId, {
      status: 'generating',
    })

    // Atualiza job
    if (jobId) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, jobId, {
        currentStep: `Gerando: ${chapter.title}...`,
      })
    }

    const ctx: ChapterContext = { book: bookObj, chapter, allChapters, previousContent }

    let generatedContent = ''
    let citations: string[]      = []
    let sourceChunkIds: string[] = []

    // ── ACADÊMICO: RAG ────────────────────────────────────────────────────────
    if (bookObj.type === 'academic') {
      const query = `${chapter.title} ${chapter.description ?? ''} ${bookObj.theme}`
      const queryEmbedding = await embedQuery(query)

      // Busca todos os chunks do projeto
      const chunksRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
        Query.equal('bookProjectId', bookId),
        Query.limit(200),
      ])

      // Rank por similaridade
      const ranked = chunksRes.documents
        .filter((c) => c.embeddingJson)
        .map((c) => ({
          chunkId:     c.$id as string,
          referenceId: c.referenceId as string,
          text:        c.chunkText as string,
          score:       cosineSimilarity(queryEmbedding, JSON.parse(c.embeddingJson as string)),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)

      // Busca citationKey de cada referência
      const refIds = [...new Set(ranked.map((r) => r.referenceId))]
      const refDocs = await Promise.all(
        refIds.map((refId) =>
          databases.getDocument(DATABASE_ID, COLLECTIONS.REFERENCES, refId)
            .then((d) => d as Record<string, unknown>)
            .catch(() => null)
        )
      )
      const refMap: Record<string, { citationKey: string; abnt: string }> = {}
      refDocs.forEach((d) => {
        if (d) refMap[d.$id as string] = {
          citationKey: (d.citationKey as string) ?? 'AUTOR (S.D.)',
          abnt:        (d.abntFormattedReference as string) ?? '',
        }
      })

      const sources: AcademicSource[] = ranked.map((r) => ({
        chunkId:     r.chunkId,
        citationKey: refMap[r.referenceId]?.citationKey ?? 'AUTOR (S.D.)',
        abnt:        refMap[r.referenceId]?.abnt ?? '',
        excerpt:     r.text,
        score:       r.score,
      }))

      sourceChunkIds = sources.map((s) => s.chunkId)
      citations      = [...new Set(sources.map((s) => s.citationKey))]

      // Gera o capítulo acadêmico
      const completion = await openai.chat.completions.create({
        model:       MODEL,
        temperature: 0.5,
        max_tokens:  4096,
        messages: [
          { role: 'system', content: buildAcademicChapterSystem(bookObj) },
          { role: 'user',   content: buildAcademicChapterUser(ctx, sources) },
        ],
      })
      generatedContent = completion.choices[0]?.message?.content ?? ''

    // ── LITERÁRIO ─────────────────────────────────────────────────────────────
    } else {
      const completion = await openai.chat.completions.create({
        model:       MODEL,
        temperature: 0.8,
        max_tokens:  4096,
        messages: [
          { role: 'system', content: buildLiteraryChapterSystem(bookObj) },
          { role: 'user',   content: buildLiteraryChapterUser(ctx) },
        ],
      })
      generatedContent = completion.choices[0]?.message?.content ?? ''
    }

    if (!generatedContent.trim()) {
      throw new Error('Conteúdo vazio retornado pela IA.')
    }

    // Remove indicadores de página fictícios (p. X, p. XX, p. 000, etc.)
    // gerados pela IA quando não tem a paginação real da fonte.
    generatedContent = generatedContent
      .replace(/,\s*p\.\s*X+\b/gi, '')           // ", p. X" ou ", p. XX"
      .replace(/,\s*p\.\s*\d{1,4}\b/g, (m) => {
        // Mantém apenas se o número parece real (não placeholder óbvio como 000)
        const n = parseInt(m.replace(/\D/g, ''), 10)
        return (n === 0 || n > 9999) ? '' : m
      })
      .replace(/\(\s*([A-ZÁÀÃÊÉÍÓÕÚÇ]+(?:\s+[A-ZÁÀÃÊÉÍÓÕÚÇ]+)*),\s*(\d{4}),\s*p\.\s*X+\s*\)/gi,
        '($1, $2)')                               // "(SILVA, 2023, p. X)" → "(SILVA, 2023)"
      .trim()

    // ── Salva seções ──────────────────────────────────────────────────────────
    const MAX_SECTION = 7400
    const parts: string[] = []
    if (generatedContent.length <= MAX_SECTION) {
      parts.push(generatedContent)
    } else {
      let i = 0
      while (i < generatedContent.length) {
        let end = i + MAX_SECTION
        if (end < generatedContent.length) {
          const pb = generatedContent.lastIndexOf('\n\n', end)
          if (pb > i + MAX_SECTION / 2) end = pb
        }
        const slice = generatedContent.slice(i, Math.min(end, generatedContent.length)).trim()
        if (slice.length > 50) parts.push(slice)
        i = end
      }
    }

    // Remove seções antigas
    const oldSections = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
      Query.equal('chapterId', chapterId),
      Query.limit(20),
    ])
    await Promise.all(
      oldSections.documents.map((d) =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, d.$id)
      )
    )

    // Salva novas seções
    await Promise.all(
      parts.map((part, idx) =>
        databases.createDocument(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, ID.unique(), {
          chapterId,
          bookProjectId: bookId,
          content:        truncate(part, 8000),
          citations:      truncate(JSON.stringify(citations), 1024),
          sourceChunkIds: truncate(JSON.stringify(sourceChunkIds), 1024),
          order:          idx,
          status:         'completed',
        })
      )
    )

    // Atualiza status do capítulo para completed
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, chapterId, {
      status: 'completed',
    })

    // Atualiza job
    if (jobId) {
      const doneCount = allChapters.filter((c) => c.status === 'completed').length + 1
      const progress  = Math.round((doneCount / allChapters.length) * 100)
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, jobId, {
        progress,
        currentStep: `Concluído: ${chapter.title}`,
      })
    }

    const wordCount = generatedContent.split(/\s+/).filter(Boolean).length

    return NextResponse.json({
      ok: true,
      chapterId,
      sections: parts.length,
      wordCount,
      citations,
      preview: generatedContent.slice(0, 300),
    })
  } catch (err) {
    console.error('[generate/chapter]', err)

    // Marca capítulo como falho
    try {
      const { databases } = createAdminClient()
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, req.headers.get('x-chapter-id') ?? '', {
        status: 'failed',
      }).catch(() => {})
    } catch { /* ignora */ }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar capítulo.' },
      { status: 500 }
    )
  }
}
