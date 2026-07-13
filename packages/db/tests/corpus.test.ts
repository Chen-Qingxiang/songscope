import { beforeAll, describe, expect, it } from 'vitest'
import type { LoadedCorpus } from '../src/corpus.js'
import { annotatePassages, loadCorpus, segmentWikitext, sha256, validateCorpusCrossReferences } from '../src/corpus.js'

let corpus: LoadedCorpus

beforeAll(async () => {
  corpus = await loadCorpus()
})

describe('fixed Songshi corpus snapshot', () => {
  it('covers all 496 directory volumes with complete revision and license metadata', () => {
    expect(corpus.directory.entries.map((entry) => entry.juan)).toEqual(Array.from({ length: 496 }, (_, index) => index + 1))
    expect(corpus.manifest.pages).toHaveLength(496)
    expect(new Set(corpus.manifest.pages.map((page) => page.pageId)).size).toBe(496)
    expect(new Set(corpus.manifest.pages.map((page) => page.revisionId)).size).toBe(496)
    expect(corpus.manifest.pages.every((page) =>
      page.license.spdxId === 'CC-BY-SA-4.0' &&
      page.canonicalUrl.startsWith('https://zh.wikisource.org/') &&
      page.historyUrl.includes('action=history') &&
      /^[a-f0-9]{64}$/.test(page.sourceTextChecksum)
    )).toBe(true)
  })

  it('has no cross-file, checksum, passage, offset, or coverage errors', () => {
    expect(validateCorpusCrossReferences(corpus)).toEqual([])
    expect(corpus.coverage).toMatchObject({
      expected: 496,
      discovered: 496,
      acquired: 496,
      validated: 496,
      segmented: 496,
      searchable: 496,
      reviewed: 0,
      anomalies: []
    })
  })

  it('preserves source wikitext separately from the readable projection', () => {
    const volume = corpus.volumes[13]
    expect(volume.sourceText.startsWith('{{header2')).toBe(true)
    expect(sha256(volume.sourceText)).toBe(volume.sourceItem.sourceTextChecksum)
    expect(volume.passages.some((passage) => passage.sourceText.includes('==治平四年==') && passage.normalizedText === '治平四年')).toBe(true)
  })

  it('segments and annotates the approved slice deterministically', () => {
    for (const juan of [14, 15, 16]) {
      const volume = corpus.volumes[juan - 1]
      expect(segmentWikitext(volume.sourceText, volume.unit.sid, volume.sourceItem.revisionId)).toEqual(volume.passages)
      expect(annotatePassages(volume.passages, juan)).toEqual(volume.annotations)
      expect(new Set(volume.annotations.map((annotation) => annotation.annotationType))).toEqual(new Set([
        'chronology', 'person', 'place', 'institution', 'office', 'appointment-action', 'event-term'
      ]))
      expect(volume.annotations.every((annotation) => annotation.status === 'candidate' && annotation.targetEntitySid === null)).toBe(true)
    }
    expect(corpus.volumes.filter((_, index) => ![13, 14, 15].includes(index)).every((volume) => volume.annotations.length === 0)).toBe(true)
  })

  it('keeps the existing volume 338 text available as stable passages', () => {
    const volume = corpus.volumes[337]
    expect(volume.unit.juan).toBe(338)
    expect(volume.sourceItem.revisionId).toBe(1458054)
    expect(volume.passages.some((passage) => (passage.normalizedText ?? '').includes('徙知密州'))).toBe(true)
    expect(volume.passages.some((passage) => (passage.normalizedText ?? '').includes('以黃州團練副使安置'))).toBe(true)
  })
})
