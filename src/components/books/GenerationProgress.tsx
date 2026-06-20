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
  pending:    { icon: Clock,        label: 'Aguardando', classes: 'text-zinc-500 bg-zinc-800/40 border-zinc-700' },
  generating: { icon: Loader2,      label: 'Gerando…',  classes: 'text-yellow-400 bg-yellow-900/20 border-yellow-800 animate-pulse' },
  completed:  { icon: CheckCircle2, label: 'Concluído', classes: 'text-emerald-400 bg-emerald-900/20 border-emerald-800' },
  failed:     { icon: AlertCircle,  label: 'Falhou',    classes: 'text-red-400 bg-red-900/20 border-red-800' },
}

export function GenerationProgress({ chapters, progress, currentStep, isRunning }: GenerationProgressProps) {
  return (
    <div className="space-y-4">
      {/* Barra de progresso global */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-300 font-medium">
            {progress === 100 ? 'Geração concluída!' : isRunning ? currentStep || 'Gerando...' : 'Aguardando início'}
          </span>
          <span className="text-zinc-500 font-mono">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-500',
              progress === 100 ? 'bg-emerald-500' : isRunning ? 'bg-white' : 'bg-zinc-600'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-zinc-600">
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
