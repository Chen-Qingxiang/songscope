import { describe, expect, it } from 'vitest'
import type { SongScopeRepository } from '@songscope/db/src/repository.js'
import { createRequestHandler } from '../src/app.js'

const career = {
  datasetVersion: 'test',
  person: { sid: 'person:sushi', name: '苏轼' },
  items: [{
    id: 'event:appointment:sushi-mizhou-1074', itemType: 'appointment', year: 1074,
    yearLabel: '熙宁七年', precision: 'year', uncertainty: 'exact', title: '徙知密州',
    summary: 'test', place: { sid: 'place:mizhou', name: '密州', resolutionStatus: 'modern-proxy' },
    evidenceSummary: { assertionSid: 'assertion:sushi-appointed-mizhou', accepted: true,
      evidenceCount: 2, sourceTitles: ['《宋史》'], locatorLabels: ['卷338'] }
  }]
}

const repository: SongScopeRepository = {
  getPerson: async () => ({ datasetVersion: 'test', sid: 'person:sushi', name: '苏轼' }),
  getCareer: async () => career,
  getEvent: async () => ({ datasetVersion: 'test', sid: 'event:test' }),
  getAssertionEvidence: async () => ({ datasetVersion: 'test', assertion: {}, evidence: [] })
}

const handle = createRequestHandler(repository)

describe('SongScope API', () => {
  it('returns a validated career projection', async () => {
    const response = await handle(new Request('http://test/api/people/person:sushi/timeline'))
    expect(response.status).toBe(200)
    expect((await response.json() as any).items[0].evidenceSummary.evidenceCount).toBe(2)
  })

  it('returns 404 for unknown routes', async () => {
    expect((await handle(new Request('http://test/nope'))).status).toBe(404)
  })
})
