import { openai } from '@/lib/openai/client'
import type { TextChunk } from './chunkText'

export const EMBEDDING_MODEL     = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 256   // reduzido: ~3100 chars JSON, cabe em 6000

export interface EmbeddedChunk extends TextChunk {
  embedding: number[]
  embeddingJson: string
}

/**
 * Gera embeddings para um array de chunks em lotes de 20.
 * Usa text-embedding-3-small com 256 dimensões.
 */
export async function embedChunks(chunks: TextChunk[]): Promise<EmbeddedChunk[]> {
  const BATCH = 20
  const embedded: EmbeddedChunk[] = []

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const texts = batch.map((c) => c.text.replace(/\n/g, ' ').slice(0, 8000))

    const res = await openai.embeddings.create({
      model:      EMBEDDING_MODEL,
      input:      texts,
      dimensions: EMBEDDING_DIMENSIONS,
    })

    for (let j = 0; j < batch.length; j++) {
      const embedding = res.data[j].embedding
      embedded.push({
        ...batch[j],
        embedding,
        embeddingJson: JSON.stringify(embedding),
      })
    }
  }

  return embedded
}

/**
 * Gera embedding para uma única query de busca.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model:      EMBEDDING_MODEL,
    input:      [query.replace(/\n/g, ' ').slice(0, 2000)],
    dimensions: EMBEDDING_DIMENSIONS,
  })
  return res.data[0].embedding
}
