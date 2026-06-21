'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { listBookProjects } from '@/lib/appwrite/database'
import type { BookProject } from '@/types/book'
import { BOOK_STATUS_LABELS, LITERARY_GENRE_LABELS, ACADEMIC_SUBTYPE_LABELS } from '@/types/book'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { BookStatusBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Plus, BookOpen, ChevronRight, GraduationCap, BookMarked } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function BooksPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState<BookProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    listBookProjects(user.$id)
      .then(setBooks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas obras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {books.length} {books.length === 1 ? 'obra' : 'obras'} criadas
          </p>
        </div>
        <Link href="/dashboard/books/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova obra
          </Button>
        </Link>
      </div>

      {/* Erro */}
      {error && (
        <p className="rounded-md border border-danger/30 bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Lista vazia */}
      {!error && books.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/60" />
          <p className="mb-1 font-medium text-foreground/80">Nenhuma obra ainda</p>
          <p className="mb-6 text-sm text-muted-foreground/70">
            Comece criando o seu primeiro projeto de obra
          </p>
          <Link href="/dashboard/books/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Criar primeira obra
            </Button>
          </Link>
        </Card>
      )}

      {/* Grid de obras */}
      {books.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Link key={book.id} href={`/dashboard/books/${book.id}`}>
              <Card className="h-full cursor-pointer transition-colors hover:border-border-strong hover:bg-surface-muted">
                <CardContent>
                  {/* Ícone do tipo */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted">
                      {book.type === 'academic' ? (
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <BookMarked className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <BookStatusBadge status={book.status} />
                  </div>

                  {/* Título */}
                  <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                    {book.title}
                  </h3>

                  {/* Subtipo/gênero */}
                  <p className="text-xs text-muted-foreground/70 mb-2">
                    {book.type === 'academic' && book.academicSubtype
                      ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype]
                      : book.type === 'literary' && book.literaryGenre
                      ? LITERARY_GENRE_LABELS[book.literaryGenre]
                      : book.type === 'academic'
                      ? 'Acadêmica'
                      : 'Literária'}
                  </p>

                  {/* Descrição */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{book.description}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground/60">
                    <span>{book.chapterCount} cap.</span>
                    <span>{formatDate(book.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

