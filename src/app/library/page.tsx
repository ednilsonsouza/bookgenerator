import Link from 'next/link'
import { Library, BookOpen, Download } from 'lucide-react'

interface LibraryItem {
  $id: string
  title: string
  authorName: string
  summary: string
  downloadCount: number
  readCount: number
  publishedAt: string
  coverFileId?: string
  pdfFileId?: string
}

async function getLibraryItems(): Promise<{ items: LibraryItem[]; total: number }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/library?limit=24`, { cache: 'no-store' })
    if (!res.ok) return { items: [], total: 0 }
    return res.json()
  } catch {
    return { items: [], total: 0 }
  }
}

export default async function LibraryPage() {
  const { items, total } = await getLibraryItems()

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="text-base font-bold tracking-tight text-foreground shrink-0">
            BookGenerator
          </Link>
          <nav className="flex items-center gap-4 flex-1">
            <Link href="/library" className="text-sm text-foreground">Biblioteca</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm text-muted-foreground hover:text-foreground transition-colors">Entrar</Link>
            <Link href="/register" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors">Criar conta</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Biblioteca Pública</h1>
          <p className="mt-2 text-muted-foreground">
            {total > 0
              ? `${total} obra${total > 1 ? 's' : ''} publicada${total > 1 ? 's' : ''} — leitura e download gratuitos`
              : 'Obras acadêmicas e literárias geradas com IA'}
          </p>
        </div>

        {/* Vazia */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Library className="mb-4 h-14 w-14 text-border" />
            <p className="text-lg font-medium text-foreground/80 mb-2">Biblioteca ainda vazia</p>
            <p className="text-sm text-muted-foreground/70 max-w-sm mb-6">
              Crie uma obra, gere o conteúdo e publique aqui para que outros possam ler.
            </p>
            <Link href="/register" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors">
              Começar agora
            </Link>
          </div>
        )}

        {/* Grid */}
        {items.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <Link
                key={item.$id}
                href={`/library/${item.$id}`}
                className="group flex flex-col rounded-xl border border-border bg-surface/50 overflow-hidden hover:border-border-strong transition-colors"
              >
                {/* Capa */}
                <div className="h-48 bg-surface-muted flex items-center justify-center overflow-hidden">
                  {item.coverFileId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/covers/${item.coverFileId}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-12 w-12 text-muted-foreground/60" />
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-2 p-4 flex-1">
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground/70">{item.authorName}</p>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-3 flex-1">{item.summary}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/60 mt-1">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {item.downloadCount ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {item.readCount ?? 0} leituras
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground/60 mt-16">
        BookGenerator — Geração de obras com IA
      </footer>
    </div>
  )
}

