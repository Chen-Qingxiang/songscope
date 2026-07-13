import { z } from 'zod'
import { sidSchema } from './ids.js'

export const assertionStatusSchema = z.enum(['proposed', 'accepted', 'rejected', 'superseded'])
export const evidenceStanceSchema = z.enum(['supports', 'opposes', 'qualifies'])

export const assertionSchema = z.object({
  sid: sidSchema,
  subjectSid: sidSchema,
  predicate: z.string().min(1),
  objectSid: sidSchema.nullable(),
  objectValue: z.record(z.string(), z.unknown()).nullable(),
  temporalExtentSid: sidSchema.nullable(),
  status: assertionStatusSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1)
}).refine((value) => value.objectSid !== null || value.objectValue !== null, {
  message: 'an assertion needs either objectSid or objectValue'
})

export const evidenceLinkSchema = z.object({
  assertionSid: sidSchema,
  locatorSid: sidSchema,
  stance: evidenceStanceSchema,
  note: z.string().min(1)
})

export type Assertion = z.infer<typeof assertionSchema>
export type EvidenceLink = z.infer<typeof evidenceLinkSchema>
