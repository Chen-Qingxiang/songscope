import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchResearchTimeline } from './researchApi'

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
