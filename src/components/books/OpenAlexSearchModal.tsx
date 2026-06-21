'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { X, Search, ExternalLink, Plus, CheckCircle2, Globe, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpenAlexWork } from '@/app/api/books/[id]/references/openalex/route'

interface Props {
  bookId: string
  userId: string
  currentCount: number
  maxRefs: number
  onAdded: () => void
  onClose: () => void
}

export function OpenAlexSearchModal({ bookId, userId, currentCount, maxRefs, onAdded, onClose }: Props) {
  const [query, setQuery]       = useState('')
  const [works, setWorks]       = useState<OpenAlexWork[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding]     = useState<string | null>(null)
  const [added, setAdded]       = useState<Set<string>>(new Set())
  const [error, setError]       = useState('')

  const available = maxRefs - currentCount - added.size

  const search = useCallback(async (q: string, p = 1) => {
    if (!q.trim()) return
    setSearching(true)
    setError('')
    try {
      const res = await fetch(
        `/api/books/${bookId}/references/openalex?q=${encodeURIComponent(q)}&page=${p}&perPage=10`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na busca')
      if (p === 1) setWorks(data.works)
      else setWorks((prev) => [...prev, ...data.works])
      setTotal(data.total)
      setPage(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar.')
    } finally {
      setSearching(false)
    }
  }, [bookId])

  async function handleAdd(work: OpenAlexWork) {
    if (available <= 0) return
    setAdding(work.id)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/references`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId,
          title:     work.title,
          authors:   work.authors,
          year:      work.year,
          publisher: work.publisher,
          accessUrl: work.accessUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao adicionar')
      setAdded((prev) => new Set([...prev, work.id]))
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar.')
    } finally {
      setAdding(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') search(query)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface shadow-[0_0_60px_rgba(6,182,212,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Buscar no OpenAlex
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Catálogo global de obras acadêmicas — gratuito e aberto
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Buscar por título, autor, tema... (ex: análise de conteúdo Bardin)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-10 pl-9 pr-4 rounded-md border border-border bg-background text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </div>
            <Button onClick={() => { setPage(1); search(query, 1) }} loading={searching} className="shrink-0">
              Buscar
            </Button>
          </div>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {total.toLocaleString('pt-BR')} resultados encontrados
              {available > 0
                ? ` · Você pode adicionar mais ${available} referência${available !== 1 ? 's' : ''}`
                : ' · Limite de referências atingido'}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {!searching && works.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-foreground/60 font-medium">Digite um termo e clique em Buscar</p>
              <p className="text-sm text-muted-foreground/60 mt-1 max-w-sm">
                Pesquise por título, autor, tema ou palavras-chave. O OpenAlex tem mais de 250 milhões de obras.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-danger bg-danger-muted border border-danger/30 rounded-md px-4 py-2">
              {error}
            </p>
          )}

          {works.map((work) => {
            const isAdded    = added.has(work.id)
            const isAdding   = adding === work.id
            const canAdd     = !isAdded && available > 0 && !adding

            return (
              <div
                key={work.id}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  isAdded ? 'border-success/30 bg-success-muted/30' : 'border-border hover:border-border-strong'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Título */}
                    <div className="flex items-start gap-2 mb-1">
                      <p className="font-medium text-foreground text-sm leading-snug flex-1">{work.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {work.isOA ? (
                          <span className="flex items-center gap-1 text-xs text-success bg-success-muted px-2 py-0.5 rounded-full border border-success/20">
                            <Globe className="h-3 w-3" /> Aberto
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/60 bg-surface-muted px-2 py-0.5 rounded-full border border-border">
                            <Lock className="h-3 w-3" /> Fechado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Autores */}
                    {work.authors && (
                      <p className="text-xs text-muted-foreground mb-1 truncate">{work.authors}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/70 mb-2 flex-wrap">
                      {work.year && <span>{work.year}</span>}
                      {work.publisher && <span className="truncate max-w-[250px]">{work.publisher}</span>}
                    </div>

                    {/* Abstract preview */}
                    {work.abstract && (
                      <p className="text-xs text-muted-foreground/60 italic line-clamp-2 mb-2">
                        {work.abstract}...
                      </p>
                    )}

                    {/* Links */}
                    <div className="flex items-center gap-3">
                      {work.accessUrl && (
                        <a
                          href={work.accessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Acessar obra
                        </a>
                      )}
                      {work.doi && (
                        <span className="text-xs text-muted-foreground/50">
                          DOI: {work.doi.replace('https://doi.org/', '')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {isAdded ? (
                      <span className="flex items-center gap-1.5 text-xs text-success font-medium">
                        <CheckCircle2 className="h-4 w-4" /> Adicionada
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={canAdd ? 'primary' : 'secondary'}
                        disabled={!canAdd}
                        loading={isAdding}
                        onClick={() => handleAdd(work)}
                        className="gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {works.length > 0 && works.length < total && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                loading={searching}
                onClick={() => search(query, page + 1)}
                className="gap-2"
              >
                Carregar mais resultados
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border text-xs text-muted-foreground/60">
          <span>
            Dados fornecidos por{' '}
            <a
              href="https://openalex.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OpenAlex
            </a>
            {' '}— licença CC0
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}
