'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createBookProject } from '@/lib/appwrite/database'
import { BookProjectForm } from '@/components/forms/BookProjectForm'
import type { BookProjectFormValues } from '@/lib/validation/bookSchema'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBookPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(values: BookProjectFormValues) {
    if (!user) return
    setError('')
    setLoading(true)
    try {
      const book = await createBookProject(user.$id, {
        title: values.title,
        theme: values.theme,
        type: values.type,
        academicSubtype: values.academicSubtype,
        literaryGenre: values.literaryGenre,
        description: values.description,
        targetPages: values.targetPages,
        status: 'draft',
        visibility: 'private',
      })
      router.push(`/dashboard/books/${book.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar obra.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/books"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Minhas obras
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-sm text-foreground/80">Nova obra</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nova obra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados básicos para criar seu projeto
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-border bg-surface/50 p-6">
        <BookProjectForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  )
}

