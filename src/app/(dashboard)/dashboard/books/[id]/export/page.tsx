'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, ChevronLeft, Clock } from 'lucide-react'

export default function ExportPage() {
  const { id: bookId } = useParams<{ id: string }>()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/dashboard/books/${bookId}`}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar à obra
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Exportar PDF</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Geração do PDF final com formatação completa.
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
          <Clock className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="mb-1 text-base font-medium text-zinc-200">Em desenvolvimento — Fase 6</p>
        <p className="text-sm text-zinc-500 max-w-sm mb-6">
          A exportação em PDF com templates acadêmicos ABNT e literários será implementada na Fase 6.
          Revise o conteúdo gerado enquanto isso.
        </p>
        <Link href={`/dashboard/books/${bookId}/review`}>
          <Button variant="secondary" className="gap-2">
            <FileText className="h-4 w-4" />
            Revisar obra gerada
          </Button>
        </Link>
      </Card>
    </div>
  )
}
