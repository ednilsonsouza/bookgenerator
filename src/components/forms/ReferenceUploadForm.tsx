'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { referenceSchema, type ReferenceFormValues, MAX_FILE_SIZE } from '@/lib/validation/referenceSchema'
import { storage, ID } from '@/lib/appwrite/client'
import { BUCKETS } from '@/lib/appwrite/config'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Upload, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReferenceUploadFormProps {
  bookId: string
  userId: string
  onSuccess: () => void
}

export function ReferenceUploadForm({ bookId, userId, onSuccess }: ReferenceUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReferenceFormValues>({ resolver: zodResolver(referenceSchema) })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_FILE_SIZE) {
      setError('Arquivo muito grande. Máximo: 30 MB.')
      return
    }
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'txt'].includes(ext)) {
      setError('Somente PDF e TXT são aceitos.')
      return
    }
    setError('')
    setFile(f)
  }

  async function onSubmit(values: ReferenceFormValues) {
    setError('')
    setUploading(true)

    try {
      // 1. Upload do arquivo para o Appwrite Storage (se houver)
      let fileId: string | undefined
      if (file) {
        const uploaded = await storage.createFile(BUCKETS.REFERENCES, ID.unique(), file)
        fileId = uploaded.$id
      }

      // 2. Cria referência via API
      const res = await fetch(`/api/books/${bookId}/references`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, fileId, ...values }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar referência.')

      // 3. Se tem arquivo, dispara processamento (não bloqueia)
      if (fileId && data.reference?.$id) {
        fetch(`/api/books/${bookId}/references/${data.reference.$id}/process`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId }),
        }).catch(() => { /* será visível no status */ })
      }

      reset()
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setUploading(false)
    }
  }

  const loading = isSubmitting || uploading

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Título da obra / artigo *"
        placeholder="Ex: Inteligência Artificial na Educação"
        error={errors.title?.message}
        {...register('title')}
      />
      <Input
        label="Autores *"
        placeholder="Ex: Silva, João; Souza, Maria"
        hint="Separe múltiplos autores com ponto e vírgula"
        error={errors.authors?.message}
        {...register('authors')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Ano"
          placeholder="2023"
          maxLength={4}
          error={errors.year?.message}
          {...register('year')}
        />
        <Input
          label="Editora / Periódico"
          placeholder="Ex: ABDR"
          error={errors.publisher?.message}
          {...register('publisher')}
        />
      </div>

      {/* Upload de arquivo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Arquivo (PDF ou TXT)
          <span className="ml-1 text-zinc-500 font-normal">— opcional</span>
        </label>
        {file ? (
          <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2">
            <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
            <span className="flex-1 text-sm text-zinc-200 truncate">{file.name}</span>
            <span className="text-xs text-zinc-500 shrink-0">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              type="button"
              onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md border-2 border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm text-zinc-400 transition-colors',
              'hover:border-zinc-600 hover:text-zinc-300'
            )}
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>Clique para selecionar PDF ou TXT (máx. 30 MB)</span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 rounded-md border border-red-800 bg-red-900/20 px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Adicionar referência
      </Button>
    </form>
  )
}
