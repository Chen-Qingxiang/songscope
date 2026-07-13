import {
  assertionEvidenceResponseSchema,
  careerTimelineResponseSchema,
  eventResponseSchema,
  personResponseSchema,
  searchResponseSchema,
  sourceResponseSchema,
  type AssertionEvidenceResponse,
  type CareerTimelineResponse,
  type EventResponse,
  type PersonResponse,
  type SearchResponse,
  type SourceResponse
} from '@songscope/schema'

export type ResearchTimelineResponse = CareerTimelineResponse
export type ResearchTimelineItem = CareerTimelineResponse['items'][number]
export type { AssertionEvidenceResponse, EventResponse, PersonResponse, SearchResponse, SourceResponse }

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

async function getJson<T>(path: string, schema: { parse(input: unknown): T }): Promise<T> {
  const response = await fetch(`${apiBase}${path}`)
  const body = await response.json().catch(() => null) as { message?: string } | null
  if (!response.ok) throw new Error(body?.message ?? `SongScope API returned ${response.status}`)
  return schema.parse(body)
}

export function fetchPerson(personSid = 'person:sushi') {
  return getJson<PersonResponse>(`/people/${encodeURIComponent(personSid)}`, personResponseSchema)
}

export function fetchResearchTimeline(personSid = 'person:sushi') {
  return getJson<ResearchTimelineResponse>(`/people/${encodeURIComponent(personSid)}/career`, careerTimelineResponseSchema)
}

export function fetchAssertionEvidence(assertionSid: string) {
  return getJson<AssertionEvidenceResponse>(`/assertions/${encodeURIComponent(assertionSid)}/evidence`, assertionEvidenceResponseSchema)
}

export function fetchEvent(eventSid: string) {
  return getJson<EventResponse>(`/events/${encodeURIComponent(eventSid)}`, eventResponseSchema)
}

export function fetchSource(sourceSid: string) {
  return getJson<SourceResponse>(`/sources/${encodeURIComponent(sourceSid)}`, sourceResponseSchema)
}

export function searchResearchData(query: string) {
  return getJson<SearchResponse>(`/search?q=${encodeURIComponent(query)}`, searchResponseSchema)
}
