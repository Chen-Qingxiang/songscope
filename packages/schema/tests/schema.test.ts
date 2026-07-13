import { describe, expect, it } from 'vitest'
import { assertionSchema, sidSchema, temporalExtentSchema } from '../src/index.js'

describe('SongScope schema invariants', () => {
  it('rejects unregistered SID prefixes', () => {
    expect(sidSchema.safeParse('thing:sushi').success).toBe(false)
    expect(sidSchema.safeParse('person:sushi').success).toBe(true)
  })

  it('preserves the original historical date expression', () => {
    const parsed = temporalExtentSchema.parse({
      sid: 'time:1074', originalText: '熙宁七年', normalizedStart: '1074-01-01',
      normalizedEnd: '1074-12-31', precision: 'year', certainty: 'inferred',
      calendar: 'chinese-regnal', conversionMethod: 'regnal-year-table',
      conversionNote: 'Only the year is normalized.'
    })
    expect(parsed.originalText).toBe('熙宁七年')
  })

  it('allows conflicting assertions to coexist', () => {
    const base = {
      subjectSid: 'event:appointment:sushi-mizhou-1074', predicate: 'occurredDuring',
      objectSid: null, temporalExtentSid: null, status: 'proposed' as const,
      confidence: 0.5, rationale: 'Conflict test'
    }
    const a = assertionSchema.parse({ ...base, sid: 'assertion:test-a', objectValue: { year: 1074 } })
    const b = assertionSchema.parse({ ...base, sid: 'assertion:test-b', objectValue: { year: 1075 } })
    expect(a.objectValue).not.toEqual(b.objectValue)
  })
})
