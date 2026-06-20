'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getBookProject } from '@/lib/appwrite/database'
import type { BookProject } from '@/types/book'
import { GenerationProgress, type ChapterGenState } from '@/components/books/GenerationProgress'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { BookStatusBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { Wand2, ChevronLeft, BookOpen, AlertCircle, RotateCcw, Eye } from 'lucide-react'

type PageState = 'loading' | 'idle' | 'running' | 'completed' | 'error'

export default function GeneratePage() {
  const { id: bookId } = useParams<{ id: string }>()
  const { user }       = useAuth()
  const router         = useRouter()

  const [book, setBook]             = useState<BookProject | null>(null)
  const [pageState, setPageState]   = useState<PageState>('loading')
  const [chapters, setChapters]     = useState<ChapterGenState[]>([])
  const [progress, setProgress]     = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [jobId, setJobId]           = useState<string | null>(null)
  const [error, setError]           = useState('')
  const abortRef                    = useRef(false)

  // ── Carrega estado inicial ────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    if (!bookId) return
    const res  = await fetch(`/api/books/${bookId}/generate/status`)
    const data = await res.json()

    if (data.chapters?.length) {
      setChapters(
        data.chapters.map((c: Record<string, unknown>) => ({
          id:          c.id as string,
          order:       c.order as number,
          title:       c.title as string,
          targetPages: c.targetPages as number,
          targetWords: c.targetWords as number,
          status:      c.status as ChapterGenState['status'],
        }))
      )
      setProgress(data.progress ?? 0)
    }

    if (data.job) {
      setJobId(data.job.id)
      if (data.job.status === 'completed' || data.progress === 100) {
        setPageState('completed')
        setProgress(100)
      } else if (data.job.status === 'running') {
        // Job ativo mas página recarregada — mostra idle para retomar
        setPageState('idle')
      }
    }
  }, [bookId])

  useEffect(() => {
    if (!bookId || !user) return
    async function init() {
      try {
        const b = await getBookProject(bookId)
        if (!b || b.userId !== user!.$id) { router.push('/dashboard/books'); return }
        setBook(b)
        await loadStatus()
      } finally {
        setPageState((p) => p === 'loading' ? 'idle' : p)
      }
    }
    init()
  }, [bookId, user, router, loadStatus])

  // ── Orquestração client-side ──────────────────────────────────────────────
  async function startGeneration() {
    if (!user || !bookId) return
    setError('')
    abortRef.current = false
    setPageState('running')

    // 1. Inicia job no servidor
    const startRes = await fetch(`/api/books/${bookId}/generate/start`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: user.$id }),
    })
    const startData = await startRes.json()
    if (!startRes.ok) {
      setError(startData.error ?? 'Erro ao iniciar.')
      setPageState('idle')
      return
    }

    const currentJobId: string = startData.jobId
    setJobId(currentJobId)

    const pendingChapters: ChapterGenState[] = startData.chapters.map(
      (c: Record<string, unknown>) => ({
        id:          c.id as string,
        order:       c.order as number,
        title:       c.title as string,
        targetPages: c.targetPages as number,
        targetWords: c.targetWords as number,
        status:      (c.status === 'completed' ? 'completed' : 'pending') as ChapterGenState['status'],
      })
    )
    setChapters(pendingChapters)

    // 2. Gera capítulo a capítulo
    let lastContent = ''
    let completedCount = pendingChapters.filter((c) => c.status === 'completed').length

    for (const chapter of pendingChapters) {
      if (abortRef.current) break
      if (chapter.status === 'completed') { completedCount++; continue }

      // Marca como generating na UI
      setChapters((prev) =>
        prev.map((c) => c.id === chapter.id ? { ...c, status: 'generating' } : c)
      )
      setCurrentStep(`Gerando: ${chapter.title}...`)

      try {
        const res = await fetch(`/api/books/${bookId}/generate/chapter`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            userId:          user.$id,
            jobId:           currentJobId,
            chapterId:       chapter.id,
            previousContent: lastContent,
          }),
        })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error ?? 'Erro na geração.')

        lastContent = data.preview ?? ''
        completedCount++
        const newProgress = Math.round((completedCount / pendingChapters.length) * 100)
        setProgress(newProgress)

        setChapters((prev) =>
          prev.map((c) => c.id === chapter.id ? { ...c, status: 'completed' } : c)
        )
      } catch (err) {
        setChapters((prev) =>
          prev.map((c) => c.id === chapter.id ? { ...c, status: 'failed' } : c)
        )
        // Não aborta — tenta continuar com próximo capítulo
        console.error(`Capítulo ${chapter.title} falhou:`, err)
      }
    }

    // 3. Finaliza o job
    if (!abortRef.current) {
      const allDone = pendingChapters.every((c) => c.status === 'completed' || c.status === 'failed')
      const hasFailed = pendingChapters.some((c) => c.status === 'failed')
      const finalStatus = hasFailed ? 'completed' : 'completed'

      await fetch(`/api/books/${bookId}/generate/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId: currentJobId, status: finalStatus }),
      })

      setProgress(100)
      setCurrentStep('Geração concluída!')
      setPageState('completed')
      setBook((prev) => prev ? { ...prev, status: 'review' } : prev)
    }
  }

  function stopGeneration() {
    abortRef.current = true
    setPageState('idle')
    setCurrentStep('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/dashboard/books/${bookId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          {book?.title ?? '...'}
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground/80">Gerar obra</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Geração da obra</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada capítulo é gerado individualmente. Você pode pausar e retomar a qualquer momento.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {book && <BookStatusBadge status={book.status} />}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-muted px-4 py-3">
          <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Estado: idle sem capítulos */}
      {pageState === 'idle' && chapters.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Wand2 className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <p className="mb-1 text-base font-medium text-foreground">Pronto para gerar</p>
          <p className="mb-6 text-sm text-muted-foreground/70 max-w-sm">
            A IA vai escrever cada capítulo do plano. Para obras acadêmicas, usa as referências que você carregou.
          </p>
          <Button onClick={startGeneration} size="lg" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Iniciar geração
          </Button>
        </Card>
      )}

      {/* Estado: idle com capítulos (retomar) */}
      {pageState === 'idle' && chapters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {chapters.filter((c) => c.status === 'completed').length} de {chapters.length} capítulos gerados
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/dashboard/books/${bookId}/review`)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Revisar
              </Button>
              <Button onClick={startGeneration} size="sm" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {chapters.some((c) => c.status === 'failed') ? 'Regenerar falhas' : 'Continuar'}
              </Button>
            </div>
          </div>
          <GenerationProgress
            chapters={chapters}
            progress={progress}
            currentStep={currentStep}
            isRunning={false}
          />
        </div>
      )}

      {/* Estado: rodando */}
      {pageState === 'running' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={stopGeneration}>
              Pausar após capítulo atual
            </Button>
          </div>
          <GenerationProgress
            chapters={chapters}
            progress={progress}
            currentStep={currentStep}
            isRunning
          />
        </div>
      )}

      {/* Estado: concluído */}
      {pageState === 'completed' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-success/30 bg-success-muted px-5 py-4 flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-300">Obra gerada com sucesso!</p>
              <p className="text-sm text-success mt-0.5">
                Revise o conteúdo, adicione capa e exporte em PDF.
              </p>
            </div>
          </div>
          <GenerationProgress
            chapters={chapters}
            progress={100}
            currentStep="Geração concluída!"
            isRunning={false}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={startGeneration}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Regenerar
            </Button>
            <Link href={`/dashboard/books/${bookId}/review`}>
              <Button size="lg" className="gap-2">
                <Eye className="h-4 w-4" />
                Revisar obra
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
