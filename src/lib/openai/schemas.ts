import { z } from 'zod'

// ── Plano de escrita ─────────────────────────────────────────────────────────

export const ChapterPlanSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  targetPages: z.number().int().min(1),
  targetWords: z.number().int().min(1),
})

export const WritingPlanOutputSchema = z.object({
  chapters: z.array(ChapterPlanSchema).min(1).max(40),
})

export type ChapterPlan = z.infer<typeof ChapterPlanSchema>
export type WritingPlanOutput = z.infer<typeof WritingPlanOutputSchema>

// JSON Schema equivalente para OpenAI Structured Outputs
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
            order:       { type: 'integer' },
            title:       { type: 'string' },
            description: { type: 'string' },
            targetPages: { type: 'integer' },
            targetWords: { type: 'integer' },
          },
          required: ['order', 'title', 'description', 'targetPages', 'targetWords'],
          additionalProperties: false,
        },
      },
    },
    required: ['chapters'],
    additionalProperties: false,
  },
}
