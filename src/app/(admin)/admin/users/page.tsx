'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { Users, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
  status: boolean
  createdAt: string
  bookCount: number
}

const PAGE_SIZE = 25

export default function AdminUsersPage() {
  const { user }   = useAuth()
  const [users, setUsers]     = useState<AdminUser[]>([])
  const [total, setTotal]     = useState(0)
  const [offset, setOffset]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load(off = 0) {
    if (!user) return
    setLoading(true)
    const res = await fetch(`/api/admin/users?limit=${PAGE_SIZE}&offset=${off}`, {
      headers: { 'x-user-id': user.$id },
    })
    const data = await res.json()
    setUsers(data.users ?? [])
    setTotal(data.total ?? 0)
    setOffset(off)
    setLoading(false)
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleBlock(targetId: string, currentStatus: boolean) {
    if (!user) return
    setActionId(targetId)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.$id },
      body: JSON.stringify({ targetUserId: targetId, block: currentStatus }),
    })
    await load(offset)
    setActionId(null)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} conta{total !== 1 ? 's' : ''} registrada{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Nome', 'E-mail', 'Obras', 'Cadastro', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-foreground/80 text-center">{u.bookCount}</td>
                    <td className="px-4 py-3 text-muted-foreground/70">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status
                          ? 'bg-success-muted text-success'
                          : 'bg-danger-muted text-danger'
                      }`}>
                        {u.status ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.email !== (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '') && (
                        <button
                          onClick={() => toggleBlock(u.id, u.status)}
                          disabled={actionId === u.id}
                          className="text-muted-foreground/70 hover:text-foreground/80 transition-colors disabled:opacity-40"
                          title={u.status ? 'Bloquear' : 'Desbloquear'}
                        >
                          {actionId === u.id ? (
                            <Spinner size="sm" />
                          ) : u.status ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground/70">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground/70">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => load(offset - PAGE_SIZE)} disabled={offset === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => load(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}>
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

