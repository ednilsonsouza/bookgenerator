export interface TextChunk {
  text: string
  index: number
  charStart: number
  charEnd: number
}

const CHUNK_SIZE    = 1800  // ~360-450 palavras por chunk
const CHUNK_OVERLAP = 180   // ~10% de sobreposição

/**
 * Divide o texto em chunks sobrepostos.
 * Tenta quebrar em pontos naturais (fim de parágrafo ou sentença).
 */
export function chunkText(text: string): TextChunk[] {
  if (text.length <= CHUNK_SIZE) {
    return [{ text: text.trim(), index: 0, charStart: 0, charEnd: text.length }]
  }

  const chunks: TextChunk[] = []
  let start = 0
  let idx   = 0

  while (start < text.length) {
    let end = start + CHUNK_SIZE

    if (end >= text.length) {
      // Último chunk
      const slice = text.slice(start).trim()
      if (slice.length > 50) {
        chunks.push({ text: slice, index: idx, charStart: start, charEnd: text.length })
      }
      break
    }

    // Tenta encontrar um ponto de quebra natural antes de `end`
    const naturalBreak = findNaturalBreak(text, end - 200, end)
    if (naturalBreak !== -1) end = naturalBreak

    const slice = text.slice(start, end).trim()
    if (slice.length > 50) {
      chunks.push({ text: slice, index: idx, charStart: start, charEnd: end })
      idx++
    }

    // Avança com sobreposição
    start = end - CHUNK_OVERLAP
  }

  return chunks
}

/**
 * Procura a última quebra de parágrafo ou ponto final dentro do intervalo.
 */
function findNaturalBreak(text: string, from: number, to: number): number {
  // Tenta \n\n (fim de parágrafo)
  const paraBreak = text.lastIndexOf('\n\n', to)
  if (paraBreak >= from) return paraBreak + 2

  // Tenta fim de sentença (. ? !)
  for (let i = to; i >= from; i--) {
    if (['.', '?', '!'].includes(text[i]) && text[i + 1] === ' ') {
      return i + 1
    }
  }

  // Tenta fim de linha simples
  const lineBreak = text.lastIndexOf('\n', to)
  if (lineBreak >= from) return lineBreak + 1

  return -1
}
