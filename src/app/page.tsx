import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { BookOpen, Wand2, FileText, Library } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <span className="text-base font-bold tracking-tight text-white">BookGenerator</span>
          <div className="flex items-center gap-3">
            <Link href="/library" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Biblioteca
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400 mb-6">
          <Wand2 className="h-3 w-3" />
          GPT-4o mini • Geração por capítulos • ABNT
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-5 leading-tight">
          Gere obras extensas
          <br />
          <span className="text-zinc-400">com inteligência artificial</span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
          Crie monografias, teses, romances e muito mais. A IA gera capítulo por capítulo, com
          citações ABNT rastreáveis para obras acadêmicas. Exporte em PDF profissional.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Começar gratuitamente</Button>
          </Link>
          <Link href="/library">
            <Button variant="secondary" size="lg">
              Ver biblioteca
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                <f.icon className="h-4 w-4 text-zinc-300" />
              </div>
              <h3 className="font-semibold text-zinc-100 mb-1">{f.title}</h3>
              <p className="text-sm text-zinc-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        BookGenerator — Geração de obras com IA
      </footer>
    </div>
  )
}

const features = [
  {
    icon: Wand2,
    title: 'Plano de escrita',
    description: 'A IA gera um plano de capítulos editável antes de escrever a obra.',
  },
  {
    icon: BookOpen,
    title: 'Geração longa',
    description: 'Obras de até 120 páginas geradas por capítulos, sem timeout.',
  },
  {
    icon: FileText,
    title: 'Citações ABNT',
    description: 'Para obras acadêmicas, cada parágrafo cita as referências que você anexou.',
  },
  {
    icon: Library,
    title: 'Biblioteca pública',
    description: 'Publique sua obra e compartilhe com o mundo gratuitamente.',
  },
]
