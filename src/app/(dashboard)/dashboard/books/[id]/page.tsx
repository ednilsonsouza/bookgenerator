'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getBookProject, deleteBookProject } from '@/lib/appwrite/database'
import type { BookProject } from '@/types/book'
import { ACADEMIC_SUBTYPE_LABELS, LITERARY_GENRE_LABELS } from '@/types/book'
import { BookStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import {
  ChevronLeft,
  BookOpen,
  Trash2,
  FileText,
  Upload,
  Wand2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [book, setBook] = useState<BookProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getBookProject(id)
      .then((b) => {
        if (!b) { router.push('/dashboard/books'); return }
        // Segurança: impede acesso de outro usuário
        if (b.userId !== user?.$id) { router.push('/dashboard/books'); return }
        setBook(b)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, user, router])

  async function handleDelete() {
    if (!book || !confirm('Tem certeza que deseja excluir esta obra?')) return
    setDeleting(true)
    try {
      await deleteBookProject(book.id)
      router.push('/dashboard/books')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!book) return null

  const subtype =
    book.type === 'academic' && book.academicSubtype
      ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype]
      : book.type === 'literary' && book.literaryGenre
      ? LITERARY_GENRE_LABELS[book.literaryGenre]
      : null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/books"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Minhas obras
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-sm text-zinc-300 line-clamp-1 max-w-xs">{book.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-zinc-100">{book.title}</h1>
            <BookStatusBadge status={book.status} />
          </div>
          {subtype && <p className="text-sm text-zinc-400">{subtype}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            loading={deleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Detalhes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">Sobre a obra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Tema" value={book.theme} />
            <Row label="Tipo" value={book.type === 'academic' ? 'Acadêmica' : 'Literária'} />
            {subtype && <Row label={book.type === 'academic' ? 'Subtipo' : 'Gênero'} value={subtype} />}
            <Row label="Páginas" value={`${book.targetPages} páginas`} />
            <Row label="Visibilidade" value={book.visibility === 'public' ? 'Pública' : 'Privada'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Criada em" value={formatDate(book.createdAt)} />
            <Row label="Atualizada" value={formatDate(book.updatedAt)} />
          </CardContent>
        </Card>
      </div>

      {/* Descrição */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-400">Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-300 leading-relaxed">{book.description}</p>
        </CardContent>
      </Card>

      {/* Próximas etapas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-100">Próximas etapas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {book.type === 'academic' && (
            <Step
              icon={<Upload className="h-4 w-4" />}
              label="Adicionar referências bibliográficas"
              description="Upload de 5 a 30 PDFs ou arquivos de texto"
              href={`/dashboard/books/${book.id}/references`}
              done={false}
            />
          )}
          <Step
            icon={<Wand2 className="h-4 w-4" />}
            label="Gerar plano de escrita"
            description="A IA criará estrutura de capítulos para sua obra"
            href={`/dashboard/books/${book.id}/plan`}
            done={['plan_ready', 'generating', 'review', 'completed', 'published'].includes(book.status)}
          />
          <Step
            icon={<BookOpen className="h-4 w-4" />}
            label="Gerar obra completa"
            description="Geração capítulo por capítulo, sem timeout"
            href={`/dashboard/books/${book.id}/generate`}
            done={['review', 'completed', 'published'].includes(book.status)}
          />
          <Step
            icon={<FileText className="h-4 w-4" />}
            label="Exportar PDF"
            description="Gere o livro final formatado"
            href={`/dashboard/books/${book.id}/export`}
            done={book.status === 'completed' || book.status === 'published'}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-200 text-right">{value}</span>
    </div>
  )
}

function Step({
  icon,
  label,
  description,
  href,
  done,
}: {
  icon: React.ReactNode
  label: string
  description: string
  href: string
  done: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border border-zinc-800 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50 group"
    >
      <div
        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
          done ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium group-hover:text-white ${done ? 'text-zinc-300' : 'text-zinc-200'}`}>{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5 group-hover:text-zinc-400 transition-colors" />
    </Link>
  )
}
