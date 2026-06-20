import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { Query, ID } from 'node-appwrite'
import { openai, MODEL } from '@/lib/openai/client'
import { truncate } from '@/lib/utils'

export const dynamic    = 'force-dynamic'
export const maxDuration = 30

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId }              = await params
    const { userId, authorName }      = await req.json()
    const { databases }               = createAdminClient()

    // Segurança
    const bookDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId) as Record<string, unknown>
    if ((bookDoc.userId as string) !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    if (!bookDoc.finalPdfFileId) {
      return NextResponse.json({ error: 'Gere o PDF antes de publicar.' }, { status: 422 })
    }

    // Verifica se já publicou
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, [
      Query.equal('bookProjectId', bookId),
      Query.limit(1),
    ])
    if (existing.total > 0) {
      return NextResponse.json({ error: 'Obra já publicada.' }, { status: 409 })
    }

    // Busca primeiras seções para contexto do resumo
    const sectionsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
      Query.equal('bookProjectId', bookId),
      Query.orderAsc('order'),
      Query.limit(3),
    ])
    const preview = sectionsRes.documents
      .map((s) => (s.content as string).slice(0, 600))
      .join('\n\n')
      .slice(0, 1500)

    // Gera resumo com IA (200–2000 chars)
    let summary = ''
    try {
      const completion = await openai.chat.completions.create({
        model:       MODEL,
        temperature: 0.5,
        max_tokens:  400,
        messages: [
          {
            role: 'system',
            content: 'Você é um redator de sinopses literárias e acadêmicas. Escreva em português brasileiro.',
          },
          {
            role: 'user',
            content: `Escreva um resumo de apresentação entre 200 e 500 caracteres para a seguinte obra:
Título: ${bookDoc.title as string}
Tema: ${bookDoc.theme as string}
Tipo: ${bookDoc.type as string}
Descrição: ${bookDoc.description as string}
Prévia do conteúdo: ${preview}

Escreva apenas o resumo, sem título, sem aspas.`,
          },
        ],
      })
      summary = completion.choices[0]?.message?.content?.trim() ?? ''
    } catch {
      summary = (bookDoc.description as string).slice(0, 500)
    }

    // Cria registro na biblioteca
    await databases.createDocument(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, ID.unique(), {
      bookProjectId: bookId,
      title:         truncate(bookDoc.title as string, 200),
      authorName:    truncate(authorName || 'Autor', 255),
      summary:       truncate(summary, 2000),
      downloadCount: 0,
      readCount:     0,
      publishedAt:   new Date().toISOString(),
      coverFileId:   (bookDoc.coverFileId as string) ?? null,
      pdfFileId:     (bookDoc.finalPdfFileId as string) ?? null,
    })

    // Atualiza visibilidade da obra
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId, {
      visibility: 'public',
      status:     'published',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[publish/route]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao publicar.' },
      { status: 500 }
    )
  }
}
