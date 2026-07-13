import {
  assertionEvidenceResponseSchema,
  careerTimelineResponseSchema,
  eventResponseSchema,
  personResponseSchema,
  searchResponseSchema,
  sourceResponseSchema
} from '@songscope/schema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchResearchTimeline } from './researchApi'
import {
  getStaticAssertionEvidence,
  getStaticCareer,
  getStaticEvent,
  getStaticPerson,
  getStaticSource,
  searchStaticResearchData
} from './staticResearchData'

afterEach(() => vi.unstubAllGlobals())

const validCareer = {
  datasetVersion: 'test-v0.2',
  person: { sid: 'person:sushi', name: '苏轼' },
  items: [{
    id: 'event:appointment:sushi-hangzhou-1071',
    itemType: 'appointment',
    year: 1071,
    yearLabel: '熙宁四年',
    precision: 'year',
    uncertainty: 'exact',
    title: '通判杭州',
    summary: 'test',
    place: { sid: 'place:hangzhou', name: '杭州', resolutionStatus: 'modern-proxy', longitude: 120.15, latitude: 30.27, note: '现代对应近似点' },
    evidenceSummary: { assertionSid: 'assertion:sushi-appointed-hangzhou', accepted: true, evidenceCount: 3, sourceTitles: ['《宋史》'], locatorLabels: ['卷338'] }
  }]
}

describe('research API adapter', () => {
  it('uses the career endpoint and validates the response with the shared schema', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(validCareer), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchResearchTimeline()
    expect(fetchMock).toHaveBeenCalledWith('/api/people/person%3Asushi/career')
    expect(result.items[0].place?.name).toBe('杭州')
  })

  it('rejects malformed API payloads instead of silently rendering them', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...validCareer, datasetVersion: 7 }), { status: 200 })))
    await expect(fetchResearchTimeline()).rejects.toThrow()
  })
})

describe('GitHub Pages static research adapter', () => {
  it('projects the verified curated dataset without a running API', () => {
    const career = careerTimelineResponseSchema.parse(getStaticCareer('person:sushi'))
    expect(career.datasetVersion).toBe('2026.07.13-sushi-career.1')
    expect(career.items.map((item) => item.place?.sid)).toEqual(expect.arrayContaining([
      'place:hangzhou', 'place:mizhou', 'place:xuzhou', 'place:huzhou', 'place:huangzhou'
    ]))
    expect(new Set(career.items.map((item) => item.itemType))).toEqual(new Set([
      'appointment', 'service', 'movement', 'disaster', 'disaster-response', 'political', 'residence'
    ]))
    expect(career.items.length).toBeGreaterThanOrEqual(17)
    expect(career.items.every((item) => item.evidenceSummary.accepted && item.evidenceSummary.evidenceCount > 0)).toBe(true)

    personResponseSchema.parse(getStaticPerson('person:sushi'))
    assertionEvidenceResponseSchema.parse(getStaticAssertionEvidence('assertion:sushi-appointed-hangzhou'))
    const punishment = eventResponseSchema.parse(getStaticEvent('event:appointment:sushi-huangzhou-1079'))
    expect(punishment.appointment?.components.map((item) => item.officeCategory)).toEqual(['honorific', 'status'])
    const source = sourceResponseSchema.parse(getStaticSource('source:work:songshi'))
    expect(source.assertions.length).toBeGreaterThan(10)
    const search = searchResponseSchema.parse(searchStaticResearchData('黄州'))
    expect(search.results.length).toBeGreaterThan(0)
  })
})
