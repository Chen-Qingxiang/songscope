import { z } from 'zod'
import { assertionSchema, evidenceLinkSchema } from './assertions.js'
import { eventParticipationSchema, eventRelationSchema, eventSchema } from './events.js'
import { appointmentActionSchema, appointmentComponentSchema, officeConceptSchema, serviceEpisodeSchema } from './offices.js'
import { personSchema } from './people.js'
import { placeSchema } from './places.js'
import { sourceItemSchema, sourceLocatorSchema, sourceWorkSchema } from './sources.js'
import { temporalExtentSchema } from './time.js'

export const datasetMetadataSchema = z.object({
  datasetVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  curatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scope: z.string().min(1)
})

export const curatedDatasetSchema = z.object({
  metadata: datasetMetadataSchema,
  people: z.array(personSchema),
  places: z.array(placeSchema),
  offices: z.array(officeConceptSchema),
  temporalExtents: z.array(temporalExtentSchema),
  sourceWorks: z.array(sourceWorkSchema),
  sourceItems: z.array(sourceItemSchema),
  passages: z.array(sourceLocatorSchema),
  events: z.array(eventSchema),
  eventParticipations: z.array(eventParticipationSchema),
  eventRelations: z.array(eventRelationSchema),
  appointments: z.array(appointmentActionSchema),
  appointmentComponents: z.array(appointmentComponentSchema),
  serviceEpisodes: z.array(serviceEpisodeSchema),
  assertions: z.array(assertionSchema),
  evidenceLinks: z.array(evidenceLinkSchema)
}).superRefine((dataset, ctx) => {
  const collections = [
    dataset.people, dataset.places, dataset.offices, dataset.temporalExtents,
    dataset.sourceWorks, dataset.sourceItems, dataset.passages, dataset.events,
    dataset.serviceEpisodes, dataset.assertions
  ] as Array<Array<{ sid: string }>>
  const sids = new Set<string>()
  for (const collection of collections) {
    for (const record of collection) {
      if (sids.has(record.sid)) ctx.addIssue({ code: 'custom', message: `duplicate SID: ${record.sid}` })
      sids.add(record.sid)
    }
  }

  const requireSid = (sid: string | null, label: string) => {
    if (sid && !sids.has(sid)) ctx.addIssue({ code: 'custom', message: `${label} references missing SID: ${sid}` })
  }
  dataset.sourceItems.forEach((item) => requireSid(item.workSid, item.sid))
  dataset.passages.forEach((item) => requireSid(item.sourceItemSid, item.sid))
  dataset.events.forEach((item) => {
    requireSid(item.temporalExtentSid, item.sid)
    requireSid(item.placeSid, item.sid)
    requireSid(item.parentEventSid, item.sid)
  })
  dataset.eventParticipations.forEach((item) => {
    requireSid(item.eventSid, 'event participation')
    requireSid(item.entitySid, 'event participation')
  })
  dataset.eventRelations.forEach((item) => {
    requireSid(item.subjectEventSid, 'event relation')
    requireSid(item.objectEventSid, 'event relation')
  })
  dataset.appointments.forEach((item) => {
    requireSid(item.personSid, item.sid)
    requireSid(item.eventSid, item.sid)
    requireSid(item.temporalExtentSid, item.sid)
    if (item.sid !== item.eventSid) ctx.addIssue({ code: 'custom', message: `${item.sid} must reuse its appointment event SID` })
  })
  dataset.appointmentComponents.forEach((item) => {
    requireSid(item.appointmentActionSid, 'appointment component')
    requireSid(item.officeConceptSid, 'appointment component')
    requireSid(item.placeSid, 'appointment component')
  })
  dataset.serviceEpisodes.forEach((item) => {
    requireSid(item.personSid, item.sid)
    requireSid(item.dutyOfficeSid, item.sid)
    requireSid(item.placeSid, item.sid)
    requireSid(item.temporalExtentSid, item.sid)
    requireSid(item.derivedFromAppointmentSid, item.sid)
    requireSid(item.createdByEventSid, item.sid)
    if (item.episodeType === 'service' && !item.dutyOfficeSid) {
      ctx.addIssue({ code: 'custom', message: `${item.sid} service episode requires dutyOfficeSid` })
    }
  })
  dataset.assertions.forEach((item) => {
    requireSid(item.subjectSid, item.sid)
    requireSid(item.objectSid, item.sid)
    requireSid(item.temporalExtentSid, item.sid)
    if (item.status === 'accepted' && !dataset.evidenceLinks.some((link) => link.assertionSid === item.sid && link.stance === 'supports')) {
      ctx.addIssue({ code: 'custom', message: `${item.sid} is accepted but has no supporting evidence` })
    }
  })
  dataset.evidenceLinks.forEach((item) => {
    requireSid(item.assertionSid, 'evidence link')
    requireSid(item.locatorSid, 'evidence link')
  })
})

export type CuratedDataset = z.infer<typeof curatedDatasetSchema>
