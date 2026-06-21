import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { ID, Query } from 'node-appwrite'
import { truncate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET — lista referências de uma obra
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const { databases } = createAdminClient()

    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
      Query.equal('bookProjectId', bookId),
      Query.orderAsc('$createdAt'),
      Query.limit(50),
    ])

    // Conta chunks por referência
    const refs = await Promise.all(
      res.documents.map(async (doc) => {
        const chunks = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
          Query.equal('referenceId', doc.$id),
          Query.limit(1),
        ])
        return { ...doc, chunkCount: chunks.total }
      })
    )

    return NextResponse.json({ references: refs, total: res.total })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao listar referências.' },
      { status: 500 }
    )
  }
}

// POST — cria referência (metadata + fileId opcional)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const body = await req.json()
    const { userId, title, authors, year, publisher, fileId, accessUrl } = body

    if (!bookId || !userId || !title) {
      return NextResponse.json({ error: 'bookId, userId e title são obrigatórios.' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Verifica dono
    const book = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId)
    if ((book as Record<string, unknown>).userId !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    // Verifica limite de 30 referências
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
      Query.equal('bookProjectId', bookId),
      Query.limit(1),
    ])
    if (existing.total >= 30) {
      return NextResponse.json({ error: 'Limite de 30 referências atingido.' }, { status: 422 })
    }

    // Gera citação ABNT
    const firstAuthor = (authors ?? '').split(/[,;]/)[0]?.trim() ?? 'AUTOR'
    const lastName    = firstAuthor.split(' ').pop()?.toUpperCase() ?? 'AUTOR'
    const citationKey = `${lastName} (${year || 'S.D.'})`

    const authorsUpper = (authors ?? '')
      .split(/[,;]/)
      .map((a: string) => {
        const parts = a.trim().split(' ')
        if (parts.length < 2) return a.trim().toUpperCase()
        const last  = parts[parts.length - 1].toUpperCase()
        const first = parts.slice(0, -1).join(' ')
        return `${last}, ${first}`
      })
      .join('; ')
    let abnt = `${authorsUpper}. ${title}. ${publisher ?? ''}${publisher && year ? ', ' : ''}${year ?? ''}.`.replace(/\.\s*\./g, '.')
    if (accessUrl) {
      const today = new Date()
      const acesso = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      abnt += ` Disponível em: ${accessUrl}. Acesso em: ${acesso}.`
    }

    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.REFERENCES,
      ID.unique(),
      {
        bookProjectId:          bookId,
        fileId:                 fileId ?? null,
        title:                  truncate(title, 512),
        authors:                truncate(authors ?? '', 512),
        year:                   truncate(year ?? '', 16),
        publisher:              truncate(publisher ?? '', 255),
        extractedTextStatus:    fileId ? 'pending' : 'no_file',
        citationKey:            truncate(citationKey, 128),
        abntFormattedReference: truncate(abnt, 1024),
        accessUrl:              accessUrl ? truncate(accessUrl, 1024) : null,
      }
    )

    return NextResponse.json({ reference: doc }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao criar referência.' },
      { status: 500 }
    )
  }
}

// DELETE — remove referência e seus chunks
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const { referenceId } = await req.json()
    if (!referenceId) return NextResponse.json({ error: 'referenceId obrigatório.' }, { status: 400 })

    const { databases } = createAdminClient()

    // Remove chunks
    let offset = 0
    while (true) {
      const chunks = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
        Query.equal('referenceId', referenceId),
        Query.limit(50),
        Query.offset(offset),
      ])
      if (chunks.documents.length === 0) break
      await Promise.all(chunks.documents.map((c) =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, c.$id)
      ))
      offset += chunks.documents.length
    }

    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao remover referência.' },
      { status: 500 }
    )
  }
}
