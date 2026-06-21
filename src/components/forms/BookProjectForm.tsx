'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bookProjectSchema, type BookProjectFormValues } from '@/lib/validation/bookSchema'
import {
  ACADEMIC_SUBTYPE_LABELS,
  LITERARY_GENRE_LABELS,
  type AcademicSubtype,
  type LiteraryGenre,
} from '@/types/book'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface BookProjectFormProps {
  onSubmit: (values: BookProjectFormValues) => Promise<void>
  loading?: boolean
  defaultValues?: Partial<BookProjectFormValues>
}

const academicOptions = Object.entries(ACADEMIC_SUBTYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const literaryOptions = Object.entries(LITERARY_GENRE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const typeOptions = [
  { value: 'academic', label: 'Acadêmica' },
  { value: 'literary', label: 'Literária' },
]

export function BookProjectForm({ onSubmit, loading = false, defaultValues }: BookProjectFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookProjectFormValues>({
    resolver: zodResolver(bookProjectSchema),
    defaultValues: {
      targetPages: 30,
      ...defaultValues,
    },
  })

  const bookType = watch('type')

  // Limpa subtipo ao mudar o tipo
  useEffect(() => {
    setValue('academicSubtype', undefined)
    setValue('literaryGenre', undefined)
  }, [bookType, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Título */}
      <Input
        label="Título da obra"
        placeholder="Ex: A Influência da Tecnologia na Educação"
        error={errors.title?.message}
        {...register('title')}
      />

      {/* Tema */}
      <Input
        label="Tema principal"
        placeholder="Ex: Inteligência artificial na pedagogia"
        error={errors.theme?.message}
        {...register('theme')}
      />

      {/* Tipo */}
      <Select
        label="Tipo da obra"
        options={typeOptions}
        placeholder="Selecione o tipo"
        error={errors.type?.message}
        {...register('type')}
      />

      {/* Subtipo acadêmico */}
      {bookType === 'academic' && (
        <Select
          label="Tipo acadêmico"
          options={academicOptions}
          placeholder="Selecione o tipo acadêmico"
          error={errors.academicSubtype?.message}
          {...register('academicSubtype')}
        />
      )}

      {/* Gênero literário */}
      {bookType === 'literary' && (
        <Select
          label="Gênero literário"
          options={literaryOptions}
          placeholder="Selecione o gênero"
          error={errors.literaryGenre?.message}
          {...register('literaryGenre')}
        />
      )}

      {/* Descrição */}
      <Textarea
        label="Descrição breve da obra"
        placeholder="Descreva o conteúdo, objetivo e público-alvo da obra..."
        rows={4}
        error={errors.description?.message}
        hint="Mínimo 20, máximo 2000 caracteres"
        {...register('description')}
      />

      {/* Páginas */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="targetPages" className="text-sm font-medium text-foreground/80">
          Quantidade de páginas
          <span className="ml-2 text-muted-foreground/70 font-normal">(4 – 60)</span>
        </label>
        <input
          id="targetPages"
          type="number"
          min={4}
          max={60}
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-border-strong"
          {...register('targetPages', { valueAsNumber: true })}
        />
        {errors.targetPages && (
          <p className="text-xs text-danger">{errors.targetPages.message}</p>
        )}
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Salvar obra
      </Button>
    </form>
  )
}

