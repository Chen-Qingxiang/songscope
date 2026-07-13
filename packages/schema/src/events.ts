import { z } from 'zod'
import { sidSchema } from './ids.js'

export const eventSchema = z.object({
  sid: sidSchema,
  eventType: z.enum(['appointment', 'service-start', 'service', 'travel', 'political', 'disaster', 'literary', 'life']),
  label: z.string().min(1),
  temporalExtentSid: sidSchema,
  placeSid: sidSchema.nullable(),
  description: z.string().min(1)
})

export const eventParticipationSchema = z.object({
  eventSid: sidSchema,
  entitySid: sidSchema,
  role: z.enum(['appointee', 'office-holder', 'origin', 'destination', 'subject', 'agent', 'witness'])
})

export type Event = z.infer<typeof eventSchema>
export type EventParticipation = z.infer<typeof eventParticipationSchema>
