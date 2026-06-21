import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { Query, ID } from 'node-appwrite'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const { userId }     = await req.json()

    if (!bookId || !userId) {
      return NextResponse.json({ error: 'bookId e userId obrigatórios.' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Verifica dono
    const book = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId) as Record<string, unknown>
    if (book.userId !== userId) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    // Rate limiting: máx. 100 jobs por usuário nas últimas 24h (ex-capitulos agora sao secoes)
    const MAX_DAILY_JOBS = 100
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentJobs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, [
      Query.equal('userId', userId),
      Query.greaterThan('$createdAt', yesterday),
      Query.limit(1),
    ])
    if (recentJobs.total >= MAX_DAILY_JOBS) {
      return NextResponse.json(
        { error: `Limite de ${MAX_DAILY_JOBS} gerações por dia atingido. Tente novamente amanhã.` },
        { status: 429 }
      )
    }

    // Verifica plano
    const plans = await databases.listDocuments(DATABASE_ID, COLLECTIONS.WRITING_PLANS, [
      Query.equal('bookProjectId', bookId),
      Query.limit(1),
    ])
    if (plans.total === 0) {
      return NextResponse.json({ error: 'Gere e salve o plano de escrita antes de iniciar a geração.' }, { status: 422 })
    }

    // Verifica obras acadêmicas
    if (book.type === 'academic') {
      const refs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
        Query.equal('bookProjectId', bookId),
        Query.limit(1),
      ])
      if (refs.total < 5) {
        return NextResponse.json({ error: 'Obras acadêmicas requerem pelo menos 5 referências.' }, { status: 422 })
      }
    }

    // Busca capítulos
    const chaptersRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAPTERS, [
      Query.equal('bookProjectId', bookId),
      Query.orderAsc('order'),
      Query.limit(50),
    ])

    if (chaptersRes.total === 0) {
      return NextResponse.json({ error: 'Nenhum capítulo encontrado.' }, { status: 422 })
    }

    // Verifica se já existe job ativo
    const existingJobs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, [
      Query.equal('bookProjectId', bookId),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ])

    let jobId: string
    if (existingJobs.total > 0) {
      const existingJob = existingJobs.documents[0] as Record<string, unknown>
      const status = existingJob.status as string
      if (status === 'running' || status === 'pending') {
        // Retorna job existente
        return NextResponse.json({
          jobId: existingJob.$id,
          chapters: chaptersRes.documents.map((c) => ({
            id:          c.$id,
            order:       c.order,
            title:       c.title,
            targetWords: c.targetWords,
            targetPages: c.targetPages,
            status:      c.status,
          })),
        })
      }
      // Job anterior concluído/falho — cria novo
    }

    // Cria novo job
    const job = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.GENERATION_JOBS,
      ID.unique(),
      {
        bookProjectId: bookId,
        userId,
        type:          'full_book',
        status:        'running',
        progress:      0,
        currentStep:   'Iniciando geração...',
        retryCount:    0,
      }
    )
    jobId = job.$id

    // Atualiza status da obra
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookId, {
      status: 'generating',
    })

    return NextResponse.json({
      jobId,
      chapters: chaptersRes.documents.map((c) => ({
        id:          c.$id,
        order:       c.order,
        title:       c.title,
        targetWords: c.targetWords,
        targetPages: c.targetPages,
        status:      c.status,
      })),
    })
  } catch (err) {
    console.error('[generate/start]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao iniciar geração.' },
      { status: 500 }
    )
  }
}
