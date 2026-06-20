'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, Clock, AlertCircle, BookOpen } from 'lucide-react'

export type ChapterGenStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface ChapterGenState {
  id: string
  order: number
  title: string
  targetPages: number
  targetWords: number
  status: ChapterGenStatus
}

interface GenerationProgressProps {
  chapters: ChapterGenState[]
  progress: number       // 0-100
  currentStep: string
  isRunning: boolean
}

const statusConfig: Record<ChapterGenStatus, { icon: React.ElementType; label: string; classes: string }> = {
  pending:    { icon: Clock,        label: 'Aguardando', classes: 'text-muted-foreground/70 bg-surface-muted/40 border-border' },
  generating: { icon: Loader2,      label: 'Gerando…',  classes: 'text-warning bg-warning-muted border-warning/30 animate-pulse' },
  completed:  { icon: CheckCircle2, label: 'Concluído', classes: 'text-success bg-success-muted border-success/30' },
  failed:     { icon: AlertCircle,  label: 'Falhou',    classes: 'text-danger bg-danger-muted border-danger/30' },
}

export function GenerationProgress({ chapters, progress, currentStep, isRunning }: GenerationProgressProps) {
  return (
    <div className="space-y-4">
      {/* Barra de progresso global */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/80 font-medium">
            {progress === 100 ? 'Geração concluída!' : isRunning ? currentStep || 'Gerando...' : 'Aguardando início'}
          </span>
          <span className="text-muted-foreground/70 font-mono">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-500',
              progress === 100 ? 'bg-success' : isRunning ? 'bg-primary' : 'bg-muted-foreground/30'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground/60">
          {chapters.filter((c) => c.status === 'completed').length} de {chapters.length} capítulos concluídos
        </p>
      </div>

      {/* Lista de capítulos */}
      <div className="space-y-2">
        {chapters.map((chapter) => {
          const { icon: Icon, label, classes } = statusConfig[chapter.status]
          return (
            <div
              key={chapter.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all',
                classes
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', chapter.status === 'generating' && 'animate-spin')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {chapter.order}. {chapter.title}
                </p>
                <p className="text-xs opacity-60">
                  {chapter.targetPages} págs. · ~{chapter.targetWords.toLocaleString('pt-BR')} palavras
                </p>
              </div>
              <span className="text-xs opacity-60 shrink-0">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

