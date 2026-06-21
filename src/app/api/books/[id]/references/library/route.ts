/**
 * GET /api/books/[id]/references/library?userId=xxx
 *
 * Retorna todas as referências do usuário em outras obras,
 * para que possam ser reutilizadas na obra atual sem re-upload.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { Query } from 'node-appwrite'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: currentBookId } = await params
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatório.' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // 1. Busca todas as obras do usuário (exceto a atual)
    const booksRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, [
      Query.equal('userId', userId),
      Query.notEqual('$id', currentBookId),
      Query.limit(100),
    ])

    if (booksRes.total === 0) {
      return NextResponse.json({ books: [] })
    }

    const bookIds = booksRes.documents.map((b) => b.$id)
    const bookMap: Record<string, string> = {}
    booksRes.documents.forEach((b) => { bookMap[b.$id] = b.title as string })

    // 2. Busca todas as referências dessas obras
    const refsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
      Query.equal('bookProjectId', bookIds),
      Query.orderDesc('$createdAt'),
      Query.limit(200),
    ])

    // 3. Para cada referência, verifica quantos chunks tem
    const refsWithMeta = await Promise.all(
      refsRes.documents.map(async (ref) => {
        const chunksRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
          Query.equal('referenceId', ref.$id),
          Query.limit(1),
        ])
        return {
          id:                     ref.$id,
          bookProjectId:          ref.bookProjectId as string,
          bookTitle:              bookMap[ref.bookProjectId as string] ?? 'Obra desconhecida',
          title:                  ref.title as string,
          authors:                ref.authors as string,
          year:                   ref.year as string,
          publisher:              ref.publisher as string,
          citationKey:            ref.citationKey as string,
          abntFormattedReference: ref.abntFormattedReference as string,
          extractedTextStatus:    ref.extractedTextStatus as string,
          fileId:                 ref.fileId as string | null,
          chunkCount:             chunksRes.total,
        }
      })
    )

    // Agrupa por obra para facilitar exibição no modal
    const books = booksRes.documents.map((b) => ({
      id:    b.$id,
      title: b.title as string,
      refs:  refsWithMeta.filter((r) => r.bookProjectId === b.$id),
    })).filter((b) => b.refs.length > 0)

    return NextResponse.json({ books })
  } catch (err) {
    console.error('[references/library]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 }
    )
  }
}
