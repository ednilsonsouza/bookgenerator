import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { Download, BookOpen, ArrowLeft, Calendar, User } from 'lucide-react'

// URLs de arquivo passam pelo proxy Next.js para evitar CORS/auth cross-origin
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
function proxyUrl(bucket: string, fileId: string, download = false) {
  return `${APP_URL}/api/files/${bucket}/${fileId}${download ? '?dl=1' : ''}`
}

interface Props { params: Promise<{ bookId: string }> }

async function getItem(bookId: string) {
  try {
    const { databases } = createAdminClient()
    // bookId é o $id do library_item — usa getDocument diretamente
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, bookId)
    return doc as Record<string, unknown>
  } catch {
    return null
  }
}

export default async function LibraryBookPage({ params }: Props) {
  const { bookId } = await params
  const item = await getItem(bookId)
  if (!item) notFound()

  const coverUrl       = item.coverFileId ? proxyUrl('covers',  item.coverFileId as string) : null
  const pdfDownloadUrl = item.pdfFileId   ? proxyUrl('exports', item.pdfFileId   as string, true) : null

  const publishedDate = item.publishedAt
    ? new Date(item.publishedAt as string).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="text-base font-bold tracking-tight text-foreground shrink-0">BookGenerator</Link>
          <Link href="/library" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Biblioteca</Link>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login"    className="text-sm text-muted-foreground hover:text-foreground transition-colors">Entrar</Link>
            <Link href="/register" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors">Criar conta</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Voltar */}
        <Link href="/library" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar à biblioteca
        </Link>

        <div className="grid gap-8 sm:grid-cols-[200px_1fr]">
          {/* Capa */}
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-[2/3] rounded-xl overflow-hidden border border-border bg-surface flex items-center justify-center">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt={item.title as string} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="h-16 w-16 text-border" />
              )}
            </div>

            {pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </a>
            )}
          </div>

          {/* Detalhes */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground leading-tight">{item.title as string}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
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
              <div className="rounded-xl border border-border bg-surface-muted/40 p-5">
                <p className="text-sm font-medium text-foreground/80 mb-2">Sobre a obra</p>
                <p className="text-muted-foreground leading-relaxed text-sm">{item.summary as string}</p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-surface-muted/30 px-5 py-4">
              <p className="text-xs text-muted-foreground/70">
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
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-4 py-2 text-sm text-foreground hover:bg-border transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF gratuito
                </a>
              )}
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                Criar minha obra
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground/60 mt-16">
        BookGenerator — Geração de obras com IA
      </footer>
    </div>
  )
}
