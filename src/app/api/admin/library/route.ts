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

  const { databases } = createAdminClient()

  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, [
    Query.orderDesc('publishedAt'),
    Query.limit(limit),
    Query.offset(offset),
  ])

  return NextResponse.json({ items: res.documents, total: res.total })
}

// DELETE — despublica uma obra da biblioteca
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? ''
  if (!await verifyAdmin(userId)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { itemId, bookProjectId } = await req.json()
  const { databases } = createAdminClient()

  // Remove da biblioteca
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, itemId)

  // Reverte visibilidade da obra
  if (bookProjectId) {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOK_PROJECTS, bookProjectId, {
      visibility: 'private',
      status:     'completed',
    })
  }

  return NextResponse.json({ ok: true })
}
