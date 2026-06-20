'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getBookProject } from '@/lib/appwrite/database'
import { getWritingPlan } from '@/lib/appwrite/writingPlan'
import type { BookProject, WritingPlan } from '@/types/book'
import { WritingPlanEditor } from '@/components/books/WritingPlanEditor'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { BookStatusBadge } from '@/components/ui/Badge'
import { ChevronLeft, Wand2, RefreshCw, AlertCircle } from 'lucide-react'

type PageState = 'loading' | 'no_plan' | 'generating' | 'ready' | 'error'

export default function PlanPage() {
  const { id: bookId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()

  const [book, setBook] = useState<BookProject | null>(null)
  const [plan, setPlan] = useState<WritingPlan | null>(null)
  const [state, setState] = useState<PageState>('loading')
  const [error, setError] = useState('')

  // Carrega obra e plano ao montar
  useEffect(() => {
    if (!bookId || !user) return
    async function load() {
      try {
        const b = await getBookProject(bookId)
        if (!b || b.userId !== user!.$id) { router.push('/dashboard/books'); return }
        setBook(b)

        const p = await getWritingPlan(bookId)
        if (p) {
          setPlan(p)
          setState('ready')
        } else {
          setState('no_plan')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar.')
        setState('error')
      }
    }
    load()
  }, [bookId, user, router])

  async function generatePlan() {
    if (!book || !user) return
    setState('generating')
    setError('')
    try {
      const res = await fetch(`/api/books/${book.id}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.$id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar plano.')

      // Recarrega o plano salvo
      const refreshed = await getWritingPlan(book.id)
      if (refreshed) {
        setPlan(refreshed)
        setBook((prev) => prev ? { ...prev, status: 'plan_ready' } : prev)
      }
      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar plano.')
      setState(plan ? 'ready' : 'no_plan')
    }
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/books"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Minhas obras
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <Link
          href={`/dashboard/books/${bookId}`}
          className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px]"
        >
          {book?.title ?? '...'}
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground/80">Plano de escrita</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plano de escrita</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan
              ? 'Edite os capítulos conforme desejar antes de gerar a obra completa.'
              : 'Gere o plano para definir a estrutura da sua obra.'}
          </p>
        </div>
        {book && (
          <div className="flex items-center gap-2 shrink-0">
            <BookStatusBadge status={book.status} />
            {plan && (
              <Button
                variant="secondary"
                size="sm"
                onClick={generatePlan}
                loading={state === 'generating'}
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regerar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Estado: sem plano */}
      {(state === 'no_plan' || state === 'error') && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Wand2 className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <p className="mb-1 text-base font-medium text-foreground">Nenhum plano gerado ainda</p>
          <p className="mb-6 text-sm text-muted-foreground/70 max-w-sm">
            A IA vai gerar a estrutura de capítulos com base no tema, tipo e quantidade de páginas
            da sua obra.
          </p>
          <Button onClick={generatePlan} size="lg" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Gerar Plano de Escrita
          </Button>
        </Card>
      )}

      {/* Estado: gerando */}
      {state === 'generating' && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-base font-medium text-foreground">Gerando plano de escrita…</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            O GPT-4o mini está criando a estrutura de capítulos. Aguarde alguns instantes.
          </p>
        </Card>
      )}

      {/* Estado: plano pronto */}
      {state === 'ready' && plan && (
        <WritingPlanEditor
          plan={plan}
          onSaved={(chapters) => {
            setPlan((prev) => (prev ? { ...prev, chapters, status: 'edited' } : prev))
          }}
          onGenerateBook={() => router.push(`/dashboard/books/${bookId}/generate`)}
        />
      )}
    </div>
  )
}
