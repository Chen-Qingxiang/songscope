import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPool } from '../src/client.js'
import { PostgresSongScopeRepository } from '../src/repository.js'

const run = Boolean(process.env.DATABASE_URL)
const suite = run ? describe : describe.skip

suite('PostgreSQL evidence-backed vertical slice', () => {
  const pool = createPool()
  const repo = new PostgresSongScopeRepository(pool)
  afterAll(() => pool.end())

  beforeAll(async () => {
    const missing = await pool.query('SELECT * FROM accepted_assertions_without_support')
    expect(missing.rows).toHaveLength(0)
  })

  it('keeps appointment and service as separate records', async () => {
    const career = await repo.getCareer('person:sushi') as any
    expect(career.items.map((item: any) => item.itemType)).toEqual(['appointment', 'service'])
    expect(career.items[0].id).not.toBe(career.items[1].id)
  })

  it('returns multiple evidence locators for the appointment assertion', async () => {
    const result = await repo.getAssertionEvidence('assertion:sushi-appointed-mizhou') as any
    expect(result.evidence).toHaveLength(2)
    expect(result.evidence[0].source.title).toBe('《宋史》')
  })

  it('does not invent a precise month or day', async () => {
    const career = await repo.getCareer('person:sushi') as any
    expect(career.items[0].precision).toBe('year')
    expect(career.items[0].yearLabel).toBe('熙宁七年')
  })

  it('supports conflicting assertions without overwriting either row', async () => {
    await pool.query('BEGIN')
    try {
      await pool.query(`INSERT INTO entity_registry(sid,entity_type,label) VALUES
        ('assertion:test-date-a','assertion','test A'),('assertion:test-date-b','assertion','test B')`)
      await pool.query(`INSERT INTO assertion(sid,subject_sid,predicate,object_value,status,confidence,rationale) VALUES
        ('assertion:test-date-a','event:appointment:sushi-mizhou-1074','year','{"year":1074}','proposed',0.5,'test'),
        ('assertion:test-date-b','event:appointment:sushi-mizhou-1074','year','{"year":1075}','proposed',0.5,'test')`)
      const rows = await pool.query("SELECT sid, object_value FROM assertion WHERE sid LIKE 'assertion:test-date-%' ORDER BY sid")
      expect(rows.rows).toHaveLength(2)
      expect(rows.rows[0].object_value).not.toEqual(rows.rows[1].object_value)
    } finally {
      await pool.query('ROLLBACK')
    }
  })
})
