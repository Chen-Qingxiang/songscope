import { describe, expect, it } from 'vitest'
import { appointments, events, people, places, relations, sources, works } from '../data/songData'

function expectUnique(ids: string[]) {
  expect(new Set(ids).size).toBe(ids.length)
}

describe('SongScope seed data integrity', () => {
  it('uses unique ids within every entity type', () => {
    ;[people, places, events, appointments, relations, works, sources].forEach((items) => expectUnique(items.map((item) => item.id)))
  })

  it('keeps all entity references resolvable', () => {
    const personIds = new Set(people.map((item) => item.id))
    const placeIds = new Set(places.map((item) => item.id))
    const sourceIds = new Set(sources.map((item) => item.id))

    appointments.forEach((item) => {
      expect(personIds.has(item.personId)).toBe(true)
      if (item.placeId) expect(placeIds.has(item.placeId)).toBe(true)
      item.sourceIds.forEach((id) => expect(sourceIds.has(id)).toBe(true))
    })

    events.forEach((item) => {
      item.personIds.forEach((id) => expect(personIds.has(id)).toBe(true))
      if (item.placeId) expect(placeIds.has(item.placeId)).toBe(true)
    })

    relations.forEach((item) => {
      expect(personIds.has(item.sourcePersonId)).toBe(true)
      expect(personIds.has(item.targetPersonId)).toBe(true)
    })

    works.forEach((item) => {
      expect(personIds.has(item.authorId)).toBe(true)
      if (item.placeId) expect(placeIds.has(item.placeId)).toBe(true)
    })
  })

  it('keeps appointment years inside the recorded lifetime', () => {
    const peopleById = new Map(people.map((person) => [person.id, person]))
    appointments.forEach((appointment) => {
      const person = peopleById.get(appointment.personId)
      expect(person).toBeDefined()
      expect(appointment.startYear).toBeGreaterThanOrEqual(person!.birthYear)
      expect(appointment.startYear).toBeLessThanOrEqual(person!.deathYear)
    })
  })
})
