'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { Library, Trash2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface LibraryItem {
  $id: string
  bookProjectId: string
  title: string
  authorName: string
  summary: string
  downloadCount: number
  readCount: number
  publishedAt: string
}

const PAGE_SIZE = 25

export default function AdminLibraryPage() {
  const { user }   = useAuth()
  const [items, setItems]     = useState<LibraryItem[]>([])
  const [total, setTotal]     = useState(0)
  const [offset, setOffset]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function load(off = 0) {
    if (!user) return
    setLoading(true)
    const res = await fetch(`/api/admin/library?limit=${PAGE_SIZE}&offset=${off}`, {
      headers: { 'x-user-id': user.$id },
    })
    const data = await res.json()
    setItems(data.items ?? [])
    setTotal(data.total ?? 0)
    setOffset(off)
    setLoading(false)
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRemove(item: LibraryItem) {
    if (!user || !confirm(`Despublicar "${item.title}"?`)) return
    setRemovingId(item.$id)
    await fetch('/api/admin/library', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.$id },
      body:    JSON.stringify({ itemId: item.$id, bookProjectId: item.bookProjectId }),
    })
    await load(offset)
    setRemovingId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Biblioteca</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} obra{total !== 1 ? 's' : ''} publicada{total !== 1 ? 's' : ''}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Título', 'Autor', 'Downloads', 'Leituras', 'Publicada', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item) => (
                    <tr key={item.$id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="px-4 py-3 text-foreground max-w-[200px] truncate font-medium">{item.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.authorName}</td>
                      <td className="px-4 py-3 text-foreground/80 text-center">{item.downloadCount ?? 0}</td>
                      <td className="px-4 py-3 text-foreground/80 text-center">{item.readCount ?? 0}</td>
                      <td className="px-4 py-3 text-muted-foreground/70">{formatDate(item.publishedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/library/${item.$id}`} target="_blank" className="text-muted-foreground/70 hover:text-foreground/80 transition-colors">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleRemove(item)}
                            disabled={removingId === item.$id}
                            className="text-muted-foreground/70 hover:text-red-400 transition-colors disabled:opacity-40"
                            title="Despublicar"
                          >
                            {removingId === item.$id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground/70">
                      <Library className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Biblioteca vazia
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground/70">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => load(offset - PAGE_SIZE)} disabled={offset === 0 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => load(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total || loading}>
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
