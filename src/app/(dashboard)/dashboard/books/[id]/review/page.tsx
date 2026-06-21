'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getBookProject } from '@/lib/appwrite/database'
import { listChapters } from '@/lib/appwrite/writingPlan'
import { getSectionsForChapter } from '@/lib/appwrite/generation'
import type { BookProject, Chapter } from '@/types/book'
import type { GeneratedSection } from '@/lib/appwrite/generation'
import { Spinner } from '@/components/ui/Spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, BookOpen, FileText, RotateCcw } from 'lucide-react'

interface ChapterWithContent extends Omit<Chapter, 'sections'> {
  sections: GeneratedSection[]
}

export default function ReviewPage() {
  const { id: bookId } = useParams<{ id: string }>()
  const { user }       = useAuth()
  const router         = useRouter()

  const [book, setBook]           = useState<BookProject | null>(null)
  const [chapters, setChapters]   = useState<ChapterWithContent[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())
  const [totalWords, setTotalWords] = useState(0)

  useEffect(() => {
    if (!bookId || !user) return
    async function load() {
      try {
        const b = await getBookProject(bookId)
        if (!b || b.userId !== user!.$id) { router.push('/dashboard/books'); return }
        setBook(b)

        const chs = await listChapters(bookId)
        const withContent: ChapterWithContent[] = await Promise.all(
          chs.map(async (ch) => {
            const sections = await getSectionsForChapter(ch.id)
            return { ...ch, sections }
          })
        )
        setChapters(withContent)

        // Total de palavras
        const total = withContent.reduce((acc, ch) => {
          const text = ch.sections.map((s) => s.content).join(' ')
          return acc + text.split(/\s+/).filter(Boolean).length
        }, 0)
        setTotalWords(total)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bookId, user, router])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandAll()   { setExpanded(new Set(chapters.map((c) => c.id))) }
  function collapseAll() { setExpanded(new Set()) }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const generatedChapters = chapters.filter((c) => c.sections.length > 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/dashboard/books/${bookId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          {book?.title ?? '...'}
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground/80">Revisão</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{book?.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {generatedChapters.length} capítulos gerados ·{' '}
            <span className="text-foreground/80">{totalWords.toLocaleString('pt-BR')} palavras</span>
            {' · '}~{Math.ceil(totalWords / 300)} páginas estimadas
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/dashboard/books/${bookId}/generate`}>
            <Button variant="secondary" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Regenerar
            </Button>
          </Link>
          <Link href={`/dashboard/books/${bookId}/export`}>
            <Button size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </Link>
        </div>
      </div>

      {/* Sem conteúdo */}
      {generatedChapters.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="font-medium text-foreground/80 mb-1">Nenhum capítulo gerado ainda</p>
          <Link href={`/dashboard/books/${bookId}/generate`} className="mt-3">
            <Button className="gap-2">
              <BookOpen className="h-4 w-4" />
              Ir para geração
            </Button>
          </Link>
        </Card>
      )}

      {/* Controles */}
      {generatedChapters.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground/70">
            Clique em um capítulo para ver o conteúdo gerado
          </p>
          <div className="flex gap-2">
            <button onClick={expandAll}   className="text-xs text-muted-foreground hover:text-foreground transition-colors">Expandir tudo</button>
            <span className="text-border">·</span>
            <button onClick={collapseAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Recolher tudo</button>
          </div>
        </div>
      )}

      {/* Capítulos */}
      <div className="space-y-3">
        {chapters.map((chapter) => {
          const isExpanded   = expanded.has(chapter.id)
          const hasContent   = chapter.sections.length > 0
          const fullText     = chapter.sections.map((s) => s.content).join('\n\n')
          const wordCount    = fullText.split(/\s+/).filter(Boolean).length
          const citations    = chapter.sections.flatMap((s) => {
            try { return JSON.parse(s.citations) as string[] } catch { return [] }
          })
          const uniqueCites  = [...new Set(citations)]

          return (
            <div
              key={chapter.id}
              className={cn(
                'rounded-xl border transition-colors',
                hasContent ? 'border-border bg-surface-muted/40' : 'border-border/50 bg-surface-muted/30 opacity-60'
              )}
            >
              {/* Cabeçalho do capítulo */}
              <button
                type="button"
                onClick={() => hasContent && toggleExpand(chapter.id)}
                disabled={!hasContent}
                className={cn(
                  'w-full flex items-center gap-3 px-5 py-4 text-left',
                  hasContent && 'hover:bg-surface-muted/50 transition-colors rounded-xl'
                )}
              >
                <span className="shrink-0 text-xs font-mono text-muted-foreground/60 w-5 text-right">
                  {chapter.order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium', hasContent ? 'text-foreground' : 'text-muted-foreground/70')}>
                    {chapter.title}
                  </p>
                  {hasContent && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {wordCount.toLocaleString('pt-BR')} palavras
                      {uniqueCites.length > 0 && ` · ${uniqueCites.length} cit.`}
                    </p>
                  )}
                </div>
                {hasContent && (
                  isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                )}
                {!hasContent && (
                  <span className="text-xs text-muted-foreground/60 shrink-0">Não gerado</span>
                )}
              </button>

              {/* Conteúdo expandido */}
              {isExpanded && hasContent && (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <div className="prose prose-invert prose-sm max-w-none">
                    {chapter.sections.map((section, si) => (
                      <div key={section.id} className={cn(si > 0 && 'mt-4')}>
                        {section.content.split('\n\n').map((para, pi) => (
                          <p key={pi} className="text-foreground/80 text-sm leading-relaxed mb-3 last:mb-0">
                            {para}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Citações do capítulo */}
                  {uniqueCites.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground/70 mb-1.5">Fontes citadas neste capítulo:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueCites.map((cite) => (
                          <span
                            key={cite}
                            className="inline-block rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-foreground/80"
                          >
                            {cite}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA exportação */}
      {generatedChapters.length > 0 && (
        <div className="flex justify-end pt-2">
          <Link href={`/dashboard/books/${bookId}/export`}>
            <Button size="lg" className="gap-2">
              <FileText className="h-4 w-4" />
              Exportar em PDF
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
