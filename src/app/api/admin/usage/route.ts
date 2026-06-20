import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { verifyAdmin, estimateJobCost, formatUSD, COST } from '@/lib/appwrite/adminGuard'
import { Query } from 'node-appwrite'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? ''
  if (!await verifyAdmin(userId)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 30), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const { databases, users } = createAdminClient()

  // Busca jobs de geração recentes
  const jobsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, [
    Query.orderDesc('$createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ])

  // Para cada job, conta capítulos e seções geradas
  const enriched = await Promise.all(
    jobsRes.documents.map(async (job) => {
      const [chaptersRes, sectionsRes, chunksRes, userRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAPTERS, [
          Query.equal('bookProjectId', job.bookProjectId as string),
          Query.equal('status', 'completed'),
          Query.limit(1),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
          Query.equal('bookProjectId', job.bookProjectId as string),
          Query.limit(1),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
          Query.equal('bookProjectId', job.bookProjectId as string),
          Query.limit(1),
        ]),
        users.get(job.userId as string).catch(() => null),
      ])

      const chapCount  = chaptersRes.total
      const chunkCount = chunksRes.total
      const costUSD    = estimateJobCost(chapCount, chunkCount)

      return {
        jobId:        job.$id,
        bookProjectId: job.bookProjectId,
        userId:       job.userId,
        userEmail:    userRes?.email ?? '(removido)',
        status:       job.status,
        progress:     job.progress,
        chaptersCompleted: chapCount,
        sectionsGenerated: sectionsRes.total,
        chunksEmbedded:    chunkCount,
        estimatedCost:     formatUSD(costUSD),
        estimatedCostRaw:  costUSD,
        createdAt:    job.$createdAt,
      }
    })
  )

  // Total acumulado
  const totalCost = enriched.reduce((s, j) => s + j.estimatedCostRaw, 0)

  // Breakdown por usuário
  const byUser: Record<string, { email: string; jobs: number; cost: number }> = {}
  enriched.forEach((j) => {
    if (!byUser[j.userId as string]) {
      byUser[j.userId as string] = { email: j.userEmail, jobs: 0, cost: 0 }
    }
    byUser[j.userId as string].jobs++
    byUser[j.userId as string].cost += j.estimatedCostRaw
  })

  const pricing = {
    model:            'gpt-4o-mini',
    inputPer1M:       COST.INPUT_PER_M,
    outputPer1M:      COST.OUTPUT_PER_M,
    embeddingPer1M:   COST.EMBED_PER_M,
    avgChapterInput:  COST.CHAPTER_INPUT,
    avgChapterOutput: COST.CHAPTER_OUTPUT,
  }

  return NextResponse.json({
    jobs:         enriched,
    total:        jobsRes.total,
    totalCostUSD: formatUSD(totalCost),
    byUser:       Object.values(byUser).sort((a, b) => b.cost - a.cost),
    pricing,
  })
}
