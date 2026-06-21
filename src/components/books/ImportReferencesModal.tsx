'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { X, Search, BookOpen, CheckSquare, Square, ChevronDown, ChevronUp, Import } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RefItem {
  id: string
  title: string
  authors: string
  year: string
  publisher: string
  citationKey: string
  abntFormattedReference: string
  extractedTextStatus: string
  chunkCount: number
}

interface BookGroup {
  id: string
  title: string
  refs: RefItem[]
}

interface Props {
  bookId: string
  userId: string
  currentCount: number
  maxRefs: number
  onImported: () => void
  onClose: () => void
}

export function ImportReferencesModal({ bookId, userId, currentCount, maxRefs, onImported, onClose }: Props) {
  const [books, setBooks]           = useState<BookGroup[]>([])
  const [loading, setLoading]       = useState(true)
  const [importing, setImporting]   = useState(false)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())
  const [error, setError]           = useState('')

  const available = maxRefs - currentCount

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/books/${bookId}/references/library?userId=${userId}`)
        const data = await res.json()
        setBooks(data.books ?? [])
        // Expande a primeira obra por padrão
        if (data.books?.length > 0) {
          setExpanded(new Set([data.books[0].id]))
        }
      } catch {
        setError('Erro ao carregar referências.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bookId, userId])

  function toggleRef(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else {
        if (next.size >= available) return prev // Limite atingido
        next.add(id)
      }
      return next
    })
  }

  function toggleBook(book: BookGroup) {
    const allIds = filtered(book.refs).map((r) => r.id)
    const allSelected = allIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        allIds.forEach((id) => next.delete(id))
      } else {
        for (const id of allIds) {
          if (next.size >= available) break
          next.add(id)
        }
      }
      return next
    })
  }

  function toggleExpand(bookId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(bookId)) { next.delete(bookId) } else { next.add(bookId) }
      return next
    })
  }

  function filtered(refs: RefItem[]) {
    if (!search.trim()) return refs
    const q = search.toLowerCase()
    return refs.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.authors.toLowerCase().includes(q) ||
      r.year.includes(q)
    )
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/references/import`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, referenceIds: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao importar.'); return }
      onImported()
      onClose()
    } catch {
      setError('Erro ao importar referências.')
    } finally {
      setImporting(false)
    }
  }

  const totalFiltered = books.reduce((sum, b) => sum + filtered(b.refs).length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-surface shadow-[0_0_60px_rgba(6,182,212,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Reutilizar referências</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione referências de outras obras — os embeddings são copiados sem novo processamento
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Buscar por título, autor ou ano..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-border bg-background text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between px-6 py-2 text-xs text-muted-foreground border-b border-border bg-surface-muted/30">
          <span>
            {selected.size} selecionada{selected.size !== 1 ? 's' : ''} de {available} disponível{available !== 1 ? 'eis' : ''}
          </span>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-primary hover:underline"
            >
              Limpar seleção
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {!loading && books.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-foreground/70 font-medium">Nenhuma obra anterior encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você ainda não tem referências em outras obras para reutilizar.
              </p>
            </div>
          )}

          {!loading && books.length > 0 && totalFiltered === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma referência encontrada para "{search}".
            </p>
          )}

          {!loading && books.map((book) => {
            const bookRefs = filtered(book.refs)
            if (bookRefs.length === 0) return null
            const isExpanded  = expanded.has(book.id)
            const allSelected = bookRefs.every((r) => selected.has(r.id))
            const someSelected = bookRefs.some((r) => selected.has(r.id))

            return (
              <div key={book.id} className="rounded-xl border border-border overflow-hidden">
                {/* Book header */}
                <button
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-surface-muted/40 hover:bg-surface-muted/70 transition-colors text-left"
                  onClick={() => toggleExpand(book.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      className="shrink-0"
                      onClick={(e) => { e.stopPropagation(); toggleBook(book) }}
                    >
                      {allSelected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : someSelected
                        ? <CheckSquare className="h-4 w-4 text-primary/50" />
                        : <Square className="h-4 w-4 text-muted-foreground/50" />
                      }
                    </button>
                    <span className="font-medium text-foreground text-sm truncate">{book.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({bookRefs.length} ref.)
                    </span>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* Refs list */}
                {isExpanded && (
                  <div className="divide-y divide-border/50">
                    {bookRefs.map((ref) => {
                      const isSelected  = selected.has(ref.id)
                      const isDisabled  = !isSelected && selected.size >= available
                      const hasChunks   = ref.chunkCount > 0

                      return (
                        <button
                          key={ref.id}
                          onClick={() => !isDisabled && toggleRef(ref.id)}
                          disabled={isDisabled}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                            isSelected
                              ? 'bg-primary/8'
                              : isDisabled
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-surface-muted/30'
                          )}
                        >
                          {/* Checkbox */}
                          <span className="shrink-0 mt-0.5">
                            {isSelected
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-muted-foreground/40" />
                            }
                          </span>

                          {/* Metadata */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-snug">
                              {ref.title}
                            </p>
                            {ref.authors && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{ref.authors}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {ref.year && (
                                <span className="text-xs text-muted-foreground/70">{ref.year}</span>
                              )}
                              {hasChunks ? (
                                <span className="text-xs text-success bg-success-muted px-1.5 py-0.5 rounded-full">
                                  {ref.chunkCount} chunk{ref.chunkCount !== 1 ? 's' : ''} prontos
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 bg-surface-muted px-1.5 py-0.5 rounded-full">
                                  Sem chunks
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="px-6 py-2 text-sm text-danger bg-danger-muted border-t border-danger/20">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            loading={importing}
            disabled={selected.size === 0 || importing}
            className="gap-2"
          >
            <Import className="h-4 w-4" />
            Importar {selected.size > 0 ? `${selected.size} referência${selected.size > 1 ? 's' : ''}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
