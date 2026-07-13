import {
  annalsResponseSchema,
  assertionEvidenceResponseSchema,
  careerTimelineResponseSchema,
  corpusCatalogResponseSchema,
  corpusSearchShardSchema,
  corpusStaticIndexSchema,
  coverageResponseSchema,
  entityPassagesResponseSchema,
  eventResponseSchema,
  passageDetailResponseSchema,
  personResponseSchema,
  searchResponseSchema,
  sourceResponseSchema,
  textSearchResponseSchema,
  unitPassagesResponseSchema,
  type AnnalsResponse,
  type AssertionEvidenceResponse,
  type CareerTimelineResponse,
  type CorpusCatalogResponse,
  type CorpusDivision,
  type CoverageResponse,
  type EntityPassagesResponse,
  type EventResponse,
  type PassageDetailResponse,
  type PersonResponse,
  type SearchResponse,
  type SourceResponse,
  type TextSearchResponse,
  type UnitPassagesResponse
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
export type {
  AnnalsResponse,
  AssertionEvidenceResponse,
  CorpusCatalogResponse,
  CoverageResponse,
  EntityPassagesResponse,
  EventResponse,
  PassageDetailResponse,
  PersonResponse,
  SearchResponse,
  SourceResponse,
  TextSearchResponse,
  UnitPassagesResponse
}

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const useStaticData = import.meta.env.PROD && !configuredApiBase
const apiBase = configuredApiBase ?? '/api'
const staticCorpusBase = `${import.meta.env.BASE_URL}corpus`

export const researchDataMode = useStaticData ? 'static' : 'api'

async function getJson<T>(path: string, schema: { parse(input: unknown): T }): Promise<T> {
  const response = await fetch(`${apiBase}${path}`)
  const body = await response.json().catch(() => null) as { message?: string } | null
  if (!response.ok) throw new Error(body?.message ?? `SongScope API returned ${response.status}`)
  return schema.parse(body)
}

async function getStaticCorpusJson<T>(path: string, schema: { parse(input: unknown): T }): Promise<T> {
  const response = await fetch(`${staticCorpusBase}/${path}`)
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`静态语料投影读取失败（${response.status}）`)
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

export function fetchCorpusCatalog() {
  if (useStaticData) return getStaticCorpusJson('catalog.json', corpusCatalogResponseSchema)
  return getJson<CorpusCatalogResponse>('/corpus', corpusCatalogResponseSchema)
}

function juanFromSid(sid: string): number {
  const value = Number(sid.match(/juan(\d{3})/)?.[1])
  if (!Number.isInteger(value) || value < 1 || value > 496) throw new Error(`SID 中没有有效卷次：${sid}`)
  return value
}

function juanKey(juan: number): string {
  return String(juan).padStart(3, '0')
}

export function fetchUnitPassages(unitSid: string, options: { offset?: number; limit?: number } = {}) {
  if (useStaticData) return getStaticCorpusJson(`volumes/${juanKey(juanFromSid(unitSid))}.json`, unitPassagesResponseSchema)
  const params = new URLSearchParams()
  if (options.offset !== undefined) params.set('offset', String(options.offset))
  if (options.limit !== undefined) params.set('limit', String(options.limit))
  const query = params.size ? `?${params}` : ''
  return getJson<UnitPassagesResponse>(`/units/${encodeURIComponent(unitSid)}/passages${query}`, unitPassagesResponseSchema)
}

export async function fetchCorpusPassage(passageSid: string) {
  if (!useStaticData) return getJson<PassageDetailResponse>(`/passages/${encodeURIComponent(passageSid)}`, passageDetailResponseSchema)
  const volume = await fetchUnitPassages(passageSid)
  const index = volume.passages.findIndex((passage) => passage.sid === passageSid)
  if (index < 0) throw new Error('静态语料投影中未找到该段落')
  const passage = volume.passages[index]
  return passageDetailResponseSchema.parse({
    datasetVersion: volume.datasetVersion,
    corpusVersion: volume.corpusVersion,
    snapshotSid: volume.snapshotSid,
    passage,
    source: volume.source,
    stableCitation: `《宋史》卷${passage.juan}，第${passage.sequenceIndex}段，中文维基文库 revision ${volume.source.revisionId}，SongScope passage ${passage.sid}`,
    previous: index > 0 ? { sid: volume.passages[index - 1].sid, sequenceIndex: volume.passages[index - 1].sequenceIndex } : null,
    next: index + 1 < volume.passages.length ? { sid: volume.passages[index + 1].sid, sequenceIndex: volume.passages[index + 1].sequenceIndex } : null
  })
}

export interface CorpusTextSearchOptions {
  division?: CorpusDivision
  juan?: number
  status?: 'raw' | 'reviewed'
  offset?: number
  limit?: number
}

export async function searchCorpusText(query: string, options: CorpusTextSearchOptions = {}) {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) throw new Error('检索词不能为空')
  if (!useStaticData) {
    const params = new URLSearchParams({ q: normalizedQuery })
    if (options.division) params.set('division', options.division)
    if (options.juan !== undefined) params.set('juan', String(options.juan))
    if (options.status) params.set('status', options.status)
    if (options.offset !== undefined) params.set('offset', String(options.offset))
    if (options.limit !== undefined) params.set('limit', String(options.limit))
    return getJson<TextSearchResponse>(`/search/text?${params}`, textSearchResponseSchema)
  }

  const [index, catalog] = await Promise.all([
    getStaticCorpusJson('index.json', corpusStaticIndexSchema),
    fetchCorpusCatalog()
  ])
  const relevantShards = index.shards.filter((shard) => options.juan === undefined || (options.juan >= shard.fromJuan && options.juan <= shard.toJuan))
  const shards = await Promise.all(relevantShards.map((shard) => getStaticCorpusJson(shard.file, corpusSearchShardSchema)))
  const results: TextSearchResponse['results'] = []
  for (const passage of shards.flatMap((shard) => shard.passages)) {
    if (options.division && passage.division !== options.division) continue
    if (options.juan !== undefined && passage.juan !== options.juan) continue
    if (options.status && passage.reviewStatus !== options.status) continue
    const text = passage.sourceText
    let start = text.indexOf(normalizedQuery)
    while (start >= 0) {
      const end = start + normalizedQuery.length
      const contextStart = Math.max(0, start - 36)
      const contextEnd = Math.min(text.length, end + 36)
      results.push({
        occurrenceType: 'occurrence',
        passageSid: passage.passageSid,
        unitSid: passage.unitSid,
        juan: passage.juan,
        division: passage.division,
        sequenceIndex: passage.sequenceIndex,
        context: `${contextStart > 0 ? '…' : ''}${text.slice(contextStart, contextEnd)}${contextEnd < text.length ? '…' : ''}`,
        matchStart: Array.from(text.slice(0, start)).length,
        matchEnd: Array.from(text.slice(0, end)).length,
        reviewStatus: passage.reviewStatus,
        sourceRevisionId: passage.sourceRevisionId
      })
      start = text.indexOf(normalizedQuery, end)
    }
  }
  const offset = Math.max(0, options.offset ?? 0)
  const limit = Math.min(500, Math.max(1, options.limit ?? 100))
  return textSearchResponseSchema.parse({
    datasetVersion: index.datasetVersion,
    corpusVersion: index.corpusVersion,
    snapshotSid: index.snapshotSid,
    query: normalizedQuery,
    occurrenceLabel: '文本命中',
    filters: { division: options.division ?? null, juan: options.juan ?? null, status: options.status ?? null },
    pagination: { offset, limit, total: results.length },
    results: results.slice(offset, offset + limit),
    coverage: catalog.coverage,
    exportMetadata: {
      queryId: 'songshi-literal-text-search', queryVersion: '1.0.0',
      datasetVersion: index.datasetVersion, corpusVersion: index.corpusVersion, snapshotSid: index.snapshotSid,
      statisticalUnit: 'exact non-overlapping text occurrence',
      columns: ['passageSid', 'juan', 'division', 'sequenceIndex', 'context', 'matchStart', 'matchEnd', 'sourceRevisionId']
    }
  })
}

export function fetchEntityPassages(entitySid: string) {
  if (useStaticData) {
    if (entitySid !== 'person:sushi') return Promise.reject(new Error('当前静态正式投影只提供已整理实体 person:sushi'))
    return getStaticCorpusJson('entities/person_sushi.json', entityPassagesResponseSchema)
  }
  return getJson<EntityPassagesResponse>(`/entities/${encodeURIComponent(entitySid)}/passages`, entityPassagesResponseSchema)
}

export function fetchAnnals(options: { fromJuan?: number; toJuan?: number; status?: 'candidate' | 'reviewed' | 'rejected' } = {}) {
  if (useStaticData && !options.status && options.fromJuan === undefined && options.toJuan === undefined) {
    return getStaticCorpusJson('annals.json', annalsResponseSchema)
  }
  if (useStaticData) {
    return getStaticCorpusJson('annals.json', annalsResponseSchema).then((response) => annalsResponseSchema.parse({
      ...response,
      query: {
        ...response.query,
        fromJuan: options.fromJuan ?? 14,
        toJuan: options.toJuan ?? 16,
        annotationStatus: options.status ?? null
      },
      rows: response.rows.filter((row) =>
        row.juan >= (options.fromJuan ?? 14) && row.juan <= (options.toJuan ?? 16)
      ).map((row) => ({
        ...row,
        chronology: options.status && options.status !== 'candidate' ? [] : row.chronology,
        candidateCounts: options.status && options.status !== 'candidate'
          ? Object.fromEntries(Object.keys(row.candidateCounts).map((key) => [key, 0]))
          : row.candidateCounts
      }))
    }))
  }
  const params = new URLSearchParams()
  if (options.fromJuan !== undefined) params.set('fromJuan', String(options.fromJuan))
  if (options.toJuan !== undefined) params.set('toJuan', String(options.toJuan))
  if (options.status) params.set('status', options.status)
  const query = params.size ? `?${params}` : ''
  return getJson<AnnalsResponse>(`/research/annals${query}`, annalsResponseSchema)
}

export function fetchCorpusCoverage(version?: string) {
  if (useStaticData) return getStaticCorpusJson('coverage.json', coverageResponseSchema).then((response) => {
    if (version && version !== response.datasetVersion && version !== response.corpusVersion) throw new Error(`静态投影中不存在数据版本 ${version}`)
    return response
  })
  return getJson<CoverageResponse>(`/datasets/${encodeURIComponent(version ?? 'current')}/coverage`, coverageResponseSchema)
}
