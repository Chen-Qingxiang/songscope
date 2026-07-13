import { curatedDatasetSchema, type CuratedDataset } from '@songscope/schema'
import metadata from '../../data/curated/dataset.json'
import people from '../../data/curated/people/people.json'
import places from '../../data/curated/places/places.json'
import offices from '../../data/curated/offices/offices.json'
import temporalExtents from '../../data/curated/events/temporal-extents.json'
import sourceWorks from '../../data/curated/sources/works.json'
import sourceItems from '../../data/curated/sources/items.json'
import passages from '../../data/curated/passages/passages.json'
import events from '../../data/curated/events/events.json'
import eventParticipations from '../../data/curated/events/participations.json'
import eventRelations from '../../data/curated/events/relations.json'
import appointments from '../../data/curated/appointments/appointments.json'
import appointmentComponents from '../../data/curated/appointments/components.json'
import serviceEpisodes from '../../data/curated/service-episodes/service-episodes.json'
import assertions from '../../data/curated/assertions/assertions.json'
import evidenceLinks from '../../data/curated/assertions/evidence-links.json'

const dataset: CuratedDataset = curatedDatasetSchema.parse({
  metadata,
  people,
  places,
  offices,
  temporalExtents,
  sourceWorks,
  sourceItems,
  passages,
  events,
  eventParticipations,
  eventRelations,
  appointments,
  appointmentComponents,
  serviceEpisodes,
  assertions,
  evidenceLinks
})

function bySid<T extends { sid: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.sid, item]))
}

const peopleBySid = bySid(dataset.people)
const placesBySid = bySid(dataset.places)
const officesBySid = bySid(dataset.offices)
const timesBySid = bySid(dataset.temporalExtents)
const worksBySid = bySid(dataset.sourceWorks)
const itemsBySid = bySid(dataset.sourceItems)
const passagesBySid = bySid(dataset.passages)
const eventsBySid = bySid(dataset.events)

function unique(values: string[]) {
  return [...new Set(values)]
}

function dateDetail(temporalExtentSid: string | null) {
  if (!temporalExtentSid) return null
  const time = timesBySid.get(temporalExtentSid)
  if (!time) return null
  return {
    original: time.originalText,
    normalizedStart: time.normalizedStart,
    normalizedEnd: time.normalizedEnd,
    precision: time.precision,
    uncertainty: time.certainty,
    conversionMethod: time.conversionMethod,
    conversionNote: time.conversionNote
  }
}

function placeSummary(placeSid: string | null) {
  if (!placeSid) return null
  const place = placesBySid.get(placeSid)
  if (!place) return null
  return {
    sid: place.sid,
    name: place.preferredName,
    resolutionStatus: place.geometryStatus,
    longitude: place.longitude,
    latitude: place.latitude,
    note: place.note
  }
}

function evidenceSummary(assertionSid: string) {
  const assertion = dataset.assertions.find((item) => item.sid === assertionSid)
  const links = dataset.evidenceLinks.filter((item) => item.assertionSid === assertionSid && item.stance === 'supports')
  const linkedPassages = links.flatMap((link) => {
    const passage = passagesBySid.get(link.locatorSid)
    return passage ? [passage] : []
  })
  const linkedItems = linkedPassages.flatMap((passage) => {
    const item = itemsBySid.get(passage.sourceItemSid)
    return item ? [item] : []
  })
  return {
    assertionSid,
    accepted: assertion?.status === 'accepted',
    evidenceCount: links.length,
    sourceTitles: unique(linkedItems.flatMap((item) => {
      const work = worksBySid.get(item.workSid)
      return work ? [work.title] : []
    })),
    locatorLabels: unique(linkedPassages.map((passage) => passage.locatorValue))
  }
}

function acceptedAssertionFor(subjectSid: string) {
  return dataset.assertions.find((item) => item.subjectSid === subjectSid && item.status === 'accepted')
}

function timelineItem(args: {
  id: string
  itemType: string
  temporalExtentSid: string
  title: string
  summary: string
  placeSid: string | null
  sequenceIndex: number
}) {
  const time = timesBySid.get(args.temporalExtentSid)
  const assertion = acceptedAssertionFor(args.id)
  if (!time || !assertion || !time.normalizedStart) return null
  return {
    id: args.id,
    itemType: args.itemType,
    year: Number(time.normalizedStart.slice(0, 4)),
    yearLabel: time.originalText,
    precision: time.precision,
    uncertainty: time.certainty,
    title: args.title,
    summary: args.summary,
    place: placeSummary(args.placeSid),
    evidenceSummary: evidenceSummary(assertion.sid),
    sequenceIndex: args.sequenceIndex
  }
}

export function getStaticPerson(sid: string) {
  const person = peopleBySid.get(sid)
  if (!person) return null
  return {
    datasetVersion: dataset.metadata.datasetVersion,
    sid: person.sid,
    name: person.primaryName,
    traditionalName: person.traditionalName,
    birthYear: person.birthYear,
    deathYear: person.deathYear,
    summary: person.summary
  }
}

export function getStaticCareer(sid: string) {
  const person = peopleBySid.get(sid)
  if (!person) return null

  const appointmentItems = dataset.appointments.flatMap((appointment) => {
    if (appointment.personSid !== sid) return []
    const event = eventsBySid.get(appointment.eventSid)
    if (!event) return []
    const item = timelineItem({
      id: appointment.sid,
      itemType: 'appointment',
      temporalExtentSid: appointment.temporalExtentSid,
      title: event.label,
      summary: event.description,
      placeSid: event.placeSid,
      sequenceIndex: event.sequence
    })
    return item ? [item] : []
  })

  const serviceItems = dataset.serviceEpisodes.flatMap((episode) => {
    if (episode.personSid !== sid) return []
    const sourceEvent = eventsBySid.get(episode.createdByEventSid ?? episode.derivedFromAppointmentSid ?? '')
    const office = episode.dutyOfficeSid ? officesBySid.get(episode.dutyOfficeSid) : null
    const item = timelineItem({
      id: episode.sid,
      itemType: episode.episodeType === 'residence' ? 'residence' : 'service',
      temporalExtentSid: episode.temporalExtentSid,
      title: episode.episodeType === 'residence' ? '黄州实际居住状态' : `实际任职：${office?.label ?? '未知职务'}`,
      summary: episode.note,
      placeSid: episode.placeSid,
      sequenceIndex: (sourceEvent?.sequence ?? 0) + 1
    })
    return item ? [item] : []
  })

  const researchEventTypes = new Set(['movement', 'political', 'disaster', 'disaster-response'])
  const researchItems = dataset.events.flatMap((event) => {
    if (!researchEventTypes.has(event.eventType) || event.parentEventSid) return []
    const directlyParticipates = dataset.eventParticipations.some((item) => item.eventSid === event.sid && item.entitySid === sid)
    const responseByPerson = dataset.eventRelations.some((relation) =>
      relation.objectEventSid === event.sid && relation.relationType === 'responded-to' &&
      dataset.eventParticipations.some((item) => item.eventSid === relation.subjectEventSid && item.entitySid === sid)
    )
    if (!directlyParticipates && !responseByPerson) return []
    const item = timelineItem({
      id: event.sid,
      itemType: event.eventType,
      temporalExtentSid: event.temporalExtentSid,
      title: event.label,
      summary: event.description,
      placeSid: event.placeSid,
      sequenceIndex: event.sequence
    })
    return item ? [item] : []
  })

  const typeOrder = new Map([
    ['appointment', 1], ['movement', 2], ['service', 3], ['disaster', 4],
    ['disaster-response', 5], ['political', 6], ['residence', 7]
  ])
  const items = [...appointmentItems, ...serviceItems, ...researchItems]
    .sort((left, right) => left.year - right.year || left.sequenceIndex - right.sequenceIndex ||
      (typeOrder.get(left.itemType) ?? 99) - (typeOrder.get(right.itemType) ?? 99) || left.id.localeCompare(right.id))
    .map(({ sequenceIndex: _sequenceIndex, ...item }) => item)

  return {
    datasetVersion: dataset.metadata.datasetVersion,
    person: { sid: person.sid, name: person.primaryName },
    items
  }
}

export function getStaticAssertionEvidence(sid: string) {
  const assertion = dataset.assertions.find((item) => item.sid === sid)
  if (!assertion) return null
  const evidence = dataset.evidenceLinks.flatMap((link) => {
    if (link.assertionSid !== sid) return []
    const passage = passagesBySid.get(link.locatorSid)
    const item = passage ? itemsBySid.get(passage.sourceItemSid) : null
    const work = item ? worksBySid.get(item.workSid) : null
    if (!passage || !item || !work) return []
    return [{
      stance: link.stance,
      note: link.note,
      locator: { sid: passage.sid, type: passage.locatorType, value: passage.locatorValue, quote: passage.quoteText },
      source: { sid: work.sid, title: work.title, item: item.label, citation: item.citation, url: item.url }
    }]
  })
  return {
    datasetVersion: dataset.metadata.datasetVersion,
    assertion: {
      sid: assertion.sid,
      subjectSid: assertion.subjectSid,
      predicate: assertion.predicate,
      status: assertion.status,
      confidence: assertion.confidence,
      rationale: assertion.rationale,
      date: dateDetail(assertion.temporalExtentSid)
    },
    evidence
  }
}

export function getStaticEvent(sid: string) {
  const event = eventsBySid.get(sid)
  const date = event ? dateDetail(event.temporalExtentSid) : null
  if (!event || !date) return null

  const participants = dataset.eventParticipations.flatMap((participation) => {
    if (participation.eventSid !== sid) return []
    const person = peopleBySid.get(participation.entitySid)
    const place = placesBySid.get(participation.entitySid)
    if (!person && !place) return []
    return [{
      sid: participation.entitySid,
      label: person?.primaryName ?? place?.preferredName ?? participation.entitySid,
      entityType: participation.entitySid.split(':', 1)[0],
      role: participation.role
    }]
  }).sort((left, right) => left.role.localeCompare(right.role) || left.label.localeCompare(right.label))

  const relations: Array<{
    direction: 'outgoing' | 'incoming'
    relationType: string
    note: string
    event: { sid: string; label: string; eventType: string }
  }> = []
  for (const relation of dataset.eventRelations) {
    if (relation.subjectEventSid === sid) {
      const related = eventsBySid.get(relation.objectEventSid)
      if (related) relations.push({ direction: 'outgoing', relationType: relation.relationType, note: relation.note, event: { sid: related.sid, label: related.label, eventType: related.eventType } })
    }
    if (relation.objectEventSid === sid) {
      const related = eventsBySid.get(relation.subjectEventSid)
      if (related) relations.push({ direction: 'incoming', relationType: relation.relationType, note: relation.note, event: { sid: related.sid, label: related.label, eventType: related.eventType } })
    }
  }

  const appointment = dataset.appointments.find((item) => item.sid === sid)
  const appointmentDetail = appointment ? {
    actionType: appointment.actionType,
    rawExpression: appointment.rawExpression,
    note: appointment.note,
    components: dataset.appointmentComponents.flatMap((component) => {
      if (component.appointmentActionSid !== sid) return []
      const office = officesBySid.get(component.officeConceptSid)
      const place = component.placeSid ? placesBySid.get(component.placeSid) : null
      if (!office) return []
      return [{
        componentType: component.componentType,
        rawExpression: component.rawExpression,
        officeSid: office.sid,
        officeLabel: office.label,
        officeCategory: office.category,
        placeSid: place?.sid ?? null,
        placeName: place?.preferredName ?? null
      }]
    })
  } : null

  return {
    datasetVersion: dataset.metadata.datasetVersion,
    event: {
      sid: event.sid,
      eventType: event.eventType,
      label: event.label,
      description: event.description,
      status: event.status,
      date,
      place: placeSummary(event.placeSid)
    },
    participants,
    children: dataset.events.filter((item) => item.parentEventSid === sid).map((item) => ({ sid: item.sid, eventType: item.eventType, label: item.label })).sort((left, right) => left.sid.localeCompare(right.sid)),
    relations,
    appointment: appointmentDetail,
    assertions: dataset.assertions.filter((item) => item.subjectSid === sid).map((item) => evidenceSummary(item.sid)).sort((left, right) => left.assertionSid.localeCompare(right.assertionSid))
  }
}

export function getStaticSource(sid: string) {
  const work = worksBySid.get(sid)
  if (!work) return null
  const items = dataset.sourceItems.filter((item) => item.workSid === sid).map((item) => ({
    sid: item.sid,
    label: item.label,
    url: item.url,
    citation: item.citation,
    locators: dataset.passages.filter((passage) => passage.sourceItemSid === item.sid).map((passage) => ({
      sid: passage.sid,
      type: passage.locatorType,
      value: passage.locatorValue,
      quote: passage.quoteText
    }))
  }))
  const itemSids = new Set(items.map((item) => item.sid))
  const locatorSids = new Set(dataset.passages.filter((passage) => itemSids.has(passage.sourceItemSid)).map((passage) => passage.sid))
  const linkedAssertions = dataset.evidenceLinks.flatMap((link) => {
    if (!locatorSids.has(link.locatorSid)) return []
    const assertion = dataset.assertions.find((item) => item.sid === link.assertionSid)
    return assertion ? [{
      sid: assertion.sid,
      subjectSid: assertion.subjectSid,
      predicate: assertion.predicate,
      status: assertion.status,
      stance: link.stance,
      locatorSid: link.locatorSid
    }] : []
  })
  return { datasetVersion: dataset.metadata.datasetVersion, source: work, items, assertions: linkedAssertions }
}

export function searchStaticResearchData(query: string) {
  const normalized = query.trim().toLocaleLowerCase('zh-CN')
  const matches = (values: Array<string | null>) => values.some((value) => value?.toLocaleLowerCase('zh-CN').includes(normalized))
  const results = [
    ...dataset.people.filter((item) => matches([item.primaryName, item.traditionalName, item.summary])).map((item) => ({ sid: item.sid, type: 'person', label: item.primaryName, description: item.summary })),
    ...dataset.places.filter((item) => matches([item.preferredName, item.historicalName, item.note])).map((item) => ({ sid: item.sid, type: 'place', label: item.preferredName, description: item.note })),
    ...dataset.events.filter((item) => matches([item.label, item.description])).map((item) => ({ sid: item.sid, type: 'event', label: item.label, description: item.description })),
    ...dataset.sourceWorks.filter((item) => matches([item.title, item.creator])).map((item) => ({ sid: item.sid, type: 'source', label: item.title, description: item.creator }))
  ].sort((left, right) => left.type.localeCompare(right.type) || left.label.localeCompare(right.label)).slice(0, 30)
  return { datasetVersion: dataset.metadata.datasetVersion, query, results }
}
