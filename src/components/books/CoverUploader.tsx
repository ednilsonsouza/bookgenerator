'use client'

import { useState, useRef } from 'react'
import { storage, ID } from '@/lib/appwrite/client'
import { getFileViewUrl } from '@/lib/appwrite/client'
import { BUCKETS } from '@/lib/appwrite/config'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoverUploaderProps {
  currentFileId?: string
  onUploaded: (fileId: string) => void
  onRemoved?: () => void
}

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export function CoverUploader({ currentFileId, onUploaded, onRemoved }: CoverUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const previewUrl = currentFileId
    ? getFileViewUrl(BUCKETS.COVERS, currentFileId)
    : null

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      setError('Imagem muito grande. Máximo: 5 MB.')
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setError('Use JPG, PNG ou WEBP.')
      return
    }

    setError('')
    setUploading(true)
    try {
      const uploaded = await storage.createFile(BUCKETS.COVERS, ID.unique(), file)
      onUploaded(uploaded.$id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-300">
        Capa do livro
        <span className="ml-1 text-zinc-500 font-normal">— JPG, PNG ou WEBP, máx. 5 MB</span>
      </label>

      {previewUrl ? (
        <div className="relative w-36 h-52 rounded-lg overflow-hidden border border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Capa"
            className="w-full h-full object-cover"
          />
          {onRemoved && (
            <button
              type="button"
              onClick={onRemoved}
              className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1 text-zinc-300 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <label
          className={cn(
            'flex w-36 h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-400',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          {uploading ? (
            <Spinner size="md" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-xs text-center px-2">Adicionar capa</span>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFile}
            className="sr-only"
            disabled={uploading}
          />
        </label>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
