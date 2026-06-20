import { databases, Query } from '@/lib/appwrite/client'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { embedQuery } from './embedChunks'

export interface RetrievedChunk {
  chunkId: string
  referenceId: string
  text: string
  score: number
  pageNumber?: number
}

/**
 * Calcula similaridade de cosseno entre dois vetores.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Busca os K chunks mais relevantes para uma query num projeto de obra.
 * Estratégia: fetch todos os chunks do projeto + rank por cosine similarity.
 * Funciona bem para até ~600 chunks (30 refs × 20 chunks cada).
 */
export async function retrieveSources(
  bookProjectId: string,
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  // 1. Embed a query
  const queryEmbedding = await embedQuery(query)

  // 2. Busca todos os chunks do projeto (paginado)
  const allChunks: Array<Record<string, unknown>> = []
  let offset = 0
  const LIMIT = 100

  while (true) {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCE_CHUNKS, [
      Query.equal('bookProjectId', bookProjectId),
      Query.limit(LIMIT),
      Query.offset(offset),
    ])
    allChunks.push(...(res.documents as Array<Record<string, unknown>>))
    if (res.documents.length < LIMIT) break
    offset += LIMIT
  }

  // 3. Filtra chunks que têm embedding
  const scored = allChunks
    .filter((c) => c.embeddingJson)
    .map((c) => {
      const embedding: number[] = JSON.parse(c.embeddingJson as string)
      return {
        chunkId:    c.$id as string,
        referenceId: c.referenceId as string,
        text:       c.chunkText as string,
        pageNumber: c.pageNumber as number | undefined,
        score:      cosineSimilarity(queryEmbedding, embedding),
      }
    })

  // 4. Ordena por score e retorna top-K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
