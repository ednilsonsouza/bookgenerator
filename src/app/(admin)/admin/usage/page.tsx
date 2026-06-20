'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { DollarSign, Cpu, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface JobUsage {
  jobId: string
  userEmail: string
  status: string
  chaptersCompleted: number
  sectionsGenerated: number
  chunksEmbedded: number
  estimatedCost: string
  createdAt: string
}

interface UsageData {
  jobs: JobUsage[]
  total: number
  totalCostUSD: string
  byUser: Array<{ email: string; jobs: number; cost: number }>
  pricing: {
    model: string
    inputPer1M: number
    outputPer1M: number
    embeddingPer1M: number
  }
}

const PAGE_SIZE = 30
const STATUS_COLORS: Record<string, string> = {
  completed: 'text-emerald-400', running: 'text-yellow-400',
  failed: 'text-red-400',       pending: 'text-zinc-400',
}

export default function AdminUsagePage() {
  const { user }   = useAuth()
  const [data, setData]       = useState<UsageData | null>(null)
  const [offset, setOffset]   = useState(0)
  const [loading, setLoading] = useState(true)

  async function load(off = 0) {
    if (!user) return
    setLoading(true)
    const res = await fetch(`/api/admin/usage?limit=${PAGE_SIZE}&offset=${off}`, {
      headers: { 'x-user-id': user.$id },
    })
    const d = await res.json()
    setData(d)
    setOffset(off)
    setLoading(false)
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Uso de IA</h1>
        <p className="mt-1 text-sm text-zinc-400">Estimativas baseadas nos tokens médios por operação.</p>
      </div>

      {/* Total de custo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-zinc-400">Custo total estimado</p>
              <DollarSign className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-3xl font-bold text-zinc-100">{data?.totalCostUSD ?? '$0'}</p>
            <p className="text-xs text-zinc-600 mt-1">
              {data?.pricing.model} · in ${data?.pricing.inputPer1M}/M · out ${data?.pricing.outputPer1M}/M
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-zinc-400">Jobs de geração</p>
              <Cpu className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-3xl font-bold text-zinc-100">{data?.total ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-zinc-400 mb-3">Por usuário (top)</p>
            <div className="space-y-2">
              {(data?.byUser ?? []).slice(0, 4).map((u) => (
                <div key={u.email} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 truncate max-w-[140px]">{u.email}</span>
                  <span className="text-xs text-zinc-200 font-medium shrink-0">
                    ${u.cost.toFixed(4)} · {u.jobs} job{u.jobs !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info sobre estimativas */}
      <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
        <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500">
          Estimativas calculadas com médias: {data?.pricing.inputPer1M ? `$${data.pricing.inputPer1M}` : ''}/M tokens input,
          {data?.pricing.outputPer1M ? ` $${data.pricing.outputPer1M}` : ''}/M output,
          {data?.pricing.embeddingPer1M ? ` $${data.pricing.embeddingPer1M}` : ''}/M embed.
          Valores reais podem variar. Consulte o dashboard da OpenAI para valores precisos.
        </p>
      </div>

      {/* Tabela de jobs */}
      <Card>
        <CardHeader><CardTitle>Jobs de geração</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Usuário', 'Status', 'Capítulos', 'Seções', 'Chunks', 'Custo est.', 'Data'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(data?.jobs ?? []).map((job) => (
                    <tr key={job.jobId} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[160px] truncate">{job.userEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${STATUS_COLORS[job.status] ?? 'text-zinc-400'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-center">{job.chaptersCompleted}</td>
                      <td className="px-4 py-3 text-zinc-300 text-center">{job.sectionsGenerated}</td>
                      <td className="px-4 py-3 text-zinc-300 text-center">{job.chunksEmbedded}</td>
                      <td className="px-4 py-3 text-zinc-200 font-mono text-xs">{job.estimatedCost}</td>
                      <td className="px-4 py-3 text-zinc-500">{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                  {(data?.jobs ?? []).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">Nenhum job encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(data?.total ?? 0) > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
              <p className="text-xs text-zinc-500">{offset + 1}–{Math.min(offset + PAGE_SIZE, data?.total ?? 0)} de {data?.total}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => load(offset - PAGE_SIZE)} disabled={offset === 0 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => load(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= (data?.total ?? 0) || loading}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
