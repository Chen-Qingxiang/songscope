import { z } from 'zod'
import { evidenceSummarySchema } from './projections.js'
import { sidSchema } from './ids.js'

const dateDetailSchema = z.object({
  original: z.string().min(1),
  normalizedStart: z.string().nullable(),
  normalizedEnd: z.string().nullable(),
  precision: z.string().min(1),
  uncertainty: z.string().min(1),
  conversionMethod: z.string().min(1),
  conversionNote: z.string().min(1)
})

const placeSummarySchema = z.object({
  sid: sidSchema,
  name: z.string().min(1),
  resolutionStatus: z.string().min(1),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  note: z.string().min(1)
})

export const assertionEvidenceResponseSchema = z.object({
  datasetVersion: z.string().min(1),
  assertion: z.object({
    sid: sidSchema,
    subjectSid: sidSchema,
    predicate: z.string().min(1),
    status: z.string().min(1),
    confidence: z.number(),
    rationale: z.string().min(1),
    date: dateDetailSchema.nullable()
  }),
  evidence: z.array(z.object({
    stance: z.string().min(1),
    note: z.string().min(1),
    locator: z.object({ sid: sidSchema, type: z.string(), value: z.string(), quote: z.string().nullable() }),
    source: z.object({ sid: sidSchema, title: z.string(), item: z.string(), citation: z.string(), url: z.string().nullable() })
  }))
})

export const eventResponseSchema = z.object({
  datasetVersion: z.string().min(1),
  event: z.object({
    sid: sidSchema,
    eventType: z.string().min(1),
    label: z.string().min(1),
    description: z.string().min(1),
    status: z.string().min(1),
    date: dateDetailSchema,
    place: placeSummarySchema.nullable()
  }),
  participants: z.array(z.object({ sid: sidSchema, label: z.string(), entityType: z.string(), role: z.string() })),
  children: z.array(z.object({ sid: sidSchema, eventType: z.string(), label: z.string() })),
  relations: z.array(z.object({ direction: z.enum(['outgoing', 'incoming']), relationType: z.string(), note: z.string(), event: z.object({ sid: sidSchema, label: z.string(), eventType: z.string() }) })),
  appointment: z.object({
    actionType: z.string(), rawExpression: z.string(), note: z.string(),
    components: z.array(z.object({ componentType: z.string(), rawExpression: z.string(), officeSid: sidSchema, officeLabel: z.string(), officeCategory: z.string(), placeSid: sidSchema.nullable(), placeName: z.string().nullable() }))
  }).nullable(),
  assertions: z.array(evidenceSummarySchema)
})

export const sourceResponseSchema = z.object({
  datasetVersion: z.string().min(1),
  source: z.object({ sid: sidSchema, title: z.string(), creator: z.string(), workType: z.string() }),
  items: z.array(z.object({
    sid: sidSchema, label: z.string(), url: z.string().nullable(), citation: z.string(),
    locators: z.array(z.object({ sid: sidSchema, type: z.string(), value: z.string(), quote: z.string().nullable() }))
  })),
  assertions: z.array(z.object({ sid: sidSchema, subjectSid: sidSchema, predicate: z.string(), status: z.string(), stance: z.string(), locatorSid: sidSchema }))
})

export const searchResponseSchema = z.object({
  datasetVersion: z.string().min(1),
  query: z.string(),
  results: z.array(z.object({ sid: sidSchema, type: z.string(), label: z.string(), description: z.string() }))
})

export const errorResponseSchema = z.object({
  error: z.string().min(1),
  message: z.string().min(1)
})

export type AssertionEvidenceResponse = z.infer<typeof assertionEvidenceResponseSchema>
export type EventResponse = z.infer<typeof eventResponseSchema>
export type SourceResponse = z.infer<typeof sourceResponseSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
