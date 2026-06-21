'use client'

import { AppwriteException } from 'appwrite'
import { databases, ID, Query } from './client'
import { DATABASE_ID, COLLECTIONS } from './config'
import { truncate } from '@/lib/utils'
import type { BookProject, BookStatus } from '@/types/book'

// ── helpers ──────────────────────────────────────────────────────────────────

function docToBookProject(doc: Record<string, unknown>): BookProject {
  return {
    id: doc.$id as string,
    userId: (doc.userId as string) ?? '',
    title: (doc.title as string) ?? '',
    theme: (doc.theme as string) ?? '',
    type: (doc.type as BookProject['type']) ?? 'literary',
    academicSubtype: (doc.academicSubtype as BookProject['academicSubtype']) ?? undefined,
    literaryGenre: (doc.literaryGenre as BookProject['literaryGenre']) ?? undefined,
    description: (doc.description as string) ?? '',
    chapterCount: (doc.chapterCount as number) ?? 5,
    sectionsPerChapter: (doc.sectionsPerChapter as number) ?? 4,
    status: (doc.status as BookStatus) ?? 'draft',
    visibility: (doc.visibility as BookProject['visibility']) ?? 'private',
    coverFileId: (doc.coverFileId as string) ?? undefined,
    finalPdfFileId: (doc.finalPdfFileId as string) ?? undefined,
    createdAt: (doc.$createdAt as string) ?? '',
    updatedAt: (doc.$updatedAt as string) ?? '',
  }
}

function handleAppwriteError(err: unknown): never {
  if (err instanceof AppwriteException) {
    switch (err.code) {
      case 401:
        throw new Error('Sessão expirada. Faça login novamente.')
      case 403:
        throw new Error('Sem permissão para acessar este recurso.')
      case 404:
        throw new Error('Recurso não encontrado.')
      case 429:
        throw new Error('Muitas requisições. Tente em alguns segundos.')
      default:
        throw new Error(err.message)
    }
  }
  throw err
}

// ── BookProject ───────────────────────────────────────────────────────────────

export async function createBookProject(
  userId: string,
  data: Omit<BookProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<BookProject> {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.BOOK_PROJECTS,
      ID.unique(),
      {
        userId,
        title: truncate(data.title, 200),
        theme: truncate(data.theme, 300),
        type: data.type,
        academicSubtype: data.academicSubtype ?? null,
        literaryGenre: data.literaryGenre ?? null,
        description: truncate(data.description, 2000),
        chapterCount: data.chapterCount ?? 5,
        sectionsPerChapter: data.sectionsPerChapter ?? 4,
        status: data.status ?? 'draft',
        visibility: data.visibility ?? 'private',
        coverFileId: null,
        finalPdfFileId: null,
      }
    )
    return docToBookProject(doc as Record<string, unknown>)
  } catch (err) {
    handleAppwriteError(err)
  }
}

export async function listBookProjects(userId: string): Promise<BookProject[]> {
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ])
    return result.documents.map((doc) => docToBookProject(doc as Record<string, unknown>))
  } catch (err) {
    handleAppwriteError(err)
  }
}

export async function getBookProject(id: string): Promise<BookProject | null> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, id)
    return docToBookProject(doc as Record<string, unknown>)
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null
    handleAppwriteError(err)
  }
}

export async function updateBookProject(
  id: string,
  data: Partial<Omit<BookProject, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'coverFileId' | 'finalPdfFileId'>> & {
    coverFileId?: string | null
    finalPdfFileId?: string | null
  }
): Promise<BookProject> {
  try {
    const payload: Record<string, unknown> = {}
    if (data.title !== undefined) payload.title = truncate(data.title, 200)
    if (data.theme !== undefined) payload.theme = truncate(data.theme, 300)
    if (data.type !== undefined) payload.type = data.type
    if (data.academicSubtype !== undefined) payload.academicSubtype = data.academicSubtype
    if (data.literaryGenre !== undefined) payload.literaryGenre = data.literaryGenre
    if (data.description !== undefined) payload.description = truncate(data.description, 2000)
    if (data.chapterCount !== undefined) payload.chapterCount = data.chapterCount
    if (data.sectionsPerChapter !== undefined) payload.sectionsPerChapter = data.sectionsPerChapter
    if (data.status !== undefined) payload.status = data.status
    if (data.visibility !== undefined) payload.visibility = data.visibility
    if (data.coverFileId !== undefined) payload.coverFileId = data.coverFileId ?? null
    if (data.finalPdfFileId !== undefined) payload.finalPdfFileId = data.finalPdfFileId ?? null

    const doc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.BOOK_PROJECTS,
      id,
      payload
    )
    return docToBookProject(doc as Record<string, unknown>)
  } catch (err) {
    handleAppwriteError(err)
  }
}

export async function deleteBookProject(id: string): Promise<void> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, id)
  } catch (err) {
    handleAppwriteError(err)
  }
}
