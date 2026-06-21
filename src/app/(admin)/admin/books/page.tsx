'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { BookStatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { BookStatus } from '@/types/book'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

interface AdminBook {
  id: string
  title: string
  type: string
  status: BookStatus
  visibility: string
  chapterCount: number
  authorEmail: string
  createdAt: string
}

const PAGE_SIZE = 25
const STATUSES = ['', 'draft', 'plan_ready', 'generating', 'review', 'completed', 'published', 'failed'] as const
const STATUS_LABELS: Record<string, string> = {
  '': 'Todos', draft: 'Rascunho', plan_ready: 'Plano pronto',
  generating: 'Gerando', review: 'Em revisão', completed: 'Concluída',
  published: 'Publicada', failed: 'Falha',
}

export default function AdminBooksPage() {
  const { user }   = useAuth()
  const [books, setBooks]       = useState<AdminBook[]>([])
  const [total, setTotal]       = useState(0)
  const [offset, setOffset]     = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading]   = useState(true)

  async function load(off = 0, status = statusFilter) {
    if (!user) return
    setLoading(true)
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) })
    if (status) params.set('status', status)
    const res = await fetch(`/api/admin/books?${params}`, { headers: { 'x-user-id': user.$id } })
    const data = await res.json()
    setBooks(data.books ?? [])
    setTotal(data.total ?? 0)
    setOffset(off)
    setLoading(false)
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStatusChange(s: string) {
    setStatusFilter(s)
    load(0, s)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Obras</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} obra{total !== 1 ? 's' : ''} no total</p>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-muted text-muted-foreground hover:bg-border'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Título', 'Tipo', 'Autor', 'Cap.', 'Status', 'Criada'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {books.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="px-4 py-3 text-foreground max-w-[200px] truncate font-medium">{b.title}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{b.type === 'academic' ? 'Acadêmica' : 'Literária'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{b.authorEmail}</td>
                      <td className="px-4 py-3 text-muted-foreground text-center">{b.chapterCount} cap.</td>
                      <td className="px-4 py-3"><BookStatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground/70">{formatDate(b.createdAt)}</td>
                    </tr>
                  ))}
                  {books.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground/70">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Nenhuma obra encontrada
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground/70">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => load(offset - PAGE_SIZE)} disabled={offset === 0 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => load(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total || loading}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

