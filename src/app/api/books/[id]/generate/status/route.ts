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
    const { id: bookId } = await params
    const { databases }  = createAdminClient()

    // Job mais recente
    const jobsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, [
      Query.equal('bookProjectId', bookId),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ])

    const job = jobsRes.total > 0 ? jobsRes.documents[0] : null

    // Capítulos com status
    const chaptersRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAPTERS, [
      Query.equal('bookProjectId', bookId),
      Query.orderAsc('order'),
      Query.limit(50),
    ])

    // Contagem de seções por capítulo
    const chapters = await Promise.all(
      chaptersRes.documents.map(async (c) => {
        const sections = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
          Query.equal('chapterId', c.$id),
          Query.limit(1),
        ])
        return {
          id:          c.$id,
          order:       c.order,
          title:       c.title,
          targetWords: c.targetWords,
          targetPages: c.targetPages,
          status:      c.status,
          hasContent:  sections.total > 0,
        }
      })
    )

    const completedCount = chapters.filter((c) => c.status === 'completed').length
    const totalCount     = chapters.length
    const progress       = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return NextResponse.json({
      job: job
        ? {
            id:          job.$id,
            status:      job.status,
            progress:    job.progress ?? progress,
            currentStep: job.currentStep,
            errorMessage: job.errorMessage,
          }
        : null,
      chapters,
      progress,
      completedCount,
      totalCount,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar status.' },
      { status: 500 }
    )
  }
}

// PATCH — finaliza o job (complete ou failed)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const { jobId, status, errorMessage } = await req.json()
    const { databases } = createAdminClient()

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, jobId, {
      status,
      progress:    status === 'completed' ? 100 : undefined,
      currentStep: status === 'completed' ? 'Geração concluída!' : 'Erro na geração.',
      errorMessage: errorMessage ?? null,
    })

    if (status === 'completed') {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId, {
        status: 'review',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro.' }, { status: 500 })
  }
}
