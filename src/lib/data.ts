import { appointments, events, people, places, relations, sources, works } from '../data/songData'
import type { EventKind } from '../types'

export const personById = new Map(people.map((item) => [item.id, item]))
export const placeById = new Map(places.map((item) => [item.id, item]))
export const sourceById = new Map(sources.map((item) => [item.id, item]))

export function primaryName(personId: string): string {
  const person = personById.get(personId)
  return person?.names.find((name) => name.kind === 'primary')?.text ?? personId
}

export function eventsForPerson(personId: string) {
  return events.filter((event) => event.personIds.includes(personId)).sort((a, b) => a.year - b.year)
}

export function appointmentsForPerson(personId: string) {
  return appointments.filter((item) => item.personId === personId).sort((a, b) => a.startYear - b.startYear)
}

export function worksForPerson(personId: string) {
  return works.filter((item) => item.authorId === personId).sort((a, b) => a.year - b.year)
}

export function eventKindCounts(): Array<{ kind: EventKind; label: string; count: number }> {
  const labels: Record<EventKind, string> = {
    appointment: '除授',
    politics: '政治',
    disaster: '灾害',
    travel: '迁徙',
    literature: '文学',
    life: '生平'
  }
  const counts = new Map<EventKind, number>()
  events.forEach((event) => counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1))
  appointments.forEach(() => counts.set('appointment', (counts.get('appointment') ?? 0) + 1))
  return (Object.keys(labels) as EventKind[]).map((kind) => ({ kind, label: labels[kind], count: counts.get(kind) ?? 0 }))
}

export function searchableItems() {
  return [
    ...people.map((person) => ({ id: person.id, type: '人物', label: primaryName(person.id), text: `${person.summary} ${person.roles.join(' ')}` })),
    ...places.map((place) => ({ id: place.id, type: '地点', label: place.name, text: `${place.historicalName} ${place.modernName} ${place.summary}` })),
    ...events.map((event) => ({ id: event.id, type: '事件', label: event.title, text: event.summary })),
    ...works.map((work) => ({ id: work.id, type: '作品', label: work.title, text: work.themes.join(' ') }))
  ]
}

export const datasetStats = {
  people: people.length,
  places: places.length,
  events: events.length + appointments.length,
  relations: relations.length,
  works: works.length,
  sources: sources.length
}
