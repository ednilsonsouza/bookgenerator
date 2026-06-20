import { NextRequest, NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai/client'
import { writingPlanJsonSchema, WritingPlanOutputSchema } from '@/lib/openai/schemas'
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

    // Gera o plano com Structured Output
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPlanSystemPrompt(book) },
        { role: 'user',   content: buildPlanUserPrompt(book) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: writingPlanJsonSchema,
      },
      temperature: 0.7,
      max_tokens: 4096,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json({ error: 'Resposta vazia da IA.' }, { status: 500 })
    }

    // Valida o JSON retornado
    let parsed: ReturnType<typeof WritingPlanOutputSchema.parse>
    try {
      parsed = WritingPlanOutputSchema.parse(JSON.parse(raw))
    } catch {
      return NextResponse.json({ error: 'Resposta da IA fora do formato esperado.', raw }, { status: 500 })
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
