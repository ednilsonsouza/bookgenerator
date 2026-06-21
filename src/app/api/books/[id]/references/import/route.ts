/**
 * POST /api/books/[id]/references/import
 *
 * Copia referências de outras obras do mesmo usuário para a obra atual.
 * Reutiliza os embeddings (chunks) já calculados — sem chamar a OpenAI.
 *
 * Body: { userId: string, referenceIds: string[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { Query, ID } from 'node-appwrite'
import { truncate } from '@/lib/utils'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetBookId } = await params
    const { userId, referenceIds } = await req.json() as {
      userId: string
      referenceIds: string[]
    }

    if (!userId || !Array.isArray(referenceIds) || referenceIds.length === 0) {
      return NextResponse.json({ error: 'userId e referenceIds são obrigatórios.' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Segurança: confirma que a obra destino pertence ao usuário
    const targetBook = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, targetBookId)
    if ((targetBook.userId as string) !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    // Verifica limite de referências
    const existingRefs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
      Query.equal('bookProjectId', targetBookId),
      Query.limit(1),
    ])
    const currentCount = existingRefs.total
    if (currentCount + referenceIds.length > 30) {
      return NextResponse.json(
        { error: `Limite de 30 referências seria excedido. Você tem ${currentCount} e tentou importar ${referenceIds.length}.` },
        { status: 422 }
      )
    }

    const importedIds: string[] = []
    const errors: string[] = []

    for (const refId of referenceIds) {
      try {
        // 1. Busca a referência original
        const originalRef = await databases.getDocument(DATABASE_ID, COLLECTIONS.REFERENCES, refId)

        // Segurança: confirma que a referência pertence a uma obra do mesmo usuário
        const sourceBook = await databases.getDocument(
          DATABASE_ID, COLLECTIONS.BOOK_PROJECTS,
          originalRef.bookProjectId as string
        )
        if ((sourceBook.userId as string) !== userId) {
          errors.push(`Referência ${refId}: sem permissão.`)
          continue
        }

        // 2. Cria nova referência na obra destino
        const newRef = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.REFERENCES,
          ID.unique(),
          {
            bookProjectId:          targetBookId,
            fileId:                 originalRef.fileId ?? null,
            title:                  truncate(originalRef.title as string, 512),
            authors:                truncate(originalRef.authors as string, 512),
            year:                   truncate(originalRef.year as string, 16),
            publisher:              truncate(originalRef.publisher as string, 255),
            extractedTextStatus:    originalRef.extractedTextStatus as string,
            citationKey:            truncate(originalRef.citationKey as string, 128),
            abntFormattedReference: truncate(originalRef.abntFormattedReference as string, 1024),
          }
        )

        // 3. Copia os chunks (com embeddings prontos) para a nova referência
        let offset = 0
        let hasMore = true
        while (hasMore) {
          const chunksRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
            Query.equal('referenceId', refId),
            Query.orderAsc('pageNumber'),
            Query.limit(50),
            Query.offset(offset),
          ])

          if (chunksRes.documents.length === 0) {
            hasMore = false
            break
          }

          await Promise.all(
            chunksRes.documents.map((chunk) =>
              databases.createDocument(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, ID.unique(), {
                referenceId:    newRef.$id,
                bookProjectId:  targetBookId,
                chunkText:      truncate(chunk.chunkText as string, 8000),
                pageNumber:     chunk.pageNumber as number,
                metadata:       truncate(chunk.metadata as string, 512),
                embeddingJson:  truncate(chunk.embeddingJson as string, 6000),
              })
            )
          )

          offset += chunksRes.documents.length
          hasMore = chunksRes.documents.length === 50
        }

        importedIds.push(newRef.$id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[references/import] refId=${refId}:`, msg)
        errors.push(`Referência ${refId}: ${msg}`)
      }
    }

    return NextResponse.json({
      imported: importedIds.length,
      errors:   errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[references/import]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 }
    )
  }
}
