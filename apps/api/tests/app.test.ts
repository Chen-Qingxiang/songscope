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

const context = {
  datasetVersion: 'test', corpusVersion: 'songshi-test', snapshotSid: 'corpus:snapshot:test'
}
const coverage = {
  expected: 496, discovered: 496, acquired: 496, validated: 496, segmented: 496,
  searchable: 496, reviewed: 0, candidateAnnotations: 1, anomalies: []
}
const corpusSource = {
  workSid: 'source:work:songshi', title: '《宋史》', provider: 'Chinese Wikisource', directoryRevisionId: 2535238,
  canonicalUrl: 'https://zh.wikisource.org/wiki/宋史', historyUrl: 'https://zh.wikisource.org/w/index.php?title=宋史&action=history',
  license: { spdxId: 'CC-BY-SA-4.0', name: 'Creative Commons Attribution-Share Alike 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }
}
const passageSource = {
  sourceItemSid: 'source:item:songshi-014', pageTitle: '宋史/卷014', pageId: 14, revisionId: 140,
  revisionTimestamp: '2024-01-01T00:00:00Z', canonicalUrl: 'https://zh.wikisource.org/wiki/宋史/卷014',
  historyUrl: 'https://zh.wikisource.org/w/index.php?title=宋史/卷014&action=history',
  attributionUrl: 'https://zh.wikisource.org/w/index.php?oldid=140',
  license: { spdxId: 'CC-BY-SA-4.0', name: 'Creative Commons Attribution-Share Alike 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }
}
const volume = {
  unitSid: 'corpus:unit:juan-014', sourceItemSid: passageSource.sourceItemSid, juan: 14, division: 'benji' as const,
  labelOriginal: '卷十四　本紀第十四', labelNormalized: '卷十四 本纪第十四', revisionId: 140,
  passageCount: 1, candidateAnnotationCount: 1
}
const annotation = {
  sid: 'corpus:annotation:test', startOffset: 0, endOffset: 3, offsetUnit: 'unicode-code-point' as const,
  surfaceText: '熙寧元年', annotationType: 'chronology' as const, targetEntitySid: null,
  normalizedValue: '熙宁元年', status: 'candidate' as const, method: 'rule-v1'
}
const passage = {
  sid: 'corpus:passage:test', unitSid: volume.unitSid, juan: 14, division: 'benji' as const,
  sequenceIndex: 1, sourceText: '熙寧元年春正月', normalizedText: '熙宁元年春正月',
  checksum: 'a'.repeat(64), reviewStatus: 'raw' as const, annotations: [annotation], locators: []
}
const occurrence = {
  occurrenceType: 'occurrence' as const, passageSid: passage.sid, unitSid: passage.unitSid, juan: 14,
  division: 'benji' as const, sequenceIndex: 1, context: '熙宁元年春正月', matchStart: 0, matchEnd: 2,
  reviewStatus: 'raw' as const, sourceRevisionId: 140
}
const exportMetadata = {
  queryId: 'test-query', queryVersion: '1.0.0', ...context, statisticalUnit: 'source passage', columns: ['passageSid']
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
  search: async (query) => ({ datasetVersion: 'test', query, results: [] }),
  getCorpusCatalog: async () => ({
    ...context, source: corpusSource, coverage,
    divisions: [{ sid: 'corpus:division:benji', division: 'benji', labelOriginal: '本紀', labelNormalized: '本纪', volumeCount: 1, volumes: [volume] }]
  }),
  getCorpusUnits: async (sourceItemSid) => ({
    ...context, sourceItemSid,
    units: [{ sid: volume.unitSid, parentUnitSid: 'corpus:division:benji', unitType: 'juan', division: 'benji', juan: 14, labelOriginal: volume.labelOriginal, labelNormalized: volume.labelNormalized, sequenceIndex: 14 }]
  }),
  getUnitPassages: async () => ({ ...context, unit: volume, source: passageSource, pagination: { offset: 0, limit: 100, total: 1 }, passages: [passage] }),
  getPassage: async () => ({ ...context, passage, source: passageSource, stableCitation: '《宋史》卷14，第1段，revision 140', previous: null, next: null }),
  searchText: async (query) => ({
    ...context, query, occurrenceLabel: '文本命中', filters: { division: null, juan: null, status: null },
    pagination: { offset: 0, limit: 100, total: 1 }, results: [occurrence], coverage, exportMetadata
  }),
  getEntityPassages: async (sid) => ({
    ...context, entity: { sid, label: '苏轼', entityType: 'person' }, stringOccurrences: [occurrence], resolvedAnnotations: [], acceptedAssertions: []
  }),
  getAnnals: async () => ({
    ...context,
    query: { id: 'shenzong-annals-v1', version: '1.0.0', title: '神宗本纪原文顺序纪事', scope: '卷十四至十六', statisticalUnit: 'source passage', fromJuan: 14, toJuan: 16, annotationStatus: null },
    rows: [{ passageSid: passage.sid, unitSid: passage.unitSid, juan: 14, sequenceIndex: 1, sourceText: passage.sourceText, normalizedText: passage.normalizedText, chronology: [annotation], candidateCounts: { chronology: 1, person: 0, place: 0, institution: 0, office: 0, 'appointment-action': 0, 'event-term': 0 }, sourceRevisionId: 140 }],
    exportMetadata
  }),
  getCoverage: async () => ({ ...context, source: corpusSource, coverage })
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

  it('serves the corpus catalog, units, passages and stable passage detail', async () => {
    expect((await handle(new Request('http://test/api/corpus'))).status).toBe(200)
    expect((await handle(new Request(`http://test/api/corpus/${passageSource.sourceItemSid}/units`))).status).toBe(200)
    expect((await handle(new Request(`http://test/api/units/${volume.unitSid}/passages`))).status).toBe(200)
    const response = await handle(new Request(`http://test/api/passages/${passage.sid}`))
    expect(response.status).toBe(200)
    expect((await response.json() as { stableCitation: string }).stableCitation).toContain('revision 140')
  })

  it('labels exact text results as occurrences and exposes research projections', async () => {
    const textResponse = await handle(new Request('http://test/api/search/text?q=熙宁&juan=14&status=raw'))
    expect(textResponse.status).toBe(200)
    const textBody = await textResponse.json() as { occurrenceLabel: string; results: Array<{ occurrenceType: string }> }
    expect(textBody.occurrenceLabel).toBe('文本命中')
    expect(textBody.results[0].occurrenceType).toBe('occurrence')
    expect((await handle(new Request('http://test/api/entities/person:sushi/passages'))).status).toBe(200)
    expect((await handle(new Request('http://test/api/research/annals?fromJuan=14&toJuan=16'))).status).toBe(200)
    expect((await handle(new Request('http://test/api/datasets/test/coverage'))).status).toBe(200)
  })

  it('rejects malformed SIDs and invalid filters with 400', async () => {
    expect((await handle(new Request('http://test/api/people/not-a-sid'))).status).toBe(400)
    expect((await handle(new Request('http://test/api/people/person:sushi/career?from=abc'))).status).toBe(400)
    expect((await handle(new Request('http://test/api/search?q='))).status).toBe(400)
    expect((await handle(new Request('http://test/api/search/text?q=宋&juan=0'))).status).toBe(400)
    expect((await handle(new Request('http://test/api/research/annals?fromJuan=16&toJuan=14'))).status).toBe(400)
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
