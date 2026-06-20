import { z } from 'zod'

export const referenceSchema = z.object({
  title:     z.string().min(3, 'Título obrigatório (mínimo 3 caracteres)').max(512),
  authors:   z.string().min(2, 'Informe o(s) autor(es)').max(512),
  year:      z.string().regex(/^\d{4}$/, 'Ano inválido (ex: 2023)').or(z.literal('')).optional(),
  publisher: z.string().max(255).optional(),
})

export type ReferenceFormValues = z.infer<typeof referenceSchema>

export const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30 MB
export const ALLOWED_EXTENSIONS = ['pdf', 'txt']
