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
      chapterCount: 5,
      sectionsPerChapter: 4,
      paragraphsPerSection: 5,
      ...defaultValues,
    },
  })

  const bookType = watch('type')
  const chapterCount = watch('chapterCount')
  const sectionsPerChapter = watch('sectionsPerChapter')
  const paragraphsPerSection = watch('paragraphsPerSection')
  const totalSections = (chapterCount || 0) * (sectionsPerChapter || 0)
  const totalParagraphs = totalSections * (paragraphsPerSection || 0)
  const totalPages = Math.round(totalParagraphs * 150 / 450)

  useEffect(() => {
    setValue('academicSubtype', undefined)
    setValue('literaryGenre', undefined)
  }, [bookType, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Título da obra"
        placeholder="Ex: A Influência da Tecnologia na Educação"
        error={errors.title?.message}
        {...register('title')}
      />

      <Input
        label="Tema principal"
        placeholder="Ex: Inteligência artificial na pedagogia"
        error={errors.theme?.message}
        {...register('theme')}
      />

      <Select
        label="Tipo da obra"
        options={typeOptions}
        placeholder="Selecione o tipo"
        error={errors.type?.message}
        {...register('type')}
      />

      {bookType === 'academic' && (
        <Select
          label="Tipo acadêmico"
          options={academicOptions}
          placeholder="Selecione o tipo acadêmico"
          error={errors.academicSubtype?.message}
          {...register('academicSubtype')}
        />
      )}

      {bookType === 'literary' && (
        <Select
          label="Gênero literário"
          options={literaryOptions}
          placeholder="Selecione o gênero"
          error={errors.literaryGenre?.message}
          {...register('literaryGenre')}
        />
      )}

      <Textarea
        label="Descrição breve da obra"
        placeholder="Descreva o conteúdo, objetivo e público-alvo da obra..."
        rows={4}
        error={errors.description?.message}
        hint="Mínimo 20, máximo 2000 caracteres"
        {...register('description')}
      />

      {/* Capítulos e Seções */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chapterCount" className="text-sm font-medium text-foreground/80">
            Capítulos
            <span className="ml-2 text-muted-foreground/70 font-normal">(3 – 12)</span>
          </label>
          <input
            id="chapterCount"
            type="number"
            min={3}
            max={12}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-border-strong"
            {...register('chapterCount', { valueAsNumber: true })}
          />
          {errors.chapterCount && (
            <p className="text-xs text-danger">{errors.chapterCount.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sectionsPerChapter" className="text-sm font-medium text-foreground/80">
            Seções por capítulo
            <span className="ml-2 text-muted-foreground/70 font-normal">(3 – 8)</span>
          </label>
          <input
            id="sectionsPerChapter"
            type="number"
            min={3}
            max={8}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-border-strong"
            {...register('sectionsPerChapter', { valueAsNumber: true })}
          />
          {errors.sectionsPerChapter && (
            <p className="text-xs text-danger">{errors.sectionsPerChapter.message}</p>
          )}
        </div>
      </div>

      {/* Parágrafos por seção */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="paragraphsPerSection" className="text-sm font-medium text-foreground/80">
          Parágrafos por seção
          <span className="ml-2 text-muted-foreground/70 font-normal">(3 – 8)</span>
        </label>
        <input
          id="paragraphsPerSection"
          type="number"
          min={3}
          max={8}
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-border-strong"
          {...register('paragraphsPerSection', { valueAsNumber: true })}
        />
        {errors.paragraphsPerSection && (
          <p className="text-xs text-danger">{errors.paragraphsPerSection.message}</p>
        )}
      </div>

      {totalSections > 0 && (
        <p className="text-xs text-muted-foreground/80 bg-surface-muted/40 rounded-md px-3 py-2">
          {chapterCount} cap. × {sectionsPerChapter} seções × {paragraphsPerSection} parágrafos = <span className="text-foreground font-medium">{totalParagraphs} parágrafos</span>
          {' · '}
          ~150 palavras/parágrafo
          {' · '}
          <span className="text-foreground font-medium">{totalPages} págs.</span> estimadas
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Salvar obra
      </Button>
    </form>
  )
}
