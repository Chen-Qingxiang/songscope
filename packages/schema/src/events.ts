import { z } from 'zod'
import { sidSchema } from './ids.js'

export const eventSchema = z.object({
  sid: sidSchema,
  eventType: z.enum(['appointment', 'service-start', 'service', 'movement', 'political', 'disaster', 'disaster-response', 'literary', 'life']),
  label: z.string().min(1),
  temporalExtentSid: sidSchema,
  placeSid: sidSchema.nullable(),
  parentEventSid: sidSchema.nullable(),
  status: z.enum(['verified', 'prototype', 'disputed']),
  sequence: z.number().int().nonnegative(),
  description: z.string().min(1)
})

export const eventParticipationSchema = z.object({
  eventSid: sidSchema,
  entitySid: sidSchema,
  role: z.enum([
    'appointee', 'office-holder', 'origin', 'destination', 'subject', 'agent',
    'witness', 'organizer', 'accuser', 'appointing-authority', 'affected-place'
  ])
})

export const eventRelationSchema = z.object({
  subjectEventSid: sidSchema,
  relationType: z.enum(['part-of', 'responded-to', 'followed', 'resulted-in']),
  objectEventSid: sidSchema,
  note: z.string().min(1)
})

export type Event = z.infer<typeof eventSchema>
export type EventParticipation = z.infer<typeof eventParticipationSchema>
export type EventRelation = z.infer<typeof eventRelationSchema>
