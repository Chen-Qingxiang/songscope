import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ZodError } from 'zod'
import { curatedDatasetSchema, type CuratedDataset } from '@songscope/schema'

const files = {
  metadata: 'dataset.json',
  people: 'people/people.json',
  places: 'places/places.json',
  offices: 'offices/offices.json',
  temporalExtents: 'events/temporal-extents.json',
  sourceWorks: 'sources/works.json',
  sourceItems: 'sources/items.json',
  passages: 'passages/passages.json',
  events: 'events/events.json',
  eventParticipations: 'events/participations.json',
  eventRelations: 'events/relations.json',
  appointments: 'appointments/appointments.json',
  appointmentComponents: 'appointments/components.json',
  serviceEpisodes: 'service-episodes/service-episodes.json',
  assertions: 'assertions/assertions.json',
  evidenceLinks: 'assertions/evidence-links.json'
} as const

export async function loadCuratedDataset(root = resolve(process.cwd(), 'data/curated')): Promise<CuratedDataset> {
  const entries = await Promise.all(Object.entries(files).map(async ([key, relative]) => {
    const path = resolve(root, relative)
    try {
      return [key, JSON.parse(await readFile(path, 'utf8'))] as const
    } catch (error) {
      throw new Error(`Cannot read curated data file ${path}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }))

  try {
    return curatedDatasetSchema.parse(Object.fromEntries(entries))
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => `${issue.path.join('.') || '<dataset>'}: ${issue.message}`).join('\n')
      throw new Error(`Curated data validation failed:\n${details}`)
    }
    throw error
  }
}
