'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getBookProject, updateBookProject } from '@/lib/appwrite/database'
import { getFileDownloadUrl } from '@/lib/appwrite/client'
import type { BookProject } from '@/types/book'
import { CoverUploader } from '@/components/books/CoverUploader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { BUCKETS } from '@/lib/appwrite/config'
import {
  ChevronLeft, FileText, Download, BookOpen,
  Globe, CheckCircle2, AlertCircle,
} from 'lucide-react'

export default function ExportPage() {
  const { id: bookId } = useParams<{ id: string }>()
  const { user }       = useAuth()
  const router         = useRouter()

  const [book, setBook]         = useState<BookProject | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [authorName, setAuthorName] = useState('')

  useEffect(() => {
    if (!bookId || !user) return
    getBookProject(bookId).then((b) => {
      if (!b || b.userId !== user.$id) { router.push('/dashboard/books'); return }
      setBook(b)
      setAuthorName(user.name || user.email || 'Autor')
    }).finally(() => setLoading(false))
  }, [bookId, user, router])

  async function handleGeneratePdf() {
    if (!book || !user) return
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const res  = await fetch(`/api/books/${bookId}/export`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.$id, authorName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar PDF.')

      // Recarrega para pegar finalPdfFileId atualizado
      const updated = await getBookProject(bookId)
      if (updated) setBook(updated)
      setSuccess(`PDF gerado com sucesso! (${(data.sizeBytes / 1024).toFixed(0)} KB)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PDF.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCoverUploaded(fileId: string) {
    if (!book) return
    await updateBookProject(book.id, { coverFileId: fileId })
    setBook((prev) => prev ? { ...prev, coverFileId: fileId } : prev)
  }

  async function handleCoverRemoved() {
    if (!book) return
    await updateBookProject(book.id, { coverFileId: undefined })
    setBook((prev) => prev ? { ...prev, coverFileId: undefined } : prev)
  }

  async function handlePublish() {
    if (!book || !user) return
    setPublishing(true)
    setError('')
    try {
      const res  = await fetch(`/api/books/${bookId}/publish`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.$id, authorName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao publicar.')
      const updated = await getBookProject(bookId)
      if (updated) setBook(updated)
      setSuccess('Obra publicada na biblioteca pública!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar.')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!book)   return null

  const downloadUrl = book.finalPdfFileId
    ? getFileDownloadUrl(BUCKETS.EXPORTS, book.finalPdfFileId)
    : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/dashboard/books/${bookId}`} className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          {book.title}
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300">Exportar</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Exportar PDF</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Adicione uma capa, informe o nome do autor e gere o PDF final.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-800 bg-emerald-900/20 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {/* Configurações do PDF */}
      <Card>
        <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {/* Nome do autor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Nome do autor</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Seu nome completo"
              className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          {/* Capa */}
          <CoverUploader
            currentFileId={book.coverFileId}
            onUploaded={handleCoverUploaded}
            onRemoved={handleCoverRemoved}
          />
        </CardContent>
      </Card>

      {/* Gerar PDF */}
      <Card>
        <CardHeader><CardTitle>Gerar PDF</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            {book.type === 'academic'
              ? 'Template acadêmico: capa ABNT, folha de rosto, sumário, capítulos e referências bibliográficas.'
              : 'Template literário: capa, sumário e capítulos formatados.'}
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGeneratePdf}
              loading={generating}
              size="lg"
              className="gap-2 flex-1"
            >
              <FileText className="h-4 w-4" />
              {generating ? 'Gerando PDF…' : book.finalPdfFileId ? 'Regerar PDF' : 'Gerar PDF'}
            </Button>

            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                <Button variant="secondary" size="lg" className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Publicar na biblioteca */}
      <Card className="border-zinc-700">
        <CardHeader><CardTitle>Publicar na biblioteca pública</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Publique sua obra para que qualquer pessoa possa ler e baixar gratuitamente.
            Um resumo será gerado automaticamente pela IA.
          </p>
          {book.visibility === 'public' ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Já publicada na biblioteca
              <Link href="/library" className="underline hover:text-emerald-300 transition-colors ml-1">
                Ver biblioteca
              </Link>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={handlePublish}
              loading={publishing}
              className="gap-2"
              disabled={!book.finalPdfFileId}
            >
              <Globe className="h-4 w-4" />
              Publicar na biblioteca
            </Button>
          )}
          {!book.finalPdfFileId && (
            <p className="text-xs text-zinc-500">Gere o PDF antes de publicar.</p>
          )}
        </CardContent>
      </Card>

      {/* Link para revisão */}
      <div className="flex justify-start">
        <Link href={`/dashboard/books/${bookId}/review`}>
          <Button variant="ghost" className="gap-2 text-zinc-400">
            <BookOpen className="h-4 w-4" />
            Revisar conteúdo
          </Button>
        </Link>
      </div>
    </div>
  )
}
