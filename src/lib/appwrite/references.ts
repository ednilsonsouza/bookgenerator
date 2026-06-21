'use client'

import { AppwriteException } from 'appwrite'
import { databases, ID, Query } from './client'
import { DATABASE_ID, COLLECTIONS } from './config'
import { truncate } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReferenceStatus = 'pending' | 'processing' | 'ready' | 'error' | 'no_file'

export interface Reference {
  id: string
  bookProjectId: string
  fileId?: string
  title: string
  authors: string
  year: string
  publisher: string
  extractedTextStatus: ReferenceStatus
  citationKey: string
  abntFormattedReference: string
  accessUrl?: string   // URL de acesso (OpenAlex, DOI, etc.)
  chunkCount?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function docToReference(doc: Record<string, unknown>): Reference {
  return {
    id:                     doc.$id as string,
    bookProjectId:          (doc.bookProjectId as string)          ?? '',
    fileId:                 (doc.fileId as string)                  ?? undefined,
    title:                  (doc.title as string)                   ?? '',
    authors:                (doc.authors as string)                 ?? '',
    year:                   (doc.year as string)                    ?? '',
    publisher:              (doc.publisher as string)               ?? '',
    extractedTextStatus:    (doc.extractedTextStatus as ReferenceStatus) ?? 'pending',
    citationKey:            (doc.citationKey as string)             ?? '',
    abntFormattedReference: (doc.abntFormattedReference as string)  ?? '',
    accessUrl:              (doc.accessUrl as string)               ?? undefined,
  }
}

// ── ABNT formatter ────────────────────────────────────────────────────────────

/**
 * Gera uma referência bibliográfica no formato ABNT a partir dos metadados.
 * SOBRENOME, Nome. Título. Cidade: Editora, Ano.
 */
export function formatAbnt(
  authors: string,
  title: string,
  publisher: string,
  year: string,
  accessUrl?: string,
): string {
  const authorsUpper = authors
    .split(/[,;]/)
    .map((a) => {
      const parts = a.trim().split(' ')
      if (parts.length < 2) return a.trim().toUpperCase()
      const last  = parts[parts.length - 1].toUpperCase()
      const first = parts.slice(0, -1).join(' ')
      return `${last}, ${first}`
    })
    .join('; ')

  const parts = [authorsUpper, title ? `**${title}**` : '', publisher, year]
    .filter(Boolean)
    .join('. ')

  let ref = parts + '.'

  if (accessUrl) {
    const today = new Date()
    const acesso = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    ref += ` Disponível em: ${accessUrl}. Acesso em: ${acesso}.`
  }

  return ref
}

/**
 * Gera uma chave de citação curta: Sobrenome (Ano)
 */
export function buildCitationKey(authors: string, year: string): string {
  const firstAuthor = authors.split(/[,;]/)[0]?.trim() ?? 'AUTOR'
  const lastName = firstAuthor.split(' ').pop()?.toUpperCase() ?? 'AUTOR'
  return `${lastName} (${year || 'S.D.'})`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createReference(data: {
  bookProjectId: string
  title: string
  authors: string
  year: string
  publisher: string
  fileId?: string
  accessUrl?: string
}): Promise<Reference> {
  const citationKey = buildCitationKey(data.authors, data.year)
  const abnt        = formatAbnt(data.authors, data.title, data.publisher, data.year, data.accessUrl)

  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.REFERENCES,
    ID.unique(),
    {
      bookProjectId:          data.bookProjectId,
      fileId:                 data.fileId ?? null,
      title:                  truncate(data.title, 512),
      authors:                truncate(data.authors, 512),
      year:                   truncate(data.year, 16),
      publisher:              truncate(data.publisher, 255),
      extractedTextStatus:    data.fileId ? 'pending' : 'no_file',
      citationKey:            truncate(citationKey, 128),
      abntFormattedReference: truncate(abnt, 1024),
      accessUrl:              data.accessUrl ? truncate(data.accessUrl, 1024) : null,
    }
  )
  return docToReference(doc as Record<string, unknown>)
}

export async function listReferences(bookProjectId: string): Promise<Reference[]> {
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
    Query.equal('bookProjectId', bookProjectId),
    Query.orderAsc('$createdAt'),
    Query.limit(50),
  ])
  return res.documents.map((d) => docToReference(d as Record<string, unknown>))
}

export async function deleteReference(referenceId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId)
}

export async function updateReferenceStatus(
  referenceId: string,
  status: ReferenceStatus
): Promise<void> {
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
    extractedTextStatus: status,
  })
}

export async function countChunks(bookProjectId: string): Promise<number> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
      Query.equal('bookProjectId', bookProjectId),
      Query.limit(1),
    ])
    return res.total
  } catch {
    return 0
  }
}
