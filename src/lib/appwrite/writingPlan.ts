'use client'

import { AppwriteException } from 'appwrite'
import { databases, ID, Query } from './client'
import { DATABASE_ID, COLLECTIONS } from './config'
import { truncate } from '@/lib/utils'
import type { Chapter, WritingPlan } from '@/types/book'

// ── helpers ──────────────────────────────────────────────────────────────────

function docToChapter(doc: Record<string, unknown>): Chapter {
  return {
    id: doc.$id as string,
    bookProjectId: (doc.bookProjectId as string) ?? '',
    title: (doc.title as string) ?? '',
    order: (doc.order as number) ?? 0,
    targetPages: (doc.targetPages as number) ?? 0,
    targetWords: (doc.targetWords as number) ?? 0,
    description: (doc.description as string) ?? undefined,
    status: (doc.status as Chapter['status']) ?? 'pending',
  }
}

// ── WritingPlan ───────────────────────────────────────────────────────────────

export async function getWritingPlan(bookProjectId: string): Promise<WritingPlan | null> {
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.WRITING_PLANS, [
      Query.equal('bookProjectId', bookProjectId),
      Query.limit(1),
    ])
    if (result.total === 0) return null

    const doc = result.documents[0] as Record<string, unknown>
    const chapters = await listChapters(bookProjectId)

    return {
      id: doc.$id as string,
      bookProjectId: (doc.bookProjectId as string) ?? '',
      chapters,
      status: (doc.status as WritingPlan['status']) ?? 'pending',
      generatedAt: (doc.generatedAt as string) ?? (doc.$createdAt as string),
      editedAt: (doc.editedAt as string) ?? undefined,
    }
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null
    throw err
  }
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export async function listChapters(bookProjectId: string): Promise<Chapter[]> {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAPTERS, [
    Query.equal('bookProjectId', bookProjectId),
    Query.orderAsc('order'),
    Query.limit(50),
  ])
  return result.documents.map((d) => docToChapter(d as Record<string, unknown>))
}

export async function updateChapter(
  chapterId: string,
  data: { title?: string; description?: string; order?: number; targetPages?: number }
): Promise<Chapter> {
  const payload: Record<string, unknown> = {}
  if (data.title !== undefined)       payload.title       = truncate(data.title, 300)
  if (data.description !== undefined) payload.description = truncate(data.description, 1000)
  if (data.order !== undefined)       payload.order       = data.order
  if (data.targetPages !== undefined) payload.targetPages = data.targetPages

  const doc = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.CHAPTERS,
    chapterId,
    payload
  )
  return docToChapter(doc as Record<string, unknown>)
}

export async function savePlanEdits(
  planId: string,
  bookProjectId: string,
  chapters: Array<{ id: string; title: string; description: string; order: number; targetPages: number }>
): Promise<void> {
  // Atualiza cada capítulo
  await Promise.all(
    chapters.map((ch) =>
      databases.updateDocument(DATABASE_ID, COLLECTIONS.CHAPTERS, ch.id, {
        title: truncate(ch.title, 300),
        description: truncate(ch.description, 1000),
        order: ch.order,
        targetPages: ch.targetPages,
        targetWords: ch.targetPages * 300,
      })
    )
  )

  // Marca o plano como editado
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.WRITING_PLANS, planId, {
    chaptersJson: truncate(JSON.stringify(chapters), 8000),
    status: 'edited',
    editedAt: new Date().toISOString(),
  })
}
