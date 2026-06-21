import { NextRequest, NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai/client'
import { WritingPlanOutputSchema } from '@/lib/openai/schemas'
import { buildPlanSystemPrompt, buildPlanUserPrompt } from '@/lib/openai/prompts/planPrompt'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { ID, Query } from 'node-appwrite'
import { truncate } from '@/lib/utils'
import type { BookProject, AcademicSubtype, LiteraryGenre } from '@/types/book'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const { userId } = await req.json()

    if (!bookId || !userId) {
      return NextResponse.json({ error: 'bookId e userId são obrigatórios.' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Busca o projeto de obra
    let bookDoc: Record<string, unknown>
    try {
      bookDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Obra não encontrada.' }, { status: 404 })
    }

    // Segurança: só o dono pode gerar
    if (bookDoc.userId !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    // Obras acadêmicas requerem mínimo de 5 referências
    if (bookDoc.type === 'academic') {
      const refs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
        Query.equal('bookProjectId', bookId),
        Query.limit(1),
      ])
      if (refs.total < 5) {
        return NextResponse.json(
          { error: `Obras acadêmicas requerem pelo menos 5 referências bibliográficas. Você tem ${refs.total}.` },
          { status: 422 }
        )
      }
    }

    const book = {
      id: bookDoc.$id as string,
      userId: bookDoc.userId as string,
      title: bookDoc.title as string,
      theme: bookDoc.theme as string,
      type: bookDoc.type as 'academic' | 'literary',
      academicSubtype: bookDoc.academicSubtype as AcademicSubtype | undefined,
      literaryGenre: bookDoc.literaryGenre as LiteraryGenre | undefined,
      description: bookDoc.description as string,
      targetPages: bookDoc.targetPages as number,
      status: bookDoc.status as BookProject['status'],
      visibility: bookDoc.visibility as BookProject['visibility'],
      createdAt: bookDoc.$createdAt as string,
      updatedAt: bookDoc.$updatedAt as string,
    }

    // Gera o plano com json_object (mais compatível que json_schema strict)
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPlanSystemPrompt(book) },
        { role: 'user',   content: buildPlanUserPrompt(book) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 8192,
    })

    const choice = completion.choices[0]
    const raw = choice?.message?.content
    const finishReason = choice?.finish_reason

    console.log('[plan/route] finish_reason:', finishReason, 'raw length:', raw?.length)

    if (!raw) {
      return NextResponse.json({ error: 'Resposta vazia da IA.' }, { status: 500 })
    }

    if (finishReason === 'length') {
      return NextResponse.json({ error: 'Resposta da IA truncada. Tente com menos páginas ou capítulos.' }, { status: 500 })
    }

    // Extrai JSON mesmo que venha envolto em markdown/texto
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[plan/route] resposta sem JSON:', raw)
      return NextResponse.json({ error: 'Resposta da IA sem JSON válido.' }, { status: 500 })
    }

    // Normaliza e valida o JSON retornado
    let parsed: ReturnType<typeof WritingPlanOutputSchema.parse>
    try {
      const rawJson = JSON.parse(jsonMatch[0])

      // Normaliza array de capítulos — modelo pode usar nomes em português
      // e pode aninhar dentro de um objeto wrapper (ex: { plano: { capitulos: [...] } })
      const anyObj = rawJson.plano ?? rawJson.plan ?? rawJson
      const chaptersRaw: Record<string, unknown>[] =
        anyObj.chapters      ??  // inglês direto
        anyObj.capitulos     ??  // português direto
        anyObj.chapters_list ??  // variante inglês
        []

      const wpg = book.type === 'academic' ? 450 : 380

      const rawChapters = chaptersRaw.map((ch: Record<string, unknown>, idx: number) => ({
        order:       Math.round(Number(ch.order ?? ch.numero ?? ch.ordem ?? (idx + 1))),
        title:       String(ch.title ?? ch.titulo ?? `Capítulo ${idx + 1}`),
        description: String(ch.description ?? ch.descricao ?? ch.descricão ?? ch.summary ?? ''),
        targetPages: Math.max(1, Math.round(Number(ch.targetPages ?? ch.paginas ?? ch.target_pages ?? ch.pages ?? 1))),
        targetWords: Math.max(1, Math.round(Number(ch.targetWords ?? ch.palavras ?? ch.target_words ?? ch.words ?? 100))),
      }))

      // Garante que a soma de targetPages bata exatamente com book.targetPages
      const totalPagesRequested = book.targetPages as number
      const rawSum = rawChapters.reduce((s, c) => s + c.targetPages, 0)

      const chapters = rawSum === totalPagesRequested
        ? rawChapters
        : rawChapters.map((ch, i) => {
            // Redistribui proporcionalmente; último capítulo absorve o resto
            const proportionalPages = i < rawChapters.length - 1
              ? Math.max(1, Math.round((ch.targetPages / rawSum) * totalPagesRequested))
              : Math.max(1, totalPagesRequested - rawChapters.slice(0, -1).reduce((s, c2, j) => {
                  return s + Math.max(1, Math.round((c2.targetPages / rawSum) * totalPagesRequested))
                }, 0))
            return {
              ...ch,
              targetPages: proportionalPages,
              targetWords: proportionalPages * wpg,
            }
          })

      parsed = WritingPlanOutputSchema.parse({ chapters })
    } catch (parseErr) {
      const zodMsg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      console.error('[plan/route] parse error:', zodMsg, '\nraw:', raw?.slice(0, 800))
      return NextResponse.json({
        error: `Erro ao processar plano da IA: ${zodMsg.slice(0, 200)}`,
      }, { status: 500 })
    }

    // Remove plano anterior se existir
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.WRITING_PLANS, [
      Query.equal('bookProjectId', bookId),
      Query.limit(1),
    ])
    if (existing.total > 0) {
      const oldPlanId = existing.documents[0].$id
      // Remove capítulos antigos
      const oldChapters = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAPTERS, [
        Query.equal('bookProjectId', bookId),
        Query.limit(50),
      ])
      await Promise.all(
        oldChapters.documents.map((c) =>
          databases.deleteDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, c.$id)
        )
      )
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.WRITING_PLANS, oldPlanId)
    }

    // Salva o plano
    const now = new Date().toISOString()
    const planDoc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.WRITING_PLANS,
      ID.unique(),
      {
        bookProjectId: bookId,
        chaptersJson: truncate(JSON.stringify(parsed.chapters), 8000),
        status: 'ready',
        generatedAt: now,
        editedAt: null,
      }
    )

    // Salva os capítulos individualmente
    const chapterDocs = await Promise.all(
      parsed.chapters.map((ch) =>
        databases.createDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, ID.unique(), {
          bookProjectId: bookId,
          title: truncate(ch.title, 300),
          order: ch.order,
          targetPages: ch.targetPages,
          targetWords: ch.targetWords,
          description: truncate(ch.description, 1000),
          status: 'pending',
        })
      )
    )

    // Atualiza status da obra
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId, {
      status: 'plan_ready',
    })

    return NextResponse.json({
      planId: planDoc.$id,
      chapters: chapterDocs.map((c) => ({
        id: c.$id,
        order: c.order,
        title: c.title,
        description: c.description,
        targetPages: c.targetPages,
        targetWords: c.targetWords,
        status: c.status,
      })),
    })
  } catch (err) {
    console.error('[plan/route] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 }
    )
  }
}
