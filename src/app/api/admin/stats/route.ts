import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { verifyAdmin, estimateJobCost, formatUSD } from '@/lib/appwrite/adminGuard'
import { Query } from 'node-appwrite'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? ''
  if (!await verifyAdmin(userId)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { databases, users } = createAdminClient()

  const [
    usersRes,
    booksRes,
    jobsRes,
    libraryRes,
    chunksRes,
    sectionsRes,
  ] = await Promise.all([
    users.list([Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS,     [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS,   [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS,     [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS,  [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS,[Query.limit(1)]),
  ])

  // Contagens por status da obra
  const statusCounts: Record<string, number> = {}
  for (const s of ['draft','plan_pending','plan_ready','generating','review','completed','published','failed']) {
    const r = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, [
      Query.equal('status', s), Query.limit(1),
    ])
    if (r.total > 0) statusCounts[s] = r.total
  }

  // Jobs completados (para custo)
  const completedJobs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, [
    Query.equal('status', 'completed'), Query.limit(1),
  ])

  // Estimativa de custo total
  const avgChapters = 8 // estimativa média por obra
  const totalCostUSD = estimateJobCost(
    completedJobs.total * avgChapters,
    chunksRes.total
  )

  return NextResponse.json({
    users:       usersRes.total,
    books:       booksRes.total,
    statusCounts,
    jobs:        jobsRes.total,
    completedJobs: completedJobs.total,
    library:     libraryRes.total,
    chunks:      chunksRes.total,
    sections:    sectionsRes.total,
    estimatedCostUSD: formatUSD(totalCostUSD),
    estimatedCostRaw: totalCostUSD,
  })
}
