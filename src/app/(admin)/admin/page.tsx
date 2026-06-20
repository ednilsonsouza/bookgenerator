import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Users, BookOpen, Library, BarChart3 } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Painel Administrativo</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Gerencie usuários, obras, biblioteca e métricas de uso
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users">
          <Card className="h-full cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-900">
            <CardHeader>
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                <Users className="h-5 w-5 text-zinc-300" />
              </div>
              <CardTitle>Usuários</CardTitle>
              <CardDescription>Gerenciar contas e permissões</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/books">
          <Card className="h-full cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-900">
            <CardHeader>
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                <BookOpen className="h-5 w-5 text-zinc-300" />
              </div>
              <CardTitle>Obras</CardTitle>
              <CardDescription>Visualizar todos os projetos</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/library">
          <Card className="h-full cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-900">
            <CardHeader>
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                <Library className="h-5 w-5 text-zinc-300" />
              </div>
              <CardTitle>Biblioteca</CardTitle>
              <CardDescription>Moderar publicações públicas</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/usage">
          <Card className="h-full cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-900">
            <CardHeader>
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                <BarChart3 className="h-5 w-5 text-zinc-300" />
              </div>
              <CardTitle>Uso de IA</CardTitle>
              <CardDescription>Métricas e custos por usuário</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
