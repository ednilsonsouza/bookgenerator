'use client'

import { useState } from 'react'
import { savePlanEdits } from '@/lib/appwrite/writingPlan'
import type { Chapter, WritingPlan } from '@/types/book'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import {
  ChevronUp,
  ChevronDown,
  Save,
  BookOpen,
  GripVertical,
  FileText,
} from 'lucide-react'

interface EditableChapter extends Chapter {
  dirty?: boolean
}

interface WritingPlanEditorProps {
  plan: WritingPlan
  onSaved?: (chapters: Chapter[]) => void
  onGenerateBook?: () => void
}

export function WritingPlanEditor({ plan, onSaved, onGenerateBook }: WritingPlanEditorProps) {
  const [chapters, setChapters] = useState<EditableChapter[]>(
    [...plan.chapters].sort((a, b) => a.order - b.order)
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalPages = chapters.reduce((s, c) => s + c.targetPages, 0)

  function updateChapter(id: string, field: keyof EditableChapter, value: string | number) {
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value, dirty: true } : c))
    )
    setSaved(false)
  }

  function moveChapter(id: string, direction: 'up' | 'down') {
    setChapters((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      if (direction === 'up' && idx === 0) return prev
      if (direction === 'down' && idx === prev.length - 1) return prev

      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]

      // Reordena os números de ordem
      return next.map((c, i) => ({ ...c, order: i + 1, dirty: true }))
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await savePlanEdits(
        plan.id,
        plan.bookProjectId,
        chapters.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description ?? '',
          order: c.order,
          targetPages: c.targetPages,
        }))
      )
      setSaved(true)
      setChapters((prev) => prev.map((c) => ({ ...c, dirty: false })))
      onSaved?.(chapters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho do editor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {chapters.length} capítulos •{' '}
            <span className={cn(totalPages === plan.chapters.reduce((s,c)=>s+c.targetPages,0) ? 'text-muted-foreground' : 'text-yellow-400')}>
              {totalPages} págs. no total
            </span>
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Edite títulos, descrições e reordene capítulos antes de gerar a obra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saved ? 'Salvo' : 'Salvar edições'}
          </Button>
          {onGenerateBook && (
            <Button size="sm" onClick={onGenerateBook} className="gap-2">
              <BookOpen className="h-4 w-4" />
              Gerar obra
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Lista de capítulos */}
      <div className="space-y-2">
        {chapters.map((chapter, idx) => (
          <div
            key={chapter.id}
            className={cn(
              'rounded-xl border bg-surface-muted/60 transition-colors',
              chapter.dirty ? 'border-yellow-800/60' : 'border-border',
              expandedId === chapter.id && 'border-border'
            )}
          >
            {/* Linha do capítulo */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Número */}
              <span className="shrink-0 w-6 text-center text-xs font-mono text-muted-foreground/60 select-none">
                {chapter.order}
              </span>

              {/* Grip visual */}
              <GripVertical className="h-4 w-4 shrink-0 text-border" />

              {/* Título clicável para expandir */}
              <button
                type="button"
                className="flex-1 text-left text-sm font-medium text-foreground hover:text-foreground transition-colors truncate"
                onClick={() =>
                  setExpandedId(expandedId === chapter.id ? null : chapter.id)
                }
              >
                {chapter.title || <span className="text-muted-foreground/70 italic">Sem título</span>}
              </button>

              {/* Páginas */}
              <span className="shrink-0 text-xs text-muted-foreground/70 hidden sm:block">
                {chapter.targetPages} págs.
              </span>

              {/* Ações de ordem */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveChapter(chapter.id, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded text-muted-foreground/60 hover:text-foreground/80 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveChapter(chapter.id, 'down')}
                  disabled={idx === chapters.length - 1}
                  className="p-1 rounded text-muted-foreground/60 hover:text-foreground/80 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Painel de edição expandido */}
            {expandedId === chapter.id && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                <Input
                  label="Título do capítulo"
                  value={chapter.title}
                  onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                  placeholder="Título do capítulo..."
                />
                <Textarea
                  label="Descrição / objetivo"
                  value={chapter.description ?? ''}
                  onChange={(e) => updateChapter(chapter.id, 'description', e.target.value)}
                  placeholder="O que deve ser abordado neste capítulo..."
                  rows={3}
                />
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <Input
                      label="Páginas"
                      type="number"
                      min={1}
                      max={60}
                      value={chapter.targetPages}
                      onChange={(e) =>
                        updateChapter(chapter.id, 'targetPages', Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="pt-5 text-xs text-muted-foreground/70">
                    ≈ {chapter.targetPages * 300} palavras
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/30 px-4 py-3 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground/70 shrink-0" />
        <span className="text-muted-foreground">
          Total: <span className="text-foreground font-medium">{totalPages} páginas</span>
          {' · '}
          <span className="text-foreground font-medium">
            {chapters.reduce((s, c) => s + c.targetPages * 300, 0).toLocaleString('pt-BR')}
          </span>{' '}
          palavras estimadas
        </span>
      </div>
    </div>
  )
}
