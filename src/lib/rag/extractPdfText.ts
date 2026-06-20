import { getDocumentProxy, extractText as unpdfExtractText } from 'unpdf'

export interface ExtractResult {
  text: string
  pages: number
  chars: number
  warning?: string
}

/**
 * Extrai texto de um buffer PDF usando unpdf (serverless-safe, sem canvas).
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  const uint8 = new Uint8Array(buffer)
  const pdf   = await getDocumentProxy(uint8)
  const { text } = await unpdfExtractText(pdf, { mergePages: true })

  const cleaned = (Array.isArray(text) ? text.join('\n') : text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()

  const chars = cleaned.length
  const pages = pdf.numPages ?? 1

  let warning: string | undefined
  if (chars < 200) {
    warning =
      'O texto extraído é muito curto. O PDF pode ser escaneado (imagem sem OCR). ' +
      'Use um PDF com camada de texto.'
  }

  return { text: cleaned, pages, chars, warning }
}

/**
 * Extrai texto de um arquivo TXT (buffer utf-8).
 */
export function extractTxtText(buffer: Buffer): ExtractResult {
  const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').trim()
  return { text, pages: 1, chars: text.length }
}

/**
 * Detecta tipo e extrai texto conforme o MIME type.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractResult> {
  if (mimeType.includes('pdf')) {
    return extractPdfText(buffer)
  }
  if (mimeType.includes('text') || mimeType.includes('txt')) {
    return extractTxtText(buffer)
  }
  throw new Error(`Tipo não suportado: ${mimeType}. Use PDF ou TXT.`)
}
