import { Card, CardContent } from '@/components/ui/Card'
import { Library } from 'lucide-react'
import Link from 'next/link'

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header simples sem autenticação */}
      <header className="border-b border-zinc-800 bg-black/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="text-base font-bold tracking-tight text-white">
            BookGenerator
          </Link>
          <nav className="ml-4 flex items-center gap-4">
            <Link href="/library" className="text-sm text-zinc-300">
              Biblioteca
            </Link>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-200">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Biblioteca Pública</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Explore obras acadêmicas e literárias geradas com IA
            </p>
          </div>

          {/* Placeholder — será populado na Fase 7 */}
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Library className="mb-4 h-12 w-12 text-zinc-600" />
            <p className="mb-1 font-medium text-zinc-300">Biblioteca em breve</p>
            <p className="text-sm text-zinc-500 max-w-sm">
              As obras publicadas pelos autores aparecerão aqui. Cadastre-se para publicar a sua.
            </p>
          </Card>
        </div>
      </main>
    </div>
  )
}
