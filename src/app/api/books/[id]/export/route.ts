import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '@/lib/appwrite/config'
import { Query, ID } from 'node-appwrite'
import { generatePdf } from '@/lib/pdf/generatePdf'
import { generateCoverImage } from '@/lib/pdf/coverGenerator'
import type { BookProject, Chapter } from '@/types/book'
import type { AcademicSubtype, LiteraryGenre } from '@/types/book'
import type { GeneratedSection } from '@/lib/appwrite/generation'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const { userId, authorName } = await req.json()

    const { databases, storage } = createAdminClient()

    // Segurança
    const bookDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId) as Record<string, unknown>
    if ((bookDoc.userId as string) !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    const book: BookProject = {
      id:              bookDoc.$id as string,
      userId:          bookDoc.userId as string,
      title:           bookDoc.title as string,
      theme:           bookDoc.theme as string,
      type:            bookDoc.type as 'academic' | 'literary',
      academicSubtype: bookDoc.academicSubtype as AcademicSubtype | undefined,
      literaryGenre:   bookDoc.literaryGenre as LiteraryGenre | undefined,
      description:     bookDoc.description as string,
      targetPages:     bookDoc.targetPages as number,
      status:          bookDoc.status as BookProject['status'],
      visibility:      bookDoc.visibility as BookProject['visibility'],
      coverFileId:     bookDoc.coverFileId as string | undefined,
      finalPdfFileId:  bookDoc.finalPdfFileId as string | undefined,
      createdAt:       bookDoc.$createdAt as string,
      updatedAt:       bookDoc.$updatedAt as string,
    }

    // Capítulos
    const chaptersRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAPTERS, [
      Query.equal('bookProjectId', bookId),
      Query.orderAsc('order'),
      Query.limit(50),
    ])
    const chapters: Chapter[] = chaptersRes.documents.map((c) => ({
      id:            c.$id,
      bookProjectId: bookId,
      title:         c.title as string,
      order:         c.order as number,
      targetPages:   c.targetPages as number,
      targetWords:   c.targetWords as number,
      description:   c.description as string | undefined,
      status:        c.status as Chapter['status'],
    }))

    // Seções por capítulo
    const sectionsMap: Record<string, GeneratedSection[]> = {}
    await Promise.all(
      chapters.map(async (ch) => {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
          Query.equal('chapterId', ch.id),
          Query.orderAsc('order'),
          Query.limit(20),
        ])
        sectionsMap[ch.id] = res.documents.map((d) => ({
          id:             d.$id,
          chapterId:      d.chapterId as string,
          bookProjectId:  d.bookProjectId as string,
          content:        d.content as string,
          citations:      d.citations as string,
          sourceChunkIds: d.sourceChunkIds as string,
          order:          d.order as number,
          status:         d.status as GeneratedSection['status'],
        }))
      })
    )

    // Referências (para obras acadêmicas)
    const refsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
      Query.equal('bookProjectId', bookId),
      Query.orderAsc('$createdAt'),
      Query.limit(50),
    ])
    const references = refsRes.documents.map((r) => ({
      title:                  r.title as string,
      abntFormattedReference: r.abntFormattedReference as string,
    }))

    // Capa: usa upload do autor ou gera uma automaticamente
    let coverImageBase64: string | undefined
    if (book.coverFileId) {
      try {
        const apiKey   = process.env.APPWRITE_API_KEY ?? ''
        const coverUrl = `${APPWRITE_ENDPOINT}/storage/buckets/covers/files/${book.coverFileId}/download?project=${APPWRITE_PROJECT_ID}`
        const imgRes   = await fetch(coverUrl, {
          headers: { 'X-Appwrite-Project': APPWRITE_PROJECT_ID, 'X-Appwrite-Key': apiKey },
        })
        if (imgRes.ok) {
          const buf    = await imgRes.arrayBuffer()
          const mime   = imgRes.headers.get('content-type') ?? 'image/jpeg'
          coverImageBase64 = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
        }
      } catch { /* capa ignorada se falhar */ }
    }

    // Gera capa automaticamente quando o autor não anexou uma imagem
    if (!coverImageBase64 && book.type === 'literary') {
      try {
        const genreLabel = book.literaryGenre
          ? book.literaryGenre.replace(/_/g, ' ')
          : undefined
        const coverBuf = await generateCoverImage({
          title: book.title,
          authorName: authorName || 'Autor',
          theme: book.theme,
          genre: genreLabel,
          type: book.type,
        })
        coverImageBase64 = `data:image/png;base64,${coverBuf.toString('base64')}`

        // Salva a capa gerada no bucket para reutilização futura
        const coverBlob = new Blob([new Uint8Array(coverBuf)], { type: 'image/png' })
        const coverFile = new File([coverBlob], `cover_${bookId}.png`, { type: 'image/png' })
        const savedCover = await storage.createFile('covers', ID.unique(), coverFile as unknown as File)
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId, {
          coverFileId: savedCover.$id,
        })
      } catch (coverErr) {
        console.error('[export/route] cover generation failed:', coverErr)
        // Continua sem capa se a geração falhar
      }
    }

    // ── Gera o PDF ────────────────────────────────────────────────────────────
    const pdfBuffer = await generatePdf({
      book,
      chapters,
      sectionsMap,
      references,
      authorName: authorName || 'Autor',
      coverImageBase64,
    })

    // Salva no Appwrite Storage (bucket exports)
    const fileName = `${book.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${Date.now()}.pdf`
    const safeBuf = new ArrayBuffer(pdfBuffer.byteLength)
    new Uint8Array(safeBuf).set(pdfBuffer)
    const blob    = new Blob([safeBuf], { type: 'application/pdf' })
    const file    = new File([blob], fileName, { type: 'application/pdf' })

    const uploaded = await storage.createFile('exports', ID.unique(), file as unknown as File)

    // Atualiza finalPdfFileId na obra
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId, {
      finalPdfFileId: uploaded.$id,
      status:         'completed',
    })

    return NextResponse.json({
      ok:        true,
      fileId:    uploaded.$id,
      fileName,
      sizeBytes: pdfBuffer.length,
    })
  } catch (err) {
    console.error('[export/route]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar PDF.' },
      { status: 500 }
    )
  }
}
