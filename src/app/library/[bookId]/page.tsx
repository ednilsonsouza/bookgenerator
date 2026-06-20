import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '@/lib/appwrite/config'
import { Query } from 'node-appwrite'
import { Download, BookOpen, ArrowLeft, Calendar, User } from 'lucide-react'

interface Props { params: Promise<{ bookId: string }> }

async function getItem(bookId: string) {
  try {
    const { databases } = createAdminClient()
    // bookId aqui é o $id do library_item
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, [
      Query.equal('$id', bookId),
      Query.limit(1),
    ])
    if (res.total === 0) return null
    return res.documents[0] as Record<string, unknown>
  } catch {
    return null
  }
}

export default async function LibraryBookPage({ params }: Props) {
  const { bookId } = await params
  const item = await getItem(bookId)
  if (!item) notFound()

  const coverUrl = item.coverFileId
    ? `${APPWRITE_ENDPOINT}/storage/buckets/covers/files/${item.coverFileId}/view?project=${APPWRITE_PROJECT_ID}`
    : null

  const pdfDownloadUrl = item.pdfFileId
    ? `${APPWRITE_ENDPOINT}/storage/buckets/exports/files/${item.pdfFileId}/download?project=${APPWRITE_PROJECT_ID}`
    : null

  const publishedDate = item.publishedAt
    ? new Date(item.publishedAt as string).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <header className="border-b border-zinc-800 bg-black/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="text-base font-bold tracking-tight text-white shrink-0">BookGenerator</Link>
          <Link href="/library" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Biblioteca</Link>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login"    className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Entrar</Link>
            <Link href="/register" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-200 transition-colors">Criar conta</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Voltar */}
        <Link href="/library" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar à biblioteca
        </Link>

        <div className="grid gap-8 sm:grid-cols-[200px_1fr]">
          {/* Capa */}
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt={item.title as string} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="h-16 w-16 text-zinc-700" />
              )}
            </div>

            {pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </a>
            )}
          </div>

          {/* Detalhes */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 leading-tight">{item.title as string}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {item.authorName as string}
                </span>
                {publishedDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {publishedDate}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  {(item.downloadCount as number) ?? 0} downloads
                </span>
              </div>
            </div>

            {(item.summary as string) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-sm font-medium text-zinc-300 mb-2">Sobre a obra</p>
                <p className="text-zinc-400 leading-relaxed text-sm">{item.summary as string}</p>
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4">
              <p className="text-xs text-zinc-500">
                Esta obra foi gerada com inteligência artificial usando o BookGenerator.
                O conteúdo é de responsabilidade do autor.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {pdfDownloadUrl && (
                <a
                  href={pdfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF gratuito
                </a>
              )}
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 transition-colors"
              >
                Criar minha obra
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600 mt-16">
        BookGenerator — Geração de obras com IA
      </footer>
    </div>
  )
}
