import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  corpusCoverageSchema,
  corpusDirectoryFileSchema,
  corpusManifestSchema,
  corpusUnitsFileSchema,
  corpusVolumeFileSchema,
  type CorpusCoverage,
  type CorpusDirectoryEntry,
  type CorpusDirectoryFile,
  type CorpusDivision,
  type CorpusManifest,
  type CorpusSourceItem,
  type CorpusUnitsFile,
  type CorpusVolumeFile,
  type Sid,
  type SourcePassage,
  type SourceUnit,
  type TextAnnotation
} from '@songscope/schema'

export const corpusSchemaVersion = '0.3.0' as const
export const corpusDirectoryRevisionId = 2535238 as const
export const corpusExpectedVolumes = 496 as const
export const corpusProcessing = {
  acquisitionVersion: '1.0.0',
  segmentationVersion: '1.0.0',
  annotationVersion: '1.0.0'
} as const

export const corpusLicense = {
  spdxId: 'CC-BY-SA-4.0',
  name: 'Creative Commons Attribution-Share Alike 4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.zh',
  attributionRequired: true
} as const

const divisionDefinitions: Array<{ division: CorpusDivision; original: string; normalized: string; anchor: string }> = [
  { division: 'benji', original: '本紀', normalized: '本纪', anchor: '本紀' },
  { division: 'zhi', original: '志', normalized: '志', anchor: '志' },
  { division: 'biao', original: '表', normalized: '表', anchor: '表' },
  { division: 'liezhuan', original: '列傳', normalized: '列传', anchor: '列傳' },
  { division: 'appendix', original: '附錄', normalized: '附录', anchor: '附錄' }
]

const candidateLexicons: Array<{ type: TextAnnotation['annotationType']; method: string; values: string[] }> = [
  {
    type: 'person', method: 'songshi-shenzong-person-lexicon-v1', values: [
      '神宗', '英宗', '韓琦', '曾公亮', '文彥博', '富弼', '歐陽修', '王安石', '司馬光',
      '呂公著', '韓絳', '王珪', '馮京', '吳充', '章惇', '蘇軾', '曹佾', '孫固', '張璪'
    ]
  },
  {
    type: 'place', method: 'songshi-shenzong-place-lexicon-v1', values: [
      '陳州', '亳州', '青州', '杭州', '蔡州', '潁州', '湖州', '徐州', '黃州', '河陽',
      '京西', '陝西', '河北', '河東', '秦州', '瀘州', '戎州', '澶州', '許州', '潁昌府',
      '開封府', '遼', '夏國', '高麗國', '于闐國'
    ]
  },
  {
    type: 'institution', method: 'songshi-shenzong-institution-lexicon-v1', values: [
      '中書', '樞密院', '御史臺', '尚書省', '國子監', '司農', '刑部', '吏部', '戶部',
      '三司', '審刑院', '翰林院', '太廟'
    ]
  },
  {
    type: 'office', method: 'songshi-shenzong-office-lexicon-v1', values: [
      '宰相', '參知政事', '樞密使', '樞密副使', '翰林學士', '御史中丞', '侍御史',
      '知州', '通判', '節度使', '觀察使', '太尉', '司徒', '僕射', '尚書', '侍郎'
    ]
  },
  {
    type: 'appointment-action', method: 'songshi-appointment-action-lexicon-v1', values: [
      '除', '授', '遷', '徙', '罷', '落', '奪', '復', '拜', '封', '進封', '知'
    ]
  },
  {
    type: 'event-term', method: 'songshi-event-term-lexicon-v1', values: [
      '崩', '薨', '旱', '水災', '河決', '蝗', '寇', '戰', '赦', '地震', '饑', '雨雹', '彗'
    ]
  }
]

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function juanKey(juan: number): string {
  return String(juan).padStart(3, '0')
}

function removeFirstBalancedTemplate(value: string): string {
  const start = value.search(/\{\{header2?\b/i)
  if (start < 0 || value.slice(0, start).trim()) return value
  let depth = 0
  for (let index = start; index < value.length - 1; index += 1) {
    const pair = value.slice(index, index + 2)
    if (pair === '{{') { depth += 1; index += 1; continue }
    if (pair === '}}') {
      depth -= 1
      index += 1
      if (depth === 0) return value.slice(index + 1).replace(/^\s+/, '')
    }
  }
  return value
}

export function wikitextToVisibleText(value: string): string {
  let result = value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^__[^\n]+__$/gm, '')
    .replace(/^==+\s*([\s\S]*?)\s*==+$/gm, '$1')
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]#]+)(?:#[^\]]+)?\]\]/g, '$1')
    .replace(/-\{([^{}]+)\}-/g, (_, body: string) => {
      const variants = body.split(';').map((part) => part.includes(':') ? part.slice(part.indexOf(':') + 1) : part)
      return variants[0] ?? body
    })

  for (let pass = 0; pass < 6 && /\{\{[^{}]*\}\}/.test(result); pass += 1) {
    result = result.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const parts = body.split('|').map((part) => part.trim())
      const positional = parts.slice(1).filter((part) => part && !part.includes('='))
      return positional.at(-1) ?? ''
    })
  }

  return result
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/^\s*[|!]+\s?/gm, '')
    .replace(/^\s*[:;#*]+\s?/gm, '')
    .replace(/^\s*\{\||^\s*\|\}|^\s*\|-.*$/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function splitLongBlock(block: string, maximumCodePoints = 4000): string[] {
  if ([...block].length <= maximumCodePoints) return [block]
  const result: string[] = []
  let remaining = block
  while ([...remaining].length > maximumCodePoints) {
    const points = [...remaining]
    const window = points.slice(0, maximumCodePoints).join('')
    const preferred = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('。'), window.lastIndexOf('；'))
    const cut = preferred > maximumCodePoints / 2 ? preferred + 1 : window.length
    result.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) result.push(remaining)
  return result.filter(Boolean)
}

export function segmentWikitext(sourceText: string, unitSid: Sid, revisionId: number): SourcePassage[] {
  const body = removeFirstBalancedTemplate(sourceText)
    .replace(/^__[^\n]+__$/gm, '')
    .replace(/^\{\{(?:see also|seealso|wikipedia|authority control)[^\n]*\}\}$/gim, '')
    .trim()
  const blocks = body.split(/\n\s*\n+/).flatMap((block) => splitLongBlock(block.trim())).filter(Boolean)
  return blocks.map((sourceBlock, index) => {
    const sequenceIndex = index + 1
    const normalizedText = wikitextToVisibleText(sourceBlock)
    return {
      sid: `source:passage:songshi-wikisource:${unitSid.match(/juan\d{3}/)?.[0] ?? 'unit'}:r${revisionId}:${String(sequenceIndex).padStart(5, '0')}`,
      sourceUnitSid: unitSid,
      sequenceIndex,
      sourceText: sourceBlock,
      normalizedText: normalizedText || null,
      checksum: sha256(sourceBlock),
      segmentationMethod: 'wikitext-blocks',
      segmentationVersion: '1.0.0',
      reviewStatus: 'raw'
    }
  })
}

function codePointOffset(value: string, codeUnitIndex: number): number {
  return [...value.slice(0, codeUnitIndex)].length
}

export function annotatePassages(passages: SourcePassage[], juan: number): TextAnnotation[] {
  if (![14, 15, 16].includes(juan)) return []
  const annotations: TextAnnotation[] = []
  const seen = new Set<string>()

  const add = (passage: SourcePassage, index: number, surfaceText: string, annotationType: TextAnnotation['annotationType'], method: string) => {
    const startOffset = codePointOffset(passage.sourceText, index)
    const endOffset = startOffset + [...surfaceText].length
    const key = `${passage.sid}:${startOffset}:${endOffset}:${annotationType}`
    if (seen.has(key)) return
    seen.add(key)
    annotations.push({
      sid: `curation:annotation:${juanKey(juan)}:${String(annotations.length + 1).padStart(6, '0')}`,
      passageSid: passage.sid,
      startOffset,
      endOffset,
      offsetUnit: 'unicode-code-point',
      surfaceText,
      annotationType,
      targetEntitySid: null,
      normalizedValue: surfaceText,
      status: 'candidate',
      method,
      curationActivitySid: 'curation:songshi-shenzong-rules-v1'
    })
  }

  for (const passage of passages) {
    const chronology = /(?:治平|熙寧|元豐)[一二三四五六七八九十〇零百]+年|(?:春|夏|秋|冬)?(?:閏)?(?:正|一|二|三|四|五|六|七|八|九|十|十一|十二)月(?:[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥](?:朔)?)?/g
    for (const match of passage.sourceText.matchAll(chronology)) add(passage, match.index, match[0], 'chronology', 'songshi-chronology-regex-v1')
    for (const lexicon of candidateLexicons) {
      for (const value of lexicon.values) {
        let index = passage.sourceText.indexOf(value)
        while (index >= 0) {
          add(passage, index, value, lexicon.type, lexicon.method)
          index = passage.sourceText.indexOf(value, index + value.length)
        }
      }
    }
  }
  return annotations.sort((left, right) => left.passageSid.localeCompare(right.passageSid) || left.startOffset - right.startOffset || left.annotationType.localeCompare(right.annotationType))
    .map((annotation, index) => ({ ...annotation, sid: `curation:annotation:${juanKey(juan)}:${String(index + 1).padStart(6, '0')}` }))
}

function normalizeHeading(value: string): string {
  return wikitextToVisibleText(value).replaceAll(' ', '')
}

function divisionForHeading(value: string): CorpusDivision | null {
  const heading = normalizeHeading(value)
  if (heading.includes('本紀') || heading.includes('本纪')) return 'benji'
  if (heading === '志') return 'zhi'
  if (heading === '表') return 'biao'
  if (heading.includes('列傳') || heading.includes('列传')) return 'liezhuan'
  if (heading.includes('附錄') || heading.includes('附录')) return 'appendix'
  return null
}

export function parseDirectoryEntries(sourceText: string): CorpusDirectoryEntry[] {
  const entries: CorpusDirectoryEntry[] = []
  let division: CorpusDivision | null = null
  for (const line of sourceText.split(/\r?\n/)) {
    const heading = line.match(/^==\s*(.*?)\s*==\s*$/)
    if (heading) {
      division = divisionForHeading(heading[1]) ?? division
      continue
    }
    const match = line.match(/\[\[\/卷(\d{3})(?:#[^\]|]+)?\|([^\]]+)\]\](.*)$/)
    if (!match || !division) continue
    const juan = Number(match[1])
    entries.push({
      juan,
      pageTitle: `宋史/卷${match[1]}`,
      labelOriginal: `${match[2]}${match[3]}`.trim(),
      division,
      sequenceIndex: juan,
      externalAnchor: divisionDefinitions.find((item) => item.division === division)?.anchor ?? division
    })
  }
  return entries.sort((left, right) => left.juan - right.juan)
}

export function buildDivisionUnits(directoryItemSid: Sid): SourceUnit[] {
  return divisionDefinitions.map((item, index) => ({
    sid: `source:unit:songshi-wikisource:index:r${corpusDirectoryRevisionId}:${item.division}`,
    sourceItemSid: directoryItemSid,
    parentUnitSid: null,
    unitType: 'work_division',
    division: item.division,
    juan: null,
    labelOriginal: item.original,
    labelNormalized: item.normalized,
    sequenceIndex: index + 1,
    externalAnchor: item.anchor
  }))
}

export function buildJuanUnit(entry: CorpusDirectoryEntry, sourceItem: CorpusSourceItem): SourceUnit {
  return {
    sid: `source:unit:songshi-wikisource:juan${juanKey(entry.juan)}:r${sourceItem.revisionId}`,
    sourceItemSid: sourceItem.sid,
    parentUnitSid: `source:unit:songshi-wikisource:index:r${corpusDirectoryRevisionId}:${entry.division}`,
    unitType: 'juan',
    division: entry.division,
    juan: entry.juan,
    labelOriginal: entry.labelOriginal,
    labelNormalized: `卷${entry.juan}`,
    sequenceIndex: entry.sequenceIndex,
    externalAnchor: null
  }
}

export function computeManifestContentHash(input: {
  directory: CorpusSourceItem
  pages: CorpusSourceItem[]
}): string {
  return sha256(stableStringify({
    directoryRevisionId: corpusDirectoryRevisionId,
    processing: corpusProcessing,
    directory: { revisionId: input.directory.revisionId, checksum: input.directory.sourceTextChecksum },
    pages: input.pages.map((page) => ({
      pageId: page.pageId,
      pageTitle: page.pageTitle,
      revisionId: page.revisionId,
      checksum: page.sourceTextChecksum
    })).sort((left, right) => left.pageTitle.localeCompare(right.pageTitle))
  }))
}

export interface LoadedCorpus {
  manifest: CorpusManifest
  coverage: CorpusCoverage
  directory: CorpusDirectoryFile
  units: CorpusUnitsFile
  volumes: CorpusVolumeFile[]
}

export async function loadCorpus(root = resolve(process.cwd(), 'data/corpus/songshi-wikisource')): Promise<LoadedCorpus> {
  const parse = async <T>(relative: string, schema: { parse(value: unknown): T }): Promise<T> => {
    const path = resolve(root, relative)
    return schema.parse(JSON.parse(await readFile(path, 'utf8')))
  }
  const [manifest, coverage, directory, units] = await Promise.all([
    parse('manifest.json', corpusManifestSchema),
    parse('coverage.json', corpusCoverageSchema),
    parse('directory.json', corpusDirectoryFileSchema),
    parse('units.json', corpusUnitsFileSchema)
  ])
  const volumes = await Promise.all(Array.from({ length: corpusExpectedVolumes }, (_, index) =>
    parse(`volumes/${juanKey(index + 1)}.json`, corpusVolumeFileSchema)
  ))
  return { manifest, coverage, directory, units, volumes }
}

export function validateCorpusCrossReferences(corpus: LoadedCorpus): string[] {
  const errors: string[] = []
  const { manifest, coverage, directory, units, volumes } = corpus
  const expectedJuan = Array.from({ length: corpusExpectedVolumes }, (_, index) => index + 1)
  const entryJuan = directory.entries.map((entry) => entry.juan)
  if (stableStringify(entryJuan) !== stableStringify(expectedJuan)) errors.push('directory entries must cover juan 1..496 exactly')
  if (sha256(directory.sourceText) !== directory.sourceItem.sourceTextChecksum) errors.push('directory source text checksum mismatch')
  const computedHash = computeManifestContentHash({ directory: directory.sourceItem, pages: volumes.map((volume) => volume.sourceItem) })
  if (computedHash !== manifest.contentHash) errors.push('manifest contentHash mismatch')
  if (manifest.snapshotSid !== `corpus:snapshot:songshi-wikisource:${manifest.contentHash.slice(0, 16)}`) errors.push('manifest snapshot SID mismatch')
  if (coverage.snapshotSid !== manifest.snapshotSid || units.snapshotSid !== manifest.snapshotSid) errors.push('snapshot SID differs across manifest/coverage/units')

  const unitBySid = new Map(units.units.map((unit) => [unit.sid, unit]))
  if (unitBySid.size !== units.units.length) errors.push('duplicate source unit SID')
  const passageSids = new Set<string>()
  const annotationSids = new Set<string>()
  let segmented = 0
  let searchable = 0
  let reviewed = 0
  let candidateAnnotations = 0

  for (const [index, volume] of volumes.entries()) {
    const juan = index + 1
    const manifestPage = manifest.pages.find((page) => page.pageTitle === volume.sourceItem.pageTitle)
    if (!manifestPage || stableStringify(manifestPage) !== stableStringify(volume.sourceItem)) errors.push(`manifest metadata differs for juan ${juan}`)
    if (sha256(volume.sourceText) !== volume.sourceItem.sourceTextChecksum) errors.push(`source text checksum mismatch for juan ${juan}`)
    if (!unitBySid.has(volume.unit.sid)) errors.push(`unit missing from units.json for juan ${juan}`)
    if (!volume.unit.parentUnitSid || !unitBySid.has(volume.unit.parentUnitSid)) errors.push(`parent division missing for juan ${juan}`)
    if (volume.unit.juan !== juan) errors.push(`volume/unit juan mismatch for ${juan}`)
    if (volume.passages.length) segmented += 1
    if (volume.passages.some((passage) => (passage.normalizedText ?? passage.sourceText).trim())) searchable += 1
    reviewed += volume.passages.filter((passage) => passage.reviewStatus === 'reviewed').length
    for (const passage of volume.passages) {
      if (passageSids.has(passage.sid)) errors.push(`duplicate passage SID ${passage.sid}`)
      passageSids.add(passage.sid)
      if (passage.sourceUnitSid !== volume.unit.sid) errors.push(`passage unit mismatch ${passage.sid}`)
      if (sha256(passage.sourceText) !== passage.checksum) errors.push(`passage checksum mismatch ${passage.sid}`)
    }
    for (const annotation of volume.annotations) {
      if (annotationSids.has(annotation.sid)) errors.push(`duplicate annotation SID ${annotation.sid}`)
      annotationSids.add(annotation.sid)
      candidateAnnotations += annotation.status === 'candidate' ? 1 : 0
      const passage = volume.passages.find((item) => item.sid === annotation.passageSid)
      if (!passage) { errors.push(`annotation passage missing ${annotation.sid}`); continue }
      const surface = [...passage.sourceText].slice(annotation.startOffset, annotation.endOffset).join('')
      if (surface !== annotation.surfaceText) errors.push(`annotation surface mismatch ${annotation.sid}`)
    }
    if ([14, 15, 16].includes(juan)) {
      const types = new Set(volume.annotations.map((annotation) => annotation.annotationType))
      for (const type of ['chronology', 'person', 'place', 'institution', 'office', 'appointment-action', 'event-term']) {
        if (!types.has(type as TextAnnotation['annotationType'])) errors.push(`juan ${juan} lacks ${type} candidate annotations`)
      }
    } else if (volume.annotations.length) {
      errors.push(`juan ${juan} has annotations outside the approved structured slice`)
    }
  }

  const computedCoverage = {
    expected: corpusExpectedVolumes,
    discovered: directory.entries.length,
    acquired: volumes.length,
    validated: volumes.length,
    segmented,
    searchable,
    reviewed,
    candidateAnnotations
  }
  for (const [key, value] of Object.entries(computedCoverage)) {
    if (coverage[key as keyof typeof computedCoverage] !== value) errors.push(`coverage ${key} mismatch`)
  }
  if (coverage.anomalies.length) errors.push('coverage contains unresolved anomalies')
  return errors
}
