'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { BookOpen, Plus, Library, Sparkles } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Autor'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie, edite e publique suas obras com inteligência artificial.
          </p>
        </div>
        <Link href="/dashboard/books/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova obra
          </Button>
        </Link>
      </div>

      {/* Cards de ação rápida */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/books/new" className="group block">
          <Card className="h-full transition-colors hover:border-border-strong hover:bg-surface-muted">
            <CardHeader>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5">
                <Plus className="h-5 w-5 text-foreground/80" />
              </div>
              <CardTitle>Nova obra</CardTitle>
              <CardDescription>
                Comece criando uma nova obra acadêmica ou literária
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/books" className="group block">
          <Card className="h-full transition-colors hover:border-border-strong hover:bg-surface-muted">
            <CardHeader>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5">
                <BookOpen className="h-5 w-5 text-foreground/80" />
              </div>
              <CardTitle>Minhas obras</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os seus projetos
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/library" className="group block">
          <Card className="h-full transition-colors hover:border-border-strong hover:bg-surface-muted">
            <CardHeader>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5">
                <Library className="h-5 w-5 text-foreground/80" />
              </div>
              <CardTitle>Biblioteca pública</CardTitle>
              <CardDescription>
                Explore obras publicadas por outros autores
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Banner informativo */}
      <Card className="border-border bg-gradient-to-r from-surface to-surface-muted/50">
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Como funciona</p>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>Crie um projeto informando tema, tipo e quantidade de páginas</li>
                <li>Para obras acadêmicas, faça upload de suas referências bibliográficas</li>
                <li>Gere o plano de escrita e edite os capítulos como preferir</li>
                <li>Solicite a geração completa — o sistema gera sem timeout</li>
                <li>Revise, adicione capa e exporte o PDF final</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

