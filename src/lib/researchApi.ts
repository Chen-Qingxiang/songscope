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
import {
  getStaticAssertionEvidence,
  getStaticCareer,
  getStaticEvent,
  getStaticPerson,
  getStaticSource,
  searchStaticResearchData
} from './staticResearchData'

export type ResearchTimelineResponse = CareerTimelineResponse
export type ResearchTimelineItem = CareerTimelineResponse['items'][number]
export type { AssertionEvidenceResponse, EventResponse, PersonResponse, SearchResponse, SourceResponse }

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const useStaticData = import.meta.env.PROD && !configuredApiBase
const apiBase = configuredApiBase ?? '/api'

export const researchDataMode = useStaticData ? 'static' : 'api'

async function getJson<T>(path: string, schema: { parse(input: unknown): T }): Promise<T> {
  const response = await fetch(`${apiBase}${path}`)
  const body = await response.json().catch(() => null) as { message?: string } | null
  if (!response.ok) throw new Error(body?.message ?? `SongScope API returned ${response.status}`)
  return schema.parse(body)
}

function getStaticJson<T>(body: unknown | null, schema: { parse(input: unknown): T }, label: string): Promise<T> {
  if (!body) return Promise.reject(new Error(`内置正式数据中未找到${label}`))
  return Promise.resolve(schema.parse(body))
}

export function fetchPerson(personSid = 'person:sushi') {
  if (useStaticData) return getStaticJson(getStaticPerson(personSid), personResponseSchema, '人物')
  return getJson<PersonResponse>(`/people/${encodeURIComponent(personSid)}`, personResponseSchema)
}

export function fetchResearchTimeline(personSid = 'person:sushi') {
  if (useStaticData) return getStaticJson(getStaticCareer(personSid), careerTimelineResponseSchema, '仕宦记录')
  return getJson<ResearchTimelineResponse>(`/people/${encodeURIComponent(personSid)}/career`, careerTimelineResponseSchema)
}

export function fetchAssertionEvidence(assertionSid: string) {
  if (useStaticData) return getStaticJson(getStaticAssertionEvidence(assertionSid), assertionEvidenceResponseSchema, '断言证据')
  return getJson<AssertionEvidenceResponse>(`/assertions/${encodeURIComponent(assertionSid)}/evidence`, assertionEvidenceResponseSchema)
}

export function fetchEvent(eventSid: string) {
  if (useStaticData) return getStaticJson(getStaticEvent(eventSid), eventResponseSchema, '事件')
  return getJson<EventResponse>(`/events/${encodeURIComponent(eventSid)}`, eventResponseSchema)
}

export function fetchSource(sourceSid: string) {
  if (useStaticData) return getStaticJson(getStaticSource(sourceSid), sourceResponseSchema, '来源')
  return getJson<SourceResponse>(`/sources/${encodeURIComponent(sourceSid)}`, sourceResponseSchema)
}

export function searchResearchData(query: string) {
  if (useStaticData) return getStaticJson(searchStaticResearchData(query), searchResponseSchema, '搜索结果')
  return getJson<SearchResponse>(`/search?q=${encodeURIComponent(query)}`, searchResponseSchema)
}
