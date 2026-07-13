import { z } from 'zod'
import { sidSchema } from './ids.js'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const temporalPrecisionSchema = z.enum(['day', 'month', 'year', 'range', 'unknown'])
export const temporalCertaintySchema = z.enum(['exact', 'approximate', 'inferred', 'disputed'])

export const temporalExtentSchema = z.object({
  sid: sidSchema,
  originalText: z.string().min(1),
  normalizedStart: isoDateSchema.nullable(),
  normalizedEnd: isoDateSchema.nullable(),
  precision: temporalPrecisionSchema,
  certainty: temporalCertaintySchema,
  calendar: z.enum(['gregorian-proleptic', 'chinese-regnal', 'unknown']),
  conversionNote: z.string().min(1)
}).superRefine((value, ctx) => {
  if (value.normalizedStart && value.normalizedEnd && value.normalizedStart > value.normalizedEnd) {
    ctx.addIssue({ code: 'custom', path: ['normalizedEnd'], message: 'end cannot precede start' })
  }
})

export type TemporalExtent = z.infer<typeof temporalExtentSchema>
