import { z } from 'zod'
import { sidSchema } from './ids.js'

export const evidenceSummarySchema = z.object({
  assertionSid: sidSchema,
  accepted: z.boolean(),
  evidenceCount: z.number().int().nonnegative(),
  sourceTitles: z.array(z.string()),
  locatorLabels: z.array(z.string())
})

export const careerTimelineItemSchema = z.object({
  id: sidSchema,
  itemType: z.enum(['appointment', 'service']),
  year: z.number().int(),
  yearLabel: z.string(),
  precision: z.string(),
  uncertainty: z.string(),
  title: z.string(),
  summary: z.string(),
  place: z.object({ sid: sidSchema, name: z.string(), resolutionStatus: z.string() }).nullable(),
  evidenceSummary: evidenceSummarySchema
})

export const careerTimelineResponseSchema = z.object({
  datasetVersion: z.string(),
  person: z.object({ sid: sidSchema, name: z.string() }),
  items: z.array(careerTimelineItemSchema)
})

export type EvidenceSummary = z.infer<typeof evidenceSummarySchema>
export type CareerTimelineItem = z.infer<typeof careerTimelineItemSchema>
export type CareerTimelineResponse = z.infer<typeof careerTimelineResponseSchema>
