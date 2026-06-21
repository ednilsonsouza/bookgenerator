/**
 * GET /api/books/[id]/references/openalex?q=termo&page=1&perPage=10
 *
 * Proxy para a API pública do OpenAlex (https://api.openalex.org).
 * Retorna obras acadêmicas formatadas para uso como referência bibliográfica.
 * Não requer autenticação — usa `mailto` como identificação de boa conduta.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface OpenAlexWork {
  id: string           // "https://openalex.org/W..."
  title: string
  authors: string      // formatado: "SOBRENOME, Nome; ..."
  year: string
  publisher: string    // journal/source name
  doi?: string
  accessUrl: string    // landing page ou doi link
  isOA: boolean        // open access
  abstract?: string
}

function formatAuthors(authorships: Array<{author: {display_name: string}}>) {
  return authorships
    .slice(0, 6) // máximo 6 autores para ABNT
    .map((a) => {
      const name = a.author?.display_name ?? ''
      const parts = name.trim().split(' ')
      if (parts.length < 2) return name.toUpperCase()
      const last  = parts[parts.length - 1].toUpperCase()
      const first = parts.slice(0, -1).join(' ')
      return `${last}, ${first}`
    })
    .join('; ')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params // consume params

  const q       = req.nextUrl.searchParams.get('q')?.trim()
  const page    = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const perPage = Math.min(parseInt(req.nextUrl.searchParams.get('perPage') ?? '10', 10), 25)

  if (!q) {
    return NextResponse.json({ error: 'Parâmetro q é obrigatório.' }, { status: 400 })
  }

  const mailTo  = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'bookgenerator@app.com'
  const apiUrl  = new URL('https://api.openalex.org/works')
  apiUrl.searchParams.set('search',    q)
  apiUrl.searchParams.set('per_page',  String(perPage))
  apiUrl.searchParams.set('page',      String(page))
  apiUrl.searchParams.set('mailto',    mailTo)
  apiUrl.searchParams.set('select',    [
    'id', 'title', 'authorships', 'publication_year',
    'primary_location', 'doi', 'open_access', 'abstract_inverted_index',
    'biblio',
  ].join(','))

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: { 'User-Agent': `BookGenerator/1.0 (mailto:${mailTo})` },
      next:    { revalidate: 300 }, // cache 5 min
    })

    if (!response.ok) {
      throw new Error(`OpenAlex retornou ${response.status}`)
    }

    const data = await response.json()

    const works: OpenAlexWork[] = (data.results ?? []).map((w: Record<string, unknown>) => {
      const doi         = w.doi as string | null
      const primaryLoc  = w.primary_location as Record<string, unknown> | null
      const source      = primaryLoc?.source as Record<string, unknown> | null
      const openAccess  = w.open_access as Record<string, unknown> | null
      const authorships = (w.authorships as Array<{author: {display_name: string}}>) ?? []

      const accessUrl =
        (openAccess?.oa_url as string | null) ||
        (primaryLoc?.landing_page_url as string | null) ||
        (doi ? `https://doi.org/${doi.replace('https://doi.org/', '')}` : null) ||
        (w.id as string)

      // Reconstrói abstract de inverted index
      let abstract: string | undefined
      const invertedIndex = w.abstract_inverted_index as Record<string, number[]> | null
      if (invertedIndex) {
        const wordPositions: Array<[number, string]> = []
        for (const [word, positions] of Object.entries(invertedIndex)) {
          for (const pos of positions) {
            wordPositions.push([pos, word])
          }
        }
        abstract = wordPositions
          .sort(([a], [b]) => a - b)
          .map(([, w]) => w)
          .join(' ')
          .slice(0, 400)
      }

      return {
        id:         w.id as string,
        title:      (w.title as string) ?? 'Sem título',
        authors:    formatAuthors(authorships),
        year:       String((w.publication_year as number) ?? ''),
        publisher:  (source?.display_name as string) ?? '',
        doi:        doi ?? undefined,
        accessUrl:  accessUrl || (w.id as string),
        isOA:       !!(openAccess?.is_oa),
        abstract,
      }
    })

    return NextResponse.json({
      works,
      total:   data.meta?.count ?? works.length,
      page,
      perPage,
    })
  } catch (err) {
    console.error('[openalex]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao consultar OpenAlex.' },
      { status: 500 }
    )
  }
}
