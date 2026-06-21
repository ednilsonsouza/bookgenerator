import { z } from 'zod'

export const SectionPlanSchema = z.object({
  order: z.coerce.number().int().min(1),
  title: z.string().min(1),
})

export const ChapterPlanSchema = z.object({
  order: z.coerce.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  sections: z.array(SectionPlanSchema).min(3).max(8),
  targetPages: z.coerce.number().int().min(1),
  targetWords: z.coerce.number().int().min(1),
})

export const WritingPlanOutputSchema = z.object({
  chapters: z.array(ChapterPlanSchema).min(3).max(12),
})

export type ChapterPlan = z.infer<typeof ChapterPlanSchema>
export type WritingPlanOutput = z.infer<typeof WritingPlanOutputSchema>

export const writingPlanJsonSchema = {
  name: 'writing_plan',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      chapters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            order:        { type: 'integer' },
            title:        { type: 'string' },
            description:  { type: 'string' },
            targetPages:  { type: 'integer' },
            targetWords:  { type: 'integer' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  order: { type: 'integer' },
                  title: { type: 'string' },
                },
                required: ['order', 'title'],
                additionalProperties: false,
              },
            },
          },
          required: ['order', 'title', 'description', 'targetPages', 'targetWords', 'sections'],
          additionalProperties: false,
        },
      },
    },
    required: ['chapters'],
    additionalProperties: false,
  },
}
