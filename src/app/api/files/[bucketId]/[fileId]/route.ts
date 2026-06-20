/**
 * Proxy universal para arquivos do Appwrite Storage.
 * Resolve o problema de CORS/autenticação cross-origin:
 * o browser chama /api/files/... e o servidor busca o arquivo
 * com a API Key admin, retornando o conteúdo diretamente.
 *
 * Rotas:
 *   GET /api/files/exports/[fileId]   → PDF download
 *   GET /api/files/covers/[fileId]    → Imagem da capa (pública)
 *
 * Para PDFs de biblioteca (?library=1), incrementa o contador de downloads.
 */
import { NextRequest, NextResponse } from 'next/server'
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { createAdminClient } from '@/lib/appwrite/server'
import { Query } from 'node-appwrite'

export const dynamic = 'force-dynamic'

const ALLOWED_BUCKETS = ['exports', 'covers', 'references'] as const
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bucketId: string; fileId: string }> }
) {
  const { bucketId, fileId } = await params

  // Valida bucket
  if (!ALLOWED_BUCKETS.includes(bucketId as AllowedBucket)) {
    return new NextResponse('Bucket não permitido.', { status: 400 })
  }

  // Referências são privadas — exige userId na query
  if (bucketId === 'references') {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return new NextResponse('Não autorizado.', { status: 401 })
  }

  const apiKey = process.env.APPWRITE_API_KEY ?? ''
  const isDownload = req.nextUrl.searchParams.get('dl') === '1'
  const action = isDownload ? 'download' : 'view'

  // Busca o arquivo no Appwrite com API Key (sem CORS)
  const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/${action}?project=${APPWRITE_PROJECT_ID}`

  const upstream = await fetch(fileUrl, {
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-Key':     apiKey,
    },
  })

  if (!upstream.ok) {
    return new NextResponse('Arquivo não encontrado.', { status: upstream.status })
  }

  const contentType    = upstream.headers.get('content-type')    ?? 'application/octet-stream'
  const contentLength  = upstream.headers.get('content-length')  ?? ''
  const contentDisp    = upstream.headers.get('content-disposition') ?? ''

  // Incrementa contador de downloads para PDFs da biblioteca
  if (bucketId === 'exports' && isDownload) {
    try {
      const { databases } = createAdminClient()
      const items = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, [
        Query.equal('pdfFileId', fileId),
        Query.limit(1),
      ])
      if (items.total > 0) {
        const item = items.documents[0]
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, item.$id, {
          downloadCount: ((item.downloadCount as number) ?? 0) + 1,
        })
      }
    } catch { /* não bloqueia o download se falhar */ }
  }

  // Stream o conteúdo de volta ao cliente
  const body = await upstream.arrayBuffer()

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': bucketId === 'covers' ? 'public, max-age=86400' : 'private, no-cache',
  }
  if (contentLength) headers['Content-Length'] = contentLength
  if (contentDisp)   headers['Content-Disposition'] = contentDisp

  return new NextResponse(body, { status: 200, headers })
}
