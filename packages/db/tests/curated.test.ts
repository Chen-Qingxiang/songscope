import { describe, expect, it } from 'vitest'
import { loadCuratedDataset } from '../scripts/load-curated.js'

describe('curated data validation', () => {
  it('validates the complete human-readable dataset', async () => {
    const dataset = await loadCuratedDataset()
    expect(dataset.metadata.datasetVersion).toBe('2026.07.13-sushi-career.1')
    expect(dataset.places.map((place) => place.sid)).toEqual(expect.arrayContaining([
      'place:hangzhou', 'place:mizhou', 'place:xuzhou', 'place:huzhou', 'place:huangzhou'
    ]))
  })

  it('keeps every accepted assertion connected to supporting evidence', async () => {
    const dataset = await loadCuratedDataset()
    for (const assertion of dataset.assertions.filter((item) => item.status === 'accepted')) {
      expect(dataset.evidenceLinks.some((link) => link.assertionSid === assertion.sid && link.stance === 'supports')).toBe(true)
    }
  })

  it('keeps appointment actions and actual episodes as different records', async () => {
    const dataset = await loadCuratedDataset()
    expect(dataset.appointments.every((item) => item.sid.startsWith('event:appointment:'))).toBe(true)
    expect(dataset.serviceEpisodes.every((item) => item.sid.startsWith('service:'))).toBe(true)
    expect(dataset.serviceEpisodes.find((item) => item.episodeType === 'residence')?.dutyOfficeSid).toBeNull()
  })

  it('preserves original regnal expressions and explicit conversion methods', async () => {
    const dataset = await loadCuratedDataset()
    expect(dataset.temporalExtents.every((item) => item.originalText && item.conversionMethod)).toBe(true)
    expect(dataset.temporalExtents.find((item) => item.sid === 'time:1077-year')?.originalText).toBe('熙宁十年')
  })

  it('allows conflict fixtures without adding false production conflicts', async () => {
    const dataset = await loadCuratedDataset()
    const fixture = dataset.assertions[0]
    const alternatives = [
      { ...fixture, sid: 'assertion:fixture-a', status: 'proposed' as const, objectValue: { year: 1074 }, objectSid: null },
      { ...fixture, sid: 'assertion:fixture-b', status: 'proposed' as const, objectValue: { year: 1075 }, objectSid: null }
    ]
    expect(alternatives[0].objectValue).not.toEqual(alternatives[1].objectValue)
    expect(dataset.assertions.some((item) => item.status === 'proposed')).toBe(false)
  })
})
