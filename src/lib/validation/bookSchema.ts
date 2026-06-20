import { z } from 'zod'
import type { AcademicSubtype, LiteraryGenre } from '@/types/book'

const ACADEMIC_SUBTYPES: [AcademicSubtype, ...AcademicSubtype[]] = [
  'article',
  'monograph',
  'dissertation',
  'thesis',
  'other_academic',
]

const LITERARY_GENRES: [LiteraryGenre, ...LiteraryGenre[]] = [
  'romance',
  'sci_fi',
  'fantasy',
  'children',
  'religious',
  'short_story',
  'novella',
  'chronicle',
  'drama',
  'thriller',
  'horror',
  'adventure',
  'poetry',
  'fictional_biography',
  'self_help_narrative',
  'historical_fiction',
  'young_adult',
  'fable',
  'dystopia',
  'mystery',
  'comedy',
  'magical_realism',
  'epic',
  'family_saga',
  'other_literary',
]

export const bookProjectSchema = z
  .object({
    title: z
      .string()
      .min(3, 'O título deve ter pelo menos 3 caracteres')
      .max(200, 'O título deve ter no máximo 200 caracteres'),
    theme: z
      .string()
      .min(3, 'O tema deve ter pelo menos 3 caracteres')
      .max(300, 'O tema deve ter no máximo 300 caracteres'),
    type: z.enum(['academic', 'literary'], {
      error: 'Selecione o tipo da obra',
    }),
    academicSubtype: z.enum(ACADEMIC_SUBTYPES).optional(),
    literaryGenre: z.enum(LITERARY_GENRES).optional(),
    description: z
      .string()
      .min(20, 'A descrição deve ter pelo menos 20 caracteres')
      .max(2000, 'A descrição deve ter no máximo 2000 caracteres'),
    targetPages: z
      .number({ error: 'Informe a quantidade de páginas' })
      .min(4, 'Mínimo de 4 páginas')
      .max(120, 'Máximo de 120 páginas'),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'academic' && !data.academicSubtype) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione o subtipo acadêmico',
        path: ['academicSubtype'],
      })
    }
    if (data.type === 'literary' && !data.literaryGenre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione o gênero literário',
        path: ['literaryGenre'],
      })
    }
  })

export type BookProjectFormValues = z.infer<typeof bookProjectSchema>
