import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { careerTimelineResponseSchema, eventResponseSchema, sourceResponseSchema } from '@songscope/schema'
import { createPool } from '../src/client.js'
import { PostgresSongScopeRepository } from '../src/repository.js'

const run = Boolean(process.env.DATABASE_URL)
const suite = run ? describe : describe.skip

suite('PostgreSQL/PostGIS SongScope v0.2 dataset', () => {
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
})
