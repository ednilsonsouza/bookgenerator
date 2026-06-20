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
  const limit    = Math.min(Number(searchParams.get('limit')  ?? 25), 100)
  const offset   = Number(searchParams.get('offset') ?? 0)
  const status   = searchParams.get('status') ?? ''

  const { databases, users } = createAdminClient()

  const filters: string[] = []
  if (status) filters.push(Query.equal('status', status))

  const booksRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, [
    ...filters,
    Query.orderDesc('$createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ])

  // Resolve e-mail do autor para cada livro
  const enriched = await Promise.all(
    booksRes.documents.map(async (b) => {
      let authorEmail = ''
      try {
        const u = await users.get(b.userId as string)
        authorEmail = u.email
      } catch { /* usuário removido */ }
      return {
        id:          b.$id,
        title:       b.title,
        theme:       b.theme,
        type:        b.type,
        status:      b.status,
        visibility:  b.visibility,
        targetPages: b.targetPages,
        userId:      b.userId,
        authorEmail,
        createdAt:   b.$createdAt,
        updatedAt:   b.$updatedAt,
      }
    })
  )

  return NextResponse.json({ books: enriched, total: booksRes.total })
}
