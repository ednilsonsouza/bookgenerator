import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { Query } from 'node-appwrite'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit  = Math.min(Number(searchParams.get('limit')  ?? 20), 50)
    const offset = Number(searchParams.get('offset') ?? 0)

    const { databases } = createAdminClient()

    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LIBRARY_ITEMS, [
      Query.orderDesc('publishedAt'),
      Query.limit(limit),
      Query.offset(offset),
    ])

    return NextResponse.json({ items: res.documents, total: res.total })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao listar biblioteca.' },
      { status: 500 }
    )
  }
}
