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

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json({ error: 'Resposta vazia da IA.' }, { status: 500 })
    }

    // Extrai JSON mesmo que venha envolto em markdown/texto
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[plan/route] resposta sem JSON:', raw)
      return NextResponse.json({ error: 'Resposta da IA sem JSON válido.' }, { status: 500 })
    }

    // Valida com Zod (coerce para arredondar floats em inteiros)
    let parsed: ReturnType<typeof WritingPlanOutputSchema.parse>
    try {
      const rawJson = JSON.parse(jsonMatch[0])
      // Normaliza targetPages e targetWords para inteiros caso venham como float
      if (Array.isArray(rawJson?.chapters)) {
        rawJson.chapters = rawJson.chapters.map((ch: Record<string, unknown>) => ({
          ...ch,
          order: Math.round(Number(ch.order)),
          targetPages: Math.max(1, Math.round(Number(ch.targetPages))),
          targetWords: Math.max(1, Math.round(Number(ch.targetWords))),
        }))
      }
      parsed = WritingPlanOutputSchema.parse(rawJson)
    } catch (parseErr) {
      console.error('[plan/route] parse error:', parseErr, 'raw:', raw)
      return NextResponse.json({ error: 'Resposta da IA fora do formato esperado.' }, { status: 500 })
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
