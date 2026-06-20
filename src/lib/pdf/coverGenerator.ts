import sharp from 'sharp'

interface CoverData {
  title: string
  authorName: string
  theme?: string
  genre?: string
  type: 'academic' | 'literary'
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim())
      current = word
    } else {
      current = (current + ' ' + word).trim()
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

  const titleLines = wrapText(escapeXml(title), 28)
  const subtitleLines = subtitle ? wrapText(escapeXml(subtitle), 42) : []

  // Monta texto do título com tamanho dinâmico
  const titleFontSize = title.length > 50 ? 44 : title.length > 30 ? 52 : 60
  const titleY = 420
  const lineHeight = titleFontSize * 1.15
  const totalTitleHeight = titleLines.length * lineHeight
  const titleStartY = titleY - totalTitleHeight / 2

  let titleSvg = ''
  titleLines.forEach((line, i) => {
    titleSvg += `<text x="${width / 2}" y="${titleStartY + i * lineHeight}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="#f0f0f0">${line}</text>`
  })

  let subtitleSvg = ''
  if (subtitleLines.length > 0) {
    const subLineHeight = 22
    const subStartY = titleStartY + totalTitleHeight + 32
    subtitleLines.forEach((line, i) => {
      subtitleSvg += `<text x="${width / 2}" y="${subStartY + i * subLineHeight}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#9ca3af">${line}</text>`
    })
  }

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
  <text x="${width / 2}" y="220" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" letter-spacing="4" fill="#06b6d4">${escapeXml(label)}</text>

  <!-- Title -->
  ${titleSvg}

  <!-- Subtitle / Theme -->
  ${subtitleSvg}

  <!-- Author -->
  <text x="${width / 2}" y="${height - 220}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#e5e7eb">${escapeXml(authorName)}</text>

  <!-- Bottom line -->
  <rect x="${width / 2 - 80}" y="${height - 170}" width="160" height="1" fill="#06b6d4" opacity="0.5"/>

  <!-- Footer -->
  <text x="${width / 2}" y="${height - 90}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#6b7280">${year} · BookGenerator</text>
</svg>
  `.trim()

  const png = await sharp(Buffer.from(svg), { density: 150 })
    .resize(width, height, { fit: 'fill' })
    .png()
    .toBuffer()

  return png
}
