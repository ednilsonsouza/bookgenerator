/**
 * Parser de quadros gerados pela IA no formato:
 *
 * [QUADRO|Título do Quadro|Fonte: Elaborado pelo autor (2024)]
 * Coluna 1 | Coluna 2 | Coluna 3
 * Dado A   | Dado B   | Dado C
 * [/QUADRO]
 */

export interface TableData {
  /** Título original sem número (ex: "Quadro 1 – Critérios" ou "Critérios") */
  title: string
  /** Título com numeração global correta (definido pelo PDF renderer) */
  numberedTitle?: string
  source: string
  headers: string[]
  rows: string[][]
}

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'table'; data: TableData }

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Corrige o ano na linha de fonte do quadro.
 * Substitui qualquer ano entre parênteses (19xx ou 20xx) pelo ano atual.
 * Ex: "Fonte: Elaborado pelo autor (2023)" → "Fonte: Elaborado pelo autor (2026)"
 */
function fixSourceYear(source: string): string {
  return source.replace(/\(\s*(19|20)\d{2}\s*\)/g, `(${CURRENT_YEAR})`)
}

/**
 * Remove o número de quadro do título caso a IA já tenha inserido
 * (ex: "Quadro 1 – Critérios" → "Critérios") para que o renderer
 * possa inserir a numeração global correta.
 */
function stripTableNumber(title: string): string {
  // Remove prefixo: "Quadro N –", "Quadro N -", "Quadro N.", "Quadro N:"
  return title.replace(/^Quadro\s+\d+\s*[–\-.:]\s*/i, '').trim() || title
}

/**
 * Divide o conteúdo de um capítulo em blocos de texto e quadros.
 */
export function parseContentBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = []

  // Regex que captura [QUADRO|título|fonte] ... [/QUADRO]
  const tableRegex = /\[QUADRO\|([^\]|]+)\|([^\]]+)\]\n?([\s\S]*?)\[\/QUADRO\]/gi

  let lastIndex = 0
  let match: RegExpExecArray | null

  tableRegex.lastIndex = 0

  while ((match = tableRegex.exec(content)) !== null) {
    // Texto antes do quadro
    const textBefore = content.slice(lastIndex, match.index).trim()
    if (textBefore) {
      blocks.push({ type: 'text', content: textBefore })
    }

    // Processa o quadro
    const rawTitle = match[1].trim()
    const rawSource = match[2].trim()
    const body   = match[3].trim()

    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length >= 1) {
      const headers = lines[0].split('|').map((c) => c.trim())
      const rows    = lines.slice(1).map((l) => l.split('|').map((c) => c.trim()))

      blocks.push({
        type: 'table',
        data: {
          title:  stripTableNumber(rawTitle),  // sem número (será atribuído globalmente)
          source: fixSourceYear(rawSource),     // ano sempre correto
          headers,
          rows,
        },
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Texto restante após o último quadro
  const textAfter = content.slice(lastIndex).trim()
  if (textAfter) {
    blocks.push({ type: 'text', content: textAfter })
  }

  // Se nenhum quadro foi encontrado, retorna tudo como texto
  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: 'text', content: content.trim() })
  }

  return blocks
}

/**
 * Conta o total de quadros em uma lista de blocos de conteúdo.
 */
export function countTables(blocks: ContentBlock[]): number {
  return blocks.filter((b) => b.type === 'table').length
}
