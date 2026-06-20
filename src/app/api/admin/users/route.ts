import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { verifyAdmin } from '@/lib/appwrite/adminGuard'
import { Query } from 'node-appwrite'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? ''
  if (!await verifyAdmin(userId)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 25), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const { databases, users } = createAdminClient()

  const usersRes = await users.list([Query.limit(limit), Query.offset(offset)])

  // Conta livros por usuário (em paralelo, com limite de concorrência)
  const enriched = await Promise.all(
    usersRes.users.map(async (u) => {
      const books = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, [
        Query.equal('userId', u.$id),
        Query.limit(1),
      ])
      return {
        id:        u.$id,
        name:      u.name,
        email:     u.email,
        status:    u.status,
        createdAt: u.$createdAt,
        bookCount: books.total,
      }
    })
  )

  return NextResponse.json({ users: enriched, total: usersRes.total })
}

// DELETE — bloqueia/desbloqueia usuário
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? ''
  if (!await verifyAdmin(userId)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { targetUserId, block } = await req.json()
  const { users } = createAdminClient()

  if (block) {
    await users.updateStatus(targetUserId, false)
  } else {
    await users.updateStatus(targetUserId, true)
  }

  return NextResponse.json({ ok: true })
}
