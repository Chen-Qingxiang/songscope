import { z } from 'zod'
import { sidSchema } from './ids.js'

export const personSchema = z.object({
  sid: sidSchema,
  primaryName: z.string().min(1),
  traditionalName: z.string().min(1),
  birthYear: z.number().int().nullable(),
  deathYear: z.number().int().nullable(),
  summary: z.string().min(1)
})

export type Person = z.infer<typeof personSchema>
