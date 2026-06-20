import sharp from 'sharp'
import { parse as parseFont, type Font } from 'opentype.js'
import fs from 'fs'
import path from 'path'

interface CoverData {
  title: string
  authorName: string
  theme?: string
  genre?: string
  type: 'academic' | 'literary'
}

const FONT_REGULAR_PATH = path.join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', 'Roboto-Regular.ttf')
const FONT_BOLD_PATH = path.join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', 'Roboto-Bold.ttf')

let regularFont: Font | null = null
let boldFont: Font | null = null

function getFont(weight: 'normal' | 'bold' = 'normal'): Font {
  if (weight === 'bold') {
    if (!boldFont) boldFont = parseFont(fs.readFileSync(FONT_BOLD_PATH))
    return boldFont
  }
  if (!regularFont) regularFont = parseFont(fs.readFileSync(FONT_REGULAR_PATH))
  return regularFont
}

function textToPath(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  weight: 'normal' | 'bold' = 'normal',
  align: 'left' | 'center' = 'left'
): string {
  const font = getFont(weight)
  const scale = fontSize / font.unitsPerEm
  const width = font.getAdvanceWidth(text, fontSize)

  let startX = x
  if (align === 'center') {
    startX = x - width / 2
  }

  // opentype.js path coordinates: y=0 is baseline, positive y goes up.
  // SVG: y grows downward. We flip vertically and translate to baseline.
  const p = font.getPath(text, startX, y, fontSize)
  return p.toSVG(2)
}

function wrapText(text: string, font: Font, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    const width = font.getAdvanceWidth(test, fontSize)
    if (width > maxWidth && current) {
      lines.push(current.trim())
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current.trim())
  return lines
}

export async function generateCoverImage(data: CoverData): Promise<Buffer> {
  const { title, authorName, theme, genre, type } = data
  const width = 794   // A4 96 DPI
  const height = 1123 // A4 96 DPI
  const year = new Date().getFullYear()

  const label = type === 'academic' ? 'OBRA ACADÊMICA' : (genre ? genre.toUpperCase() : 'LITERATURA')
  const subtitle = theme && theme !== title ? theme : ''

  const regularFont = getFont('normal')
  const boldFont = getFont('bold')

  const titleFontSize = title.length > 50 ? 44 : title.length > 30 ? 52 : 60
  const maxTitleWidth = width * 0.82 // 82% da largura
  const titleLines = wrapText(title, boldFont, titleFontSize, maxTitleWidth)

  const subtitleFontSize = 18
  const maxSubtitleWidth = width * 0.78
  const subtitleLines = subtitle ? wrapText(subtitle, regularFont, subtitleFontSize, maxSubtitleWidth) : []

  const titleLineHeight = titleFontSize * 1.15
  const totalTitleHeight = titleLines.length * titleLineHeight
  const titleY = 420
  const titleStartY = titleY - totalTitleHeight / 2

  let titlePaths = ''
  titleLines.forEach((line, i) => {
    titlePaths += textToPath(line, width / 2, titleStartY + i * titleLineHeight, titleFontSize, 'bold', 'center')
  })

  let subtitlePaths = ''
  if (subtitleLines.length > 0) {
    const subLineHeight = subtitleFontSize * 1.25
    const subStartY = titleStartY + totalTitleHeight + 32
    subtitleLines.forEach((line, i) => {
      subtitlePaths += textToPath(line, width / 2, subStartY + i * subLineHeight, subtitleFontSize, 'normal', 'center')
    })
  }

  const labelFontSize = 13
  const labelPaths = textToPath(label, width / 2, 220, labelFontSize, 'bold', 'center')

  const authorFontSize = 18
  const authorPaths = textToPath(escapeXml(authorName), width / 2, height - 220, authorFontSize, 'normal', 'center')

  const footerFontSize = 12
  const footerPaths = textToPath(`${year} · BookGenerator`, width / 2, height - 90, footerFontSize, 'normal', 'center')

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050505"/>
      <stop offset="60%" stop-color="#0a0f14"/>
      <stop offset="100%" stop-color="#06141a"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="line" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0"/>
      <stop offset="50%" stop-color="#06b6d4" stop-opacity="1"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- Futuristic grid -->
  <g opacity="0.12">
    ${Array.from({ length: 24 }, (_, i) => {
      const x = (i + 1) * (width / 25)
      return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#06b6d4" stroke-width="0.5"/>`
    }).join('')}
    ${Array.from({ length: 34 }, (_, i) => {
      const y = (i + 1) * (height / 35)
      return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#06b6d4" stroke-width="0.5"/>`
    }).join('')}
  </g>

  <!-- Top glow -->
  <ellipse cx="${width / 2}" cy="0" rx="500" ry="280" fill="url(#glow)"/>

  <!-- Decorative circles -->
  <circle cx="120" cy="180" r="80" fill="none" stroke="#06b6d4" stroke-width="1" opacity="0.2"/>
  <circle cx="120" cy="180" r="120" fill="none" stroke="#06b6d4" stroke-width="0.5" opacity="0.1"/>
  <circle cx="${width - 140}" cy="${height - 220}" r="100" fill="none" stroke="#8b5cf6" stroke-width="0.5" opacity="0.15"/>

  <!-- Top accent line -->
  <rect x="${width / 2 - 120}" y="160" width="240" height="2" fill="url(#line)"/>

  <!-- Label -->
  <g fill="#06b6d4" letter-spacing="4">${labelPaths}</g>

  <!-- Title -->
  <g fill="#f0f0f0">${titlePaths}</g>

  <!-- Subtitle / Theme -->
  <g fill="#9ca3af">${subtitlePaths}</g>

  <!-- Author -->
  <g fill="#e5e7eb">${authorPaths}</g>

  <!-- Bottom line -->
  <rect x="${width / 2 - 80}" y="${height - 170}" width="160" height="1" fill="#06b6d4" opacity="0.5"/>

  <!-- Footer -->
  <g fill="#6b7280">${footerPaths}</g>
</svg>
  `.trim()

  const png = await sharp(Buffer.from(svg), { density: 150 })
    .resize(width, height, { fit: 'fill' })
    .png()
    .toBuffer()

  return png
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
