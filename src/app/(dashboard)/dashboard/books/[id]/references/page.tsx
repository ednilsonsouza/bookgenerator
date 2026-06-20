'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getBookProject } from '@/lib/appwrite/database'
import type { BookProject } from '@/types/book'
import type { Reference, ReferenceStatus } from '@/lib/appwrite/references'
import { ReferenceUploadForm } from '@/components/forms/ReferenceUploadForm'
import { ReferenceStatusBadge } from '@/components/books/ReferenceStatusBadge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, BookOpen, Plus, Trash2, RefreshCw,
  AlertTriangle, CheckCircle2, FileText,
} from 'lucide-react'

const MIN_REFS = 5
const MAX_REFS = 30

export default function ReferencesPage() {
  const { id: bookId } = useParams<{ id: string }>()
  const { user }       = useAuth()
  const router         = useRouter()

  const [book, setBook]         = useState<BookProject | null>(null)
  const [refs, setRefs]         = useState<(Reference & { chunkCount?: number })[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]       = useState('')

  const loadRefs = useCallback(async () => {
    if (!bookId) return
    const res = await fetch(`/api/books/${bookId}/references`)
    if (!res.ok) return
    const data = await res.json()
    setRefs(
      data.references.map((r: Record<string, unknown>) => ({
        id:                     r.$id as string,
        bookProjectId:          bookId,
        fileId:                 r.fileId as string | undefined,
        title:                  r.title as string,
        authors:                r.authors as string,
        year:                   r.year as string,
        publisher:              r.publisher as string,
        extractedTextStatus:    r.extractedTextStatus as ReferenceStatus,
        citationKey:            r.citationKey as string,
        abntFormattedReference: r.abntFormattedReference as string,
        chunkCount:             r.chunkCount as number,
      }))
    )
  }, [bookId])

  useEffect(() => {
    if (!bookId || !user) return
    async function init() {
      try {
        const b = await getBookProject(bookId)
        if (!b || b.userId !== user!.$id) { router.push('/dashboard/books'); return }
        setBook(b)
        await loadRefs()
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [bookId, user, router, loadRefs])

  // Polling para referências em processamento
  useEffect(() => {
    const processing = refs.some((r) => r.extractedTextStatus === 'processing')
    if (!processing) return
    const interval = setInterval(loadRefs, 4000)
    return () => clearInterval(interval)
  }, [refs, loadRefs])

  async function handleDelete(refId: string) {
    if (!confirm('Remover esta referência e seus dados de processamento?')) return
    setDeletingId(refId)
    try {
      await fetch(`/api/books/${bookId}/references`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ referenceId: refId }),
      })
      await loadRefs()
    } catch {
      setError('Erro ao remover.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReprocess(refId: string) {
    if (!user) return
    setRefs((prev) =>
      prev.map((r) => r.id === refId ? { ...r, extractedTextStatus: 'processing' } : r)
    )
    await fetch(`/api/books/${bookId}/references/${refId}/process`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: user.$id }),
    })
    await loadRefs()
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const readyCount   = refs.filter((r) => r.extractedTextStatus === 'ready').length
  const meetsMinimum = refs.length >= MIN_REFS
  const atLimit      = refs.length >= MAX_REFS

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/dashboard/books/${bookId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          {book?.title ?? '...'}
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground/80">Referências</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Referências bibliográficas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mínimo {MIN_REFS} · Máximo {MAX_REFS} · Aceitos: PDF e TXT
          </p>
        </div>
        {!atLimit && (
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="gap-2 shrink-0"
            variant={showForm ? 'secondary' : 'primary'}
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cancelar' : 'Adicionar'}
          </Button>
        )}
      </div>

      {/* Barra de progresso */}
      <Card className={cn(
        'border',
        meetsMinimum ? 'border-success/30' : 'border-warning/30'
      )}>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground/80">
              {refs.length} de {MIN_REFS} mínimas adicionadas
            </span>
            <span className={cn('text-sm font-medium', meetsMinimum ? 'text-success' : 'text-warning')}>
              {meetsMinimum
                ? <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Mínimo atingido</span>
                : `Faltam ${MIN_REFS - refs.length}`}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-muted">
            <div
              className={cn('h-1.5 rounded-full transition-all', meetsMinimum ? 'bg-emerald-500' : 'bg-yellow-500')}
              style={{ width: `${Math.min((refs.length / MIN_REFS) * 100, 100)}%` }}
            />
          </div>
          {readyCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground/70">
              {readyCount} referência{readyCount > 1 ? 's' : ''} processada{readyCount > 1 ? 's' : ''} · pronta{readyCount > 1 ? 's' : ''} para geração
            </p>
          )}
        </CardContent>
      </Card>

      {/* Formulário de adição */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova referência</CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceUploadForm
              bookId={bookId}
              userId={user!.$id}
              onSuccess={async () => { setShowForm(false); await loadRefs() }}
            />
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-danger bg-danger-muted border border-danger/30 rounded-md px-4 py-2">
          {error}
        </p>
      )}

      {/* Aviso mínimo */}
      {!meetsMinimum && refs.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-muted px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-300">
            Adicione pelo menos {MIN_REFS - refs.length} referência{MIN_REFS - refs.length > 1 ? 's' : ''} antes de gerar o plano de escrita.
          </p>
        </div>
      )}

      {/* Lista de referências */}
      {refs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="font-medium text-foreground/80 mb-1">Nenhuma referência adicionada</p>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Adicione de {MIN_REFS} a {MAX_REFS} referências. Você pode incluir apenas os metadados
            ou também o arquivo PDF/TXT para extração e RAG.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {refs.map((ref, idx) => (
            <Card key={ref.id} className="hover:border-border-strong transition-colors">
              <CardContent>
                <div className="flex items-start gap-3">
                  {/* Número */}
                  <span className="shrink-0 mt-0.5 text-xs font-mono text-muted-foreground/60 w-5 text-right">
                    {idx + 1}
                  </span>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-foreground text-sm leading-snug">{ref.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ReferenceStatusBadge status={ref.extractedTextStatus} />
                      </div>
                    </div>

                    {ref.authors && (
                      <p className="text-xs text-muted-foreground mb-0.5">{ref.authors}</p>
                    )}
                    {(ref.year || ref.publisher) && (
                      <p className="text-xs text-muted-foreground/70">
                        {[ref.year, ref.publisher].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    {ref.abntFormattedReference && (
                      <p className="mt-1.5 text-xs text-muted-foreground/60 italic line-clamp-2">
                        {ref.abntFormattedReference}
                      </p>
                    )}

                    {ref.chunkCount != null && ref.chunkCount > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        {ref.chunkCount} trecho{ref.chunkCount > 1 ? 's' : ''} indexado{ref.chunkCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    {ref.fileId && ref.extractedTextStatus !== 'processing' && (
                      <button
                        title="Reprocessar"
                        onClick={() => handleReprocess(ref.id)}
                        className="p-1.5 rounded text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      title="Remover"
                      onClick={() => handleDelete(ref.id)}
                      disabled={deletingId === ref.id}
                      className="p-1.5 rounded text-muted-foreground/60 hover:text-danger transition-colors disabled:opacity-40"
                    >
                      {deletingId === ref.id
                        ? <Spinner size="sm" className="h-3.5 w-3.5" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CTA próximo passo */}
      {meetsMinimum && (
        <div className="flex justify-end">
          <Link href={`/dashboard/books/${bookId}/plan`}>
            <Button className="gap-2">
              <BookOpen className="h-4 w-4" />
              Ir para o plano de escrita
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
