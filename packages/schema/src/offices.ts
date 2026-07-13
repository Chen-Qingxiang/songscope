import { z } from 'zod'
import { sidSchema } from './ids.js'

export const officeConceptSchema = z.object({
  sid: sidSchema,
  label: z.string().min(1),
  category: z.enum(['rank-office', 'duty-assignment', 'honorific', 'title', 'status']),
  description: z.string().min(1)
})

export const appointmentActionSchema = z.object({
  sid: sidSchema,
  personSid: sidSchema,
  actionType: z.enum(['appoint', 'transfer', 'promote', 'demote', 'dismiss', 'restore', 'place']),
  eventSid: sidSchema,
  temporalExtentSid: sidSchema,
  rawExpression: z.string().min(1),
  note: z.string().min(1)
})

export const appointmentComponentSchema = z.object({
  appointmentActionSid: sidSchema,
  officeConceptSid: sidSchema,
  placeSid: sidSchema.nullable(),
  componentType: z.enum(['office', 'duty', 'place', 'rank', 'status']),
  rawExpression: z.string().min(1)
})

export const serviceEpisodeSchema = z.object({
  sid: sidSchema,
  personSid: sidSchema,
  dutyOfficeSid: sidSchema,
  placeSid: sidSchema,
  temporalExtentSid: sidSchema,
  derivedFromAppointmentSid: sidSchema.nullable(),
  status: z.enum(['attested', 'inferred', 'disputed']),
  note: z.string().min(1)
})

export type OfficeConcept = z.infer<typeof officeConceptSchema>
export type AppointmentAction = z.infer<typeof appointmentActionSchema>
export type AppointmentComponent = z.infer<typeof appointmentComponentSchema>
export type ServiceEpisode = z.infer<typeof serviceEpisodeSchema>
