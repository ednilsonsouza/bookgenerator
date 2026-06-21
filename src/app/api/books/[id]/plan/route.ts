import { NextRequest, NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai/client'
import { WritingPlanOutputSchema } from '@/lib/openai/schemas'
import { buildPlanSystemPrompt, buildPlanUserPrompt } from '@/lib/openai/prompts/planPrompt'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { ID, Query } from 'node-appwrite'
import { truncate } from '@/lib/utils'
import { ensureMethodologyRefs } from '@/lib/openai/methodologyRefs'
import type { BookProject, AcademicSubtype, LiteraryGenre, SectionPlan } from '@/types/book'

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

    let bookDoc: Record<string, unknown>
    try {
      bookDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Obra não encontrada.' }, { status: 404 })
    }

    if (bookDoc.userId !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

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

    const book: BookProject = {
      id:                 bookDoc.$id as string,
      userId:              bookDoc.userId as string,
      title:               bookDoc.title as string,
      theme:               bookDoc.theme as string,
      type:                bookDoc.type as 'academic' | 'literary',
      academicSubtype:     bookDoc.academicSubtype as AcademicSubtype | undefined,
      literaryGenre:       bookDoc.literaryGenre as LiteraryGenre | undefined,
      description:         bookDoc.description as string,
      chapterCount:        (bookDoc.chapterCount as number) ?? 5,
      sectionsPerChapter:  (bookDoc.sectionsPerChapter as number) ?? 4,
      paragraphsPerSection: (bookDoc.paragraphsPerSection as number) ?? 5,
      status:              bookDoc.status as BookProject['status'],
      visibility:          bookDoc.visibility as BookProject['visibility'],
      createdAt:           bookDoc.$createdAt as string,
      updatedAt:           bookDoc.$updatedAt as string,
    }

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
      return NextResponse.json({ error: 'Resposta da IA truncada. Tente com menos capítulos.' }, { status: 500 })
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[plan/route] resposta sem JSON:', raw)
      return NextResponse.json({ error: 'Resposta da IA sem JSON válido.' }, { status: 500 })
    }

    const wpg = book.type === 'academic' ? 450 : 380
    const wps = book.paragraphsPerSection * 150 // palavras/parágrafo
    const expectedPagesPerChapter = Math.max(1, Math.round((book.sectionsPerChapter * wps) / wpg))
    const expectedWordsPerChapter = book.sectionsPerChapter * wps

    let parsed: ReturnType<typeof WritingPlanOutputSchema.parse>
    try {
      const rawJson = JSON.parse(jsonMatch[0])

      const anyObj = rawJson.plano ?? rawJson.plan ?? rawJson
      const chaptersRaw: Record<string, unknown>[] =
        anyObj.chapters      ??
        anyObj.capitulos     ??
        anyObj.chapters_list ?? []
      const rawSections: Record<string, unknown>[] = []
      chaptersRaw.forEach(ch => {
        const chSections = (ch.sections ?? ch.secoes ?? ch.seções ?? ch.subsections ?? [] satisfies any[])
        if (Array.isArray(chSections) && chSections.length > 0) {
          rawSections.push(...chSections.slice(0, 1))
        }
      })
      if (rawSections.length !== chaptersRaw.length) {
        // If sections weren't found, auto-generate them
        console.warn('[plan/route] Sections not found, generating default titles')
      }

      const chapters = chaptersRaw.map((ch: Record<string, unknown>, idx: number) => {
        const chSections = (ch.sections ?? ch.secoes ?? ch.seções ?? ch.subsections ?? []) as Record<string, unknown>[]
        // Ensure exactly sectionsPerChapter sections
        let sections: SectionPlan[]
        if (Array.isArray(chSections) && chSections.length > 0) {
          sections = chSections.slice(0, book.sectionsPerChapter).map((s, si) => ({
            order: Math.round(Number(s.order ?? (si + 1))),
            title: String(s.title ?? s.titulo ?? s.titulo_da_seção ?? `Seção ${si + 1}`),
          }))
        } else {
          sections = Array.from({ length: book.sectionsPerChapter }, (_, si) => ({
            order: si + 1,
            title: `Seção ${si + 1}`,
          }))
        }
        // Pad to exact count
        while (sections.length < book.sectionsPerChapter) {
          sections.push({ order: sections.length + 1, title: `Seção ${sections.length + 1}` })
        }

        return {
          order:       Math.round(Number(ch.order ?? ch.numero ?? ch.ordem ?? (idx + 1))),
          title:       String(ch.title ?? ch.titulo ?? `Capítulo ${idx + 1}`),
          description: String(ch.description ?? ch.descricao ?? ch.descricão ?? ch.summary ?? ''),
          targetPages: expectedPagesPerChapter,
          targetWords: expectedWordsPerChapter,
          sections,
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

    // Remove plano anterior
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.WRITING_PLANS, [
      Query.equal('bookProjectId', bookId),
      Query.limit(1),
    ])
    if (existing.total > 0) {
      const oldPlanId = existing.documents[0].$id
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

    const now = new Date().toISOString()
    const chaptersJson = JSON.stringify(parsed.chapters.map((c) => ({
      order: c.order,
      title: c.title,
      description: c.description,
      targetPages: c.targetPages,
      targetWords: c.targetWords,
      sections: c.sections,
    })))

    const planDoc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.WRITING_PLANS,
      ID.unique(),
      {
        bookProjectId: bookId,
        chaptersJson: truncate(chaptersJson, 16000),
        status: 'ready',
        generatedAt: now,
        editedAt: null,
      }
    )

    const chapterDocs = await Promise.all(
      parsed.chapters.map((ch) =>
        databases.createDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, ID.unique(), {
          bookProjectId: bookId,
          title: truncate(ch.title, 300),
          order: ch.order,
          targetPages: ch.targetPages,
          targetWords: ch.targetWords,
          description: truncate(ch.description, 1000),
          sectionsJson: truncate(JSON.stringify(ch.sections), 2000),
          status: 'pending',
        })
      )
    )

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId, {
      status: 'plan_ready',
    })

    if (book.type === 'academic') {
      await ensureMethodologyRefs(bookId).catch((err) =>
        console.error('[plan/route] ensureMethodologyRefs:', err)
      )
    }

    return NextResponse.json({
      planId: planDoc.$id,
      chapters: chapterDocs.map((c) => ({
        id: c.$id,
        order: c.order,
        title: c.title,
        description: c.description,
        targetPages: c.targetPages,
        targetWords: c.targetWords,
        sections: parsed.chapters.find((pc) => pc.order === c.order)?.sections ?? [],
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
