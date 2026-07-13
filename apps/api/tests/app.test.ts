import { describe, expect, it } from 'vitest'
import type { SongScopeRepository } from '@songscope/db/src/repository.js'
import { createRequestHandler } from '../src/app.js'

const career = {
  datasetVersion: 'test',
  person: { sid: 'person:sushi', name: '苏轼' },
  items: [{
    id: 'event:appointment:sushi-mizhou-1074', itemType: 'appointment', year: 1074,
    yearLabel: '熙宁七年', precision: 'year', uncertainty: 'exact', title: '徙知密州',
    summary: 'test', place: { sid: 'place:mizhou', name: '密州', resolutionStatus: 'modern-proxy', longitude: 119.4, latitude: 36, note: '现代对应近似点' },
    evidenceSummary: {
      assertionSid: 'assertion:sushi-appointed-mizhou', accepted: true,
      evidenceCount: 2, sourceTitles: ['《宋史》'], locatorLabels: ['卷338']
    }
  }]
}

const event = {
  datasetVersion: 'test',
  event: {
    sid: 'event:wutai-1079', eventType: 'political', label: '乌台诗案', description: 'test', status: 'verified',
    date: { original: '元丰二年', normalizedStart: '1079-01-01', normalizedEnd: '1079-12-31', precision: 'year', uncertainty: 'exact', conversionMethod: 'test', conversionNote: 'test' },
    place: null
  },
  participants: [], children: [], relations: [], appointment: null, assertions: []
}

const repository: SongScopeRepository = {
  getDatasetVersion: async () => 'test',
  getPerson: async () => ({ datasetVersion: 'test', sid: 'person:sushi', name: '苏轼', traditionalName: '蘇軾', birthYear: 1037, deathYear: 1101, summary: 'test' }),
  getCareer: async () => career,
  getEvent: async () => event,
  getAssertionEvidence: async () => ({
    datasetVersion: 'test',
    assertion: { sid: 'assertion:test', subjectSid: 'event:test', predicate: 'test', status: 'accepted', confidence: 1, rationale: 'test', date: null },
    evidence: []
  }),
  getSource: async () => ({
    datasetVersion: 'test', source: { sid: 'source:work:test', title: '测试来源', creator: '测试', workType: 'primary-source' }, items: [], assertions: []
  }),
  search: async (query) => ({ datasetVersion: 'test', query, results: [] })
}

const handle = createRequestHandler(repository)

describe('SongScope API', () => {
  it('returns dataset version from health', async () => {
    const response = await handle(new Request('http://test/health'))
    expect(response.status).toBe(200)
    expect((await response.json() as { datasetVersion: string }).datasetVersion).toBe('test')
  })

  it('returns a validated career projection from the stable endpoint', async () => {
    const response = await handle(new Request('http://test/api/people/person:sushi/career?from=1074&type=appointment'))
    expect(response.status).toBe(200)
    const body = await response.json() as { items: Array<{ evidenceSummary: { evidenceCount: number } }> }
    expect(body.items[0].evidenceSummary.evidenceCount).toBe(2)
  })

  it('keeps the timeline endpoint as a compatibility alias', async () => {
    expect((await handle(new Request('http://test/api/people/person:sushi/timeline'))).status).toBe(200)
  })

  it('returns validated event, source and search responses', async () => {
    expect((await handle(new Request('http://test/api/events/event:wutai-1079'))).status).toBe(200)
    expect((await handle(new Request('http://test/api/sources/source:work:test'))).status).toBe(200)
    expect((await handle(new Request('http://test/api/search?q=苏轼'))).status).toBe(200)
  })

  it('rejects malformed SIDs and invalid filters with 400', async () => {
    expect((await handle(new Request('http://test/api/people/not-a-sid'))).status).toBe(400)
    expect((await handle(new Request('http://test/api/people/person:sushi/career?from=abc'))).status).toBe(400)
    expect((await handle(new Request('http://test/api/search?q='))).status).toBe(400)
  })

  it('returns 404 for unknown routes', async () => {
    expect((await handle(new Request('http://test/nope'))).status).toBe(404)
  })

  it('turns repository failures into explicit 500 responses', async () => {
    const failing = createRequestHandler({ ...repository, getPerson: async () => { throw new Error('db down') } })
    const response = await failing(new Request('http://test/api/people/person:sushi'))
    expect(response.status).toBe(500)
    expect((await response.json() as { error: string }).error).toBe('database_error')
  })
})
