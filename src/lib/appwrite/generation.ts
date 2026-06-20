'use client'

import { databases, ID, Query } from './client'
import { DATABASE_ID, COLLECTIONS } from './config'
import { truncate } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'

export interface GenerationJob {
  id: string
  bookProjectId: string
  userId: string
  type: string
  status: JobStatus
  progress: number
  currentStep: string
  errorMessage?: string
  retryCount: number
  createdAt: string
  updatedAt: string
}

export interface GeneratedSection {
  id: string
  chapterId: string
  bookProjectId: string
  content: string
  citations: string      // JSON array of citation keys
  sourceChunkIds: string // JSON array of chunk IDs
  order: number
  status: 'pending' | 'generating' | 'completed' | 'failed'
}

// ── GenerationJob ─────────────────────────────────────────────────────────────

function docToJob(doc: Record<string, unknown>): GenerationJob {
  return {
    id:             doc.$id as string,
    bookProjectId:  (doc.bookProjectId as string)  ?? '',
    userId:         (doc.userId as string)          ?? '',
    type:           (doc.type as string)            ?? 'full_book',
    status:         (doc.status as JobStatus)       ?? 'pending',
    progress:       (doc.progress as number)        ?? 0,
    currentStep:    (doc.currentStep as string)     ?? '',
    errorMessage:   (doc.errorMessage as string)    ?? undefined,
    retryCount:     (doc.retryCount as number)      ?? 0,
    createdAt:      (doc.$createdAt as string)      ?? '',
    updatedAt:      (doc.$updatedAt as string)      ?? '',
  }
}

export async function getOrCreateJob(
  bookProjectId: string,
  userId: string
): Promise<GenerationJob> {
  // Verifica se já existe job ativo
  const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, [
    Query.equal('bookProjectId', bookProjectId),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ])

  if (existing.total > 0) {
    const job = docToJob(existing.documents[0] as Record<string, unknown>)
    // Reaproveita se não concluído
    if (job.status !== 'completed' && job.status !== 'failed') return job
  }

  // Cria novo job
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GENERATION_JOBS,
    ID.unique(),
    {
      bookProjectId,
      userId,
      type:       'full_book',
      status:     'pending',
      progress:   0,
      currentStep: '',
      retryCount:  0,
    }
  )
  return docToJob(doc as Record<string, unknown>)
}

export async function getJob(bookProjectId: string): Promise<GenerationJob | null> {
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATION_JOBS, [
    Query.equal('bookProjectId', bookProjectId),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ])
  if (res.total === 0) return null
  return docToJob(res.documents[0] as Record<string, unknown>)
}

// ── GeneratedSection ──────────────────────────────────────────────────────────

function docToSection(doc: Record<string, unknown>): GeneratedSection {
  return {
    id:             doc.$id as string,
    chapterId:      (doc.chapterId as string)      ?? '',
    bookProjectId:  (doc.bookProjectId as string)  ?? '',
    content:        (doc.content as string)        ?? '',
    citations:      (doc.citations as string)      ?? '[]',
    sourceChunkIds: (doc.sourceChunkIds as string) ?? '[]',
    order:          (doc.order as number)          ?? 0,
    status:         (doc.status as GeneratedSection['status']) ?? 'pending',
  }
}

export async function getSectionsForChapter(chapterId: string): Promise<GeneratedSection[]> {
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
    Query.equal('chapterId', chapterId),
    Query.orderAsc('order'),
    Query.limit(20),
  ])
  return res.documents.map((d) => docToSection(d as Record<string, unknown>))
}

export async function getAllSectionsForBook(bookProjectId: string): Promise<GeneratedSection[]> {
  const sections: GeneratedSection[] = []
  let offset = 0
  while (true) {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
      Query.equal('bookProjectId', bookProjectId),
      Query.orderAsc('order'),
      Query.limit(100),
      Query.offset(offset),
    ])
    sections.push(...res.documents.map((d) => docToSection(d as Record<string, unknown>)))
    if (res.documents.length < 100) break
    offset += 100
  }
  return sections
}

/**
 * Divide conteúdo longo em chunks de max 7400 chars e salva como sections.
 */
export async function saveChapterSections(
  chapterId: string,
  bookProjectId: string,
  content: string,
  citations: string[],
  sourceChunkIds: string[]
): Promise<void> {
  const MAX = 7400
  const parts: string[] = []

  if (content.length <= MAX) {
    parts.push(content)
  } else {
    let i = 0
    while (i < content.length) {
      let end = i + MAX
      if (end < content.length) {
        const paraBreak = content.lastIndexOf('\n\n', end)
        if (paraBreak > i + MAX / 2) end = paraBreak
      }
      const slice = content.slice(i, Math.min(end, content.length)).trim()
      if (slice.length > 50) parts.push(slice)
      i = end
    }
  }

  // Remove seções antigas do capítulo (regeação)
  const old = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, [
    Query.equal('chapterId', chapterId),
    Query.limit(20),
  ])
  await Promise.all(
    old.documents.map((d) =>
      databases.deleteDocument(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, d.$id)
    )
  )

  // Salva novas seções
  await Promise.all(
    parts.map((part, idx) =>
      databases.createDocument(DATABASE_ID, COLLECTIONS.GENERATED_SECTIONS, ID.unique(), {
        chapterId,
        bookProjectId,
        content:        truncate(part, 8000),
        citations:      truncate(JSON.stringify(citations), 1024),
        sourceChunkIds: truncate(JSON.stringify(sourceChunkIds), 1024),
        order:          idx,
        status:         'completed',
      })
    )
  )
}
