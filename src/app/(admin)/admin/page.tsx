'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Users, BookOpen, Library, BarChart3, DollarSign, Layers, FileText, Cpu } from 'lucide-react'

interface Stats {
  users: number
  books: number
  statusCounts: Record<string, number>
  completedJobs: number
  library: number
  chunks: number
  sections: number
  estimatedCostUSD: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', plan_pending: 'Ag. plano', plan_ready: 'Plano pronto',
  generating: 'Gerando', review: 'Em revisão', completed: 'Concluída',
  published: 'Publicada', failed: 'Falha',
}

export default function AdminPage() {
  const { user }     = useAuth()
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetch('/api/admin/stats', { headers: { 'x-user-id': user.$id } })
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Painel Administrativo</h1>
        <p className="mt-1 text-sm text-zinc-400">Visão geral da plataforma</p>
      </div>

      {/* Métricas principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users}    label="Usuários"      value={stats?.users ?? 0}    href="/admin/users" />
        <MetricCard icon={BookOpen} label="Obras"         value={stats?.books ?? 0}    href="/admin/books" />
        <MetricCard icon={Library}  label="Na biblioteca" value={stats?.library ?? 0}  href="/admin/library" />
        <MetricCard icon={DollarSign} label="Custo IA estimado" value={stats?.estimatedCostUSD ?? '$0'} href="/admin/usage" isString />
      </div>

      {/* Stats secundárias */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox icon={Cpu}      label="Jobs concluídos"  value={stats?.completedJobs ?? 0} />
        <StatBox icon={Layers}   label="Chunks indexados" value={stats?.chunks ?? 0} />
        <StatBox icon={FileText} label="Seções geradas"   value={stats?.sections ?? 0} />
      </div>

      {/* Status das obras */}
      {stats?.statusCounts && Object.keys(stats.statusCounts).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Distribuição por status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.statusCounts).map(([s, count]) => (
                <div key={s} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <span className="text-sm text-zinc-300">{STATUS_LABELS[s] ?? s}</span>
                  <span className="text-sm font-bold text-zinc-100">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Atalhos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/admin/users',   icon: Users,    label: 'Usuários',   desc: 'Gerenciar contas' },
          { href: '/admin/books',   icon: BookOpen, label: 'Obras',      desc: 'Todos os projetos' },
          { href: '/admin/library', icon: Library,  label: 'Biblioteca', desc: 'Moderar publicações' },
          { href: '/admin/usage',   icon: BarChart3, label: 'Uso IA',    desc: 'Métricas e custos' },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="h-full cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-900">
              <CardContent className="pt-5">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                  <Icon className="h-4 w-4 text-zinc-300" />
                </div>
                <p className="font-semibold text-zinc-100">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, href, isString = false }: {
  icon: React.ElementType; label: string; value: number | string; href: string; isString?: boolean
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-900">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-400">{label}</p>
            <div className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-zinc-800">
              <Icon className="h-4 w-4 text-zinc-300" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {isString ? value : (value as number).toLocaleString('pt-BR')}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
      <div className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg bg-zinc-800">
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <div>
        <p className="text-lg font-bold text-zinc-100">{value.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}
