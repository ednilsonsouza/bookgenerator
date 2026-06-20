import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '@/lib/appwrite/config'
import { ID, Query } from 'node-appwrite'
import { extractText } from '@/lib/rag/extractPdfText'
import { chunkText } from '@/lib/rag/chunkText'
import { embedChunks } from '@/lib/rag/embedChunks'
import { truncate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
// Aumenta o timeout — processamento de PDF pode demorar
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; refId: string }> }
) {
  const { id: bookId, refId: referenceId } = await params

  try {
    const { userId } = await req.json()
    const { databases } = createAdminClient()

    // Verifica dono
    const book = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId)
    if ((book as Record<string, unknown>).userId !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    // Busca a referência
    const refDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId) as Record<string, unknown>
    const fileId = refDoc.fileId as string | undefined

    if (!fileId) {
      return NextResponse.json({ error: 'Esta referência não tem arquivo anexado.' }, { status: 422 })
    }

    // Atualiza status para processing
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
      extractedTextStatus: 'processing',
    })

    // Baixa o arquivo do Appwrite Storage via REST
    const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/references/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`
    const apiKey  = process.env.APPWRITE_API_KEY ?? ''

    const fileRes = await fetch(fileUrl, {
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key':     apiKey,
      },
    })

    if (!fileRes.ok) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
        extractedTextStatus: 'error',
      })
      return NextResponse.json({ error: 'Falha ao baixar o arquivo.' }, { status: 500 })
    }

    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    // Detecta tipo MIME pelo content-type ou extensão
    const contentType = fileRes.headers.get('content-type') ?? ''
    const mimeType = contentType.includes('pdf') ? 'application/pdf' : 'text/plain'

    // Extrai texto
    const { text, pages, chars, warning } = await extractText(buffer, mimeType)

    if (chars < 100) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
        extractedTextStatus: 'error',
      })
      return NextResponse.json({
        error: 'Texto insuficiente extraído do arquivo. O PDF pode ser digitalizado sem OCR.',
        warning,
      }, { status: 422 })
    }

    // Chunking
    const chunks = chunkText(text)

    // Remove chunks antigos se existirem (reprocessamento)
    const oldChunks = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
      Query.equal('referenceId', referenceId),
      Query.limit(100),
    ])
    await Promise.all(
      oldChunks.documents.map((c) =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, c.$id)
      )
    )

    // Gera embeddings
    const embeddedChunks = await embedChunks(chunks)

    // Salva chunks no Appwrite
    await Promise.all(
      embeddedChunks.map((chunk) =>
        databases.createDocument(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, ID.unique(), {
          referenceId,
          bookProjectId: bookId,
          chunkText:     truncate(chunk.text, 8000),
          pageNumber:    chunk.index,
          metadata:      truncate(JSON.stringify({ charStart: chunk.charStart, charEnd: chunk.charEnd }), 512),
          embeddingJson: truncate(chunk.embeddingJson, 6000),
        })
      )
    )

    // Atualiza status para ready
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
      extractedTextStatus: 'ready',
    })

    return NextResponse.json({
      ok: true,
      pages,
      chars,
      chunks: embeddedChunks.length,
      warning,
    })
  } catch (err) {
    // Tenta marcar como erro
    try {
      const { databases } = createAdminClient()
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
        extractedTextStatus: 'error',
      })
    } catch { /* ignora */ }

    console.error('[process/route] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar referência.' },
      { status: 500 }
    )
  }
}
