import { createAdminClient } from './server'
import { ADMIN_EMAIL } from './config'

/**
 * Verifica se o userId corresponde ao admin configurado.
 * Usa o SDK de servidor (API Key) para buscar o e-mail do usuário.
 */
export async function verifyAdmin(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const { users } = createAdminClient()
    const user = await users.get(userId)
    return user.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

// Estimativas de custo GPT-4o-mini (USD por 1M tokens)
export const COST = {
  INPUT_PER_M:     0.15,   // gpt-4o-mini input
  OUTPUT_PER_M:    0.60,   // gpt-4o-mini output
  EMBED_PER_M:     0.02,   // text-embedding-3-small
  // Médias por operação
  PLAN_INPUT:      2000,   // tokens de entrada para gerar plano
  PLAN_OUTPUT:     1500,   // tokens de saída do plano
  CHAPTER_INPUT:   5000,   // tokens de entrada por capítulo
  CHAPTER_OUTPUT:  3500,   // tokens de saída por capítulo
  CHUNK_EMBED:     300,    // tokens por chunk para embed
  QUERY_EMBED:     50,     // tokens por query embed no RAG
} as const

/** Calcula custo estimado em USD para um job de geração. */
export function estimateJobCost(chaptersCount: number, chunksEmbedded = 0): number {
  const planCost =
    (COST.PLAN_INPUT  * COST.INPUT_PER_M)  / 1_000_000 +
    (COST.PLAN_OUTPUT * COST.OUTPUT_PER_M) / 1_000_000

  const chaptersCost = chaptersCount * (
    (COST.CHAPTER_INPUT  * COST.INPUT_PER_M)  / 1_000_000 +
    (COST.CHAPTER_OUTPUT * COST.OUTPUT_PER_M) / 1_000_000 +
    (COST.QUERY_EMBED    * COST.EMBED_PER_M)  / 1_000_000   // RAG query embed por capítulo
  )

  const embedCost = chunksEmbedded * (COST.CHUNK_EMBED * COST.EMBED_PER_M) / 1_000_000

  return planCost + chaptersCost + embedCost
}

export function formatUSD(value: number): string {
  if (value < 0.001) return '< $0.001'
  return `$${value.toFixed(4)}`
}
