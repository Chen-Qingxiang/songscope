import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  annalsResponseSchema,
  careerTimelineResponseSchema,
  corpusCatalogResponseSchema,
  corpusUnitsResponseSchema,
  coverageResponseSchema,
  entityPassagesResponseSchema,
  eventResponseSchema,
  passageDetailResponseSchema,
  sourceResponseSchema,
  textSearchResponseSchema,
  unitPassagesResponseSchema
} from '@songscope/schema'
import { createPool } from '../src/client.js'
import { PostgresSongScopeRepository } from '../src/repository.js'

const run = Boolean(process.env.DATABASE_URL)
const suite = run ? describe : describe.skip

suite('PostgreSQL/PostGIS SongScope v0.3 dataset', () => {
  let pool: ReturnType<typeof createPool>
  let repo: PostgresSongScopeRepository
  afterAll(() => pool?.end())

  beforeAll(async () => {
    pool = createPool()
    repo = new PostgresSongScopeRepository(pool)
    const missing = await pool.query('SELECT * FROM accepted_assertions_without_support')
    expect(missing.rows).toHaveLength(0)
  })

  it('imports one deterministic version without duplicate SIDs', async () => {
    const versions = await pool.query('SELECT version, schema_version, content_hash FROM dataset_version')
    expect(versions.rows).toHaveLength(1)
    expect(versions.rows[0].version).toBe('2026.07.13-sushi-career.1')
    expect(versions.rows[0].content_hash).toMatch(/^[a-f0-9]{64}$/)
    const duplicates = await pool.query('SELECT sid,count(*) FROM entity_registry GROUP BY sid HAVING count(*) > 1')
    expect(duplicates.rows).toHaveLength(0)
  })

  it('returns the five-place career snapshot in historical sequence', async () => {
    const career = careerTimelineResponseSchema.parse(await repo.getCareer('person:sushi'))
    const appointments = career.items.filter((item) => item.itemType === 'appointment')
      .map((item) => [item.year, item.title, item.place?.name])
    expect(appointments).toEqual([
      [1071, '通判杭州', '杭州'],
      [1074, '徙知密州', '密州'],
      [1077, '徙知徐州', '徐州'],
      [1079, '徙知湖州', '湖州'],
      [1079, '以黄州团练副使、本州安置', '黄州']
    ])
  })

  it('keeps appointment, service, movement, event and residence projections separate', async () => {
    const career = careerTimelineResponseSchema.parse(await repo.getCareer('person:sushi'))
    expect(new Set(career.items.map((item) => item.itemType))).toEqual(new Set([
      'appointment', 'service', 'movement', 'disaster', 'disaster-response', 'political', 'residence'
    ]))
    const mizhouAppointment = career.items.find((item) => item.id === 'event:appointment:sushi-mizhou-1074')
    const mizhouService = career.items.find((item) => item.id === 'service:sushi-mizhou-1074')
    expect(mizhouAppointment?.itemType).toBe('appointment')
    expect(mizhouService?.itemType).toBe('service')
    expect(mizhouAppointment?.id).not.toBe(mizhouService?.id)
  })

  it('gives every formal timeline item supporting evidence and original date metadata', async () => {
    const career = careerTimelineResponseSchema.parse(await repo.getCareer('person:sushi'))
    expect(career.items.length).toBeGreaterThanOrEqual(17)
    for (const item of career.items) {
      expect(item.evidenceSummary.accepted).toBe(true)
      expect(item.evidenceSummary.evidenceCount).toBeGreaterThan(0)
      expect(item.yearLabel).not.toBe('')
      expect(['year', 'range']).toContain(item.precision)
    }
  })

  it('returns the Wutai composite event, participants, children and punishment components', async () => {
    const wutai = eventResponseSchema.parse(await repo.getEvent('event:wutai-1079'))
    expect(wutai.children.map((item) => item.sid)).toEqual(expect.arrayContaining([
      'event:wutai-arrest-1079', 'event:wutai-imprisonment-1079', 'event:appointment:sushi-huangzhou-1079'
    ]))
    expect(wutai.participants.filter((item) => item.role === 'accuser')).toHaveLength(3)

    const punishment = eventResponseSchema.parse(await repo.getEvent('event:appointment:sushi-huangzhou-1079'))
    expect(punishment.appointment?.components.map((item) => [item.rawExpression, item.officeCategory])).toEqual([
      ['黄州团练副使', 'honorific'], ['本州安置', 'status']
    ])
  })

  it('connects disaster response to the Xu flood without collapsing the events', async () => {
    const response = eventResponseSchema.parse(await repo.getEvent('event:xuzhou-flood-response-1077'))
    expect(response.event.eventType).toBe('disaster-response')
    expect(response.relations.some((item) => item.relationType === 'responded-to' && item.event.sid === 'event:xuzhou-flood-1077')).toBe(true)
  })

  it('returns all assertions supported by one reusable source passage', async () => {
    const source = sourceResponseSchema.parse(await repo.getSource('source:work:songshi'))
    expect(source.assertions.length).toBeGreaterThan(10)
    const reused = await pool.query(`SELECT locator_sid,count(DISTINCT assertion_sid)::int AS count
      FROM evidence_link GROUP BY locator_sid HAVING count(DISTINCT assertion_sid) > 1`)
    expect(reused.rows.length).toBeGreaterThan(0)
  })

  it('enforces supporting evidence for accepted assertions at transaction commit', async () => {
    await pool.query('BEGIN')
    try {
      await pool.query(`INSERT INTO entity_registry(sid,entity_type,label)
        VALUES ('assertion:test-unsupported','assertion','unsupported')`)
      await pool.query(`INSERT INTO assertion(sid,subject_sid,predicate,object_value,status,confidence,rationale)
        VALUES ('assertion:test-unsupported','person:sushi','test','{"value":true}','accepted',1,'constraint test')`)
      await expect(pool.query('SET CONSTRAINTS ALL IMMEDIATE')).rejects.toThrow(/supporting evidence/)
    } finally {
      await pool.query('ROLLBACK')
    }
  })

  it('supports conflict fixtures without manufacturing production conflicts', async () => {
    await pool.query('BEGIN')
    try {
      await pool.query(`INSERT INTO entity_registry(sid,entity_type,label) VALUES
        ('assertion:test-date-a','assertion','test A'),('assertion:test-date-b','assertion','test B')`)
      await pool.query(`INSERT INTO assertion(sid,subject_sid,predicate,object_value,status,confidence,rationale) VALUES
        ('assertion:test-date-a','event:appointment:sushi-mizhou-1074','year','{"year":1074}','proposed',0.5,'test'),
        ('assertion:test-date-b','event:appointment:sushi-mizhou-1074','year','{"year":1075}','proposed',0.5,'test')`)
      const rows = await pool.query("SELECT object_value FROM assertion WHERE sid LIKE 'assertion:test-date-%' ORDER BY sid")
      expect(rows.rows).toHaveLength(2)
      expect(rows.rows[0].object_value).not.toEqual(rows.rows[1].object_value)
    } finally {
      await pool.query('ROLLBACK')
    }
  })

  it('has PostGIS enabled and stores explicitly qualified point geometries', async () => {
    const extension = await pool.query("SELECT extversion FROM pg_extension WHERE extname='postgis'")
    expect(extension.rows).toHaveLength(1)
    const places = await pool.query(`SELECT count(*)::int AS count FROM place
      WHERE geom IS NOT NULL AND geometry_status='modern-proxy'`)
    expect(places.rows[0].count).toBe(6)
  })

  it('imports the fixed 496-volume corpus snapshot without duplicate or missing records', async () => {
    const snapshot = await pool.query(`SELECT corpus_version,content_hash,directory_revision_id,expected_volumes
      FROM corpus_snapshot`)
    expect(snapshot.rows).toEqual([expect.objectContaining({
      corpus_version: 'songshi-wikisource-r2535238-f3b6041f6161',
      content_hash: 'f3b6041f6161819b0e08c7d63f8c1b500cd7f8206b41d26218477c47b9ebf525',
      directory_revision_id: '2535238',
      expected_volumes: 496
    })])
    const counts = await pool.query(`SELECT
      (SELECT count(*)::int FROM corpus_snapshot_item WHERE item_role='volume') AS volumes,
      (SELECT count(*)::int FROM source_unit) AS units,
      (SELECT count(*)::int FROM source_passage) AS passages,
      (SELECT count(*)::int FROM text_annotation) AS annotations`)
    expect(counts.rows[0]).toEqual({ volumes: 496, units: 501, passages: 39924, annotations: 1340 })
    const coverage = await pool.query('SELECT * FROM corpus_coverage')
    expect(coverage.rows[0]).toMatchObject({
      expected: 496, discovered: 496, acquired: 496, validated: 496,
      segmented: 496, searchable: 496, reviewed: 0, candidate_annotations: 1340,
      anomalies: []
    })
  })

  it('maps the three legacy volume 338 locators to stable revision-specific passages', async () => {
    const mappings = await pool.query(`SELECT sl.sid,array_agg(sp.sequence_index ORDER BY slp.sequence_index) AS passages,
      min(si.revision_id)::text AS revision_id
      FROM source_locator sl
      JOIN source_locator_passage slp ON slp.locator_sid=sl.sid
      JOIN source_passage sp ON sp.sid=slp.passage_sid
      JOIN source_item si ON si.sid=sl.source_item_sid
      WHERE sl.sid LIKE 'locator:songshi-338-%'
      GROUP BY sl.sid ORDER BY sl.sid`)
    expect(mappings.rows).toEqual([
      { sid: 'locator:songshi-338-hangzhou-mizhou', passages: [20, 21], revision_id: '1458054' },
      { sid: 'locator:songshi-338-huzhou-wutai-huangzhou', passages: [24], revision_id: '1458054' },
      { sid: 'locator:songshi-338-xuzhou-flood', passages: [23], revision_id: '1458054' }
    ])
    const brokenEvidence = await pool.query('SELECT * FROM accepted_assertions_without_support')
    expect(brokenEvidence.rows).toHaveLength(0)
  })

  it('rejects a source unit whose carrier is not a member of its corpus snapshot', async () => {
    const snapshot = await pool.query('SELECT sid FROM corpus_snapshot LIMIT 1')
    await pool.query('BEGIN')
    try {
      await pool.query(`INSERT INTO entity_registry(sid,entity_type,label)
        VALUES ('source:unit:test-foreign-carrier','source_unit','invalid carrier')`)
      await expect(pool.query(`INSERT INTO source_unit(
        sid,snapshot_sid,source_item_sid,parent_unit_sid,unit_type,division,juan,
        label_original,label_normalized,sequence_index,external_anchor)
        VALUES ($1,$2,'source:item:songshi-338-wikisource',NULL,'chapter','appendix',NULL,
          'invalid','invalid',999,NULL)`, ['source:unit:test-foreign-carrier', snapshot.rows[0].sid]))
        .rejects.toThrow(/source_unit_snapshot_item_fk/)
    } finally {
      await pool.query('ROLLBACK')
    }
  })

  it('keeps generated annotations candidate-only and enforces exact passage spans', async () => {
    const statuses = await pool.query('SELECT status,count(*)::int AS count FROM text_annotation GROUP BY status')
    expect(statuses.rows).toEqual([{ status: 'candidate', count: 1340 }])
    const assertions = await pool.query(`SELECT count(*)::int AS count FROM assertion
      WHERE sid LIKE 'assertion:songshi-wikisource:%' AND status='accepted'`)
    expect(assertions.rows[0].count).toBe(0)

    const passage = await pool.query('SELECT sid,snapshot_sid FROM source_passage ORDER BY sid LIMIT 1')
    await pool.query('BEGIN')
    try {
      await pool.query(`INSERT INTO entity_registry(sid,entity_type,label)
        VALUES ('curation:annotation:invalid-span','text_annotation','invalid span')`)
      await expect(pool.query(`INSERT INTO text_annotation(
        sid,snapshot_sid,passage_sid,start_offset,end_offset,offset_unit,surface_text,
        annotation_type,status,method,curation_activity_sid)
        VALUES ($1,$2,$3,0,1,'unicode-code-point','不匹配','person','candidate','test',$4)`, [
        'curation:annotation:invalid-span', passage.rows[0].snapshot_sid, passage.rows[0].sid,
        'curation:songshi-shenzong-rules-v1'
      ])).rejects.toThrow(/surface text does not match/)
    } finally {
      await pool.query('ROLLBACK')
    }
  })

  it('has trigram passage search available for Chinese occurrences', async () => {
    const extension = await pool.query("SELECT extversion FROM pg_extension WHERE extname='pg_trgm'")
    expect(extension.rows).toHaveLength(1)
    const occurrences = await pool.query(`SELECT count(*)::int AS count FROM source_passage
      WHERE search_text LIKE '%' || $1 || '%'`, ['徙知'])
    expect(occurrences.rows[0].count).toBeGreaterThan(0)
  })

  it('projects all 496 volumes through the validated corpus API contract', async () => {
    const catalog = corpusCatalogResponseSchema.parse(await repo.getCorpusCatalog())
    expect(catalog.divisions).toHaveLength(5)
    expect(catalog.divisions.flatMap((division) => division.volumes)).toHaveLength(496)
    expect(catalog.coverage.searchable).toBe(496)

    const volume14 = catalog.divisions.flatMap((division) => division.volumes).find((volume) => volume.juan === 14)!
    const units = corpusUnitsResponseSchema.parse(await repo.getCorpusUnits(volume14.sourceItemSid))
    expect(units.units.map((unit) => unit.juan)).toEqual([14])
    const passages = unitPassagesResponseSchema.parse(await repo.getUnitPassages(volume14.unitSid, { limit: 2 }))
    expect(passages.passages).toHaveLength(2)
    expect(passages.source.revisionId).toBe(volume14.revisionId)
    const detail = passageDetailResponseSchema.parse(await repo.getPassage(passages.passages[0].sid))
    expect(detail.stableCitation).toContain(`revision ${volume14.revisionId}`)
    expect(detail.next?.sequenceIndex).toBe(2)
  })

  it('counts literal occurrences and keeps entity evidence layers separate', async () => {
    const search = textSearchResponseSchema.parse(await repo.searchText('徙知', { limit: 20 }))
    expect(search.occurrenceLabel).toBe('文本命中')
    expect(search.pagination.total).toBeGreaterThan(0)
    expect(search.results.every((result) => result.occurrenceType === 'occurrence')).toBe(true)

    const sushi = entityPassagesResponseSchema.parse(await repo.getEntityPassages('person:sushi'))
    expect(sushi.entity.label).toBe('苏轼')
    expect(sushi.acceptedAssertions.length).toBeGreaterThan(0)
    expect(sushi.acceptedAssertions.every((assertion) => assertion.passageSid.startsWith('source:passage:'))).toBe(true)
  })

  it('returns source-order annals candidates and explicit corpus coverage', async () => {
    const annals = annalsResponseSchema.parse(await repo.getAnnals({ fromJuan: 14, toJuan: 16, status: 'candidate' }))
    expect(annals.rows).toHaveLength(258)
    expect(annals.rows[0].juan).toBe(14)
    expect(annals.rows.at(-1)?.juan).toBe(16)
    expect(annals.query.scope).toContain('不推定公历日期')
    expect(await repo.getCoverage('test-does-not-exist')).toBeNull()
    const currentCoverage = coverageResponseSchema.parse(await repo.getCoverage('2026.07.13-sushi-career.1'))
    expect(currentCoverage.coverage).toMatchObject({ expected: 496, validated: 496, searchable: 496 })
  })
})
