import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  annalsResponseSchema,
  corpusCatalogResponseSchema,
  corpusSearchShardSchema,
  corpusStaticIndexSchema,
  coverageResponseSchema,
  curatedDatasetSchema,
  entityPassagesResponseSchema,
  unitPassagesResponseSchema,
  type AnnotationProjection,
  type CuratedDataset,
  type TextSearchOccurrence
} from '@songscope/schema'
import { juanKey, loadCorpus, type LoadedCorpus } from '../src/corpus.js'

const outputRoot = resolve(process.cwd(), 'public/corpus')

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(process.cwd(), path), 'utf8'))
}

async function loadCuratedDataset(): Promise<CuratedDataset> {
  const files = {
    metadata: 'data/curated/dataset.json',
    people: 'data/curated/people/people.json',
    places: 'data/curated/places/places.json',
    offices: 'data/curated/offices/offices.json',
    temporalExtents: 'data/curated/events/temporal-extents.json',
    sourceWorks: 'data/curated/sources/works.json',
    sourceItems: 'data/curated/sources/items.json',
    passages: 'data/curated/passages/passages.json',
    events: 'data/curated/events/events.json',
    eventParticipations: 'data/curated/events/participations.json',
    eventRelations: 'data/curated/events/relations.json',
    appointments: 'data/curated/appointments/appointments.json',
    appointmentComponents: 'data/curated/appointments/components.json',
    serviceEpisodes: 'data/curated/service-episodes/service-episodes.json',
    assertions: 'data/curated/assertions/assertions.json',
    evidenceLinks: 'data/curated/assertions/evidence-links.json'
  } as const
  return curatedDatasetSchema.parse(Object.fromEntries(await Promise.all(
    Object.entries(files).map(async ([key, path]) => [key, await readJson(path)])
  )))
}

async function writeValidated<T>(relative: string, schema: { parse(value: unknown): T }, value: unknown): Promise<T> {
  const parsed = schema.parse(value)
  const path = resolve(outputRoot, relative)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(parsed)}\n`, 'utf8')
  return parsed
}

function context(corpus: LoadedCorpus, curated: CuratedDataset) {
  return {
    datasetVersion: curated.metadata.datasetVersion,
    corpusVersion: corpus.manifest.corpusVersion,
    snapshotSid: corpus.manifest.snapshotSid
  }
}

function coverage(corpus: LoadedCorpus) {
  const value = corpus.coverage
  return {
    expected: value.expected,
    discovered: value.discovered,
    acquired: value.acquired,
    validated: value.validated,
    segmented: value.segmented,
    searchable: value.searchable,
    reviewed: value.reviewed,
    candidateAnnotations: value.candidateAnnotations,
    anomalies: value.anomalies
  }
}

function corpusSource(corpus: LoadedCorpus) {
  const item = corpus.directory.sourceItem
  return {
    workSid: corpus.manifest.workSid,
    title: '《宋史》',
    provider: item.provider,
    directoryRevisionId: corpus.manifest.directoryRevisionId,
    canonicalUrl: item.canonicalUrl,
    historyUrl: item.historyUrl,
    license: item.license
  }
}

function passageSource(volume: LoadedCorpus['volumes'][number]) {
  const item = volume.sourceItem
  return {
    sourceItemSid: item.sid,
    pageTitle: item.pageTitle,
    pageId: item.pageId,
    revisionId: item.revisionId,
    revisionTimestamp: item.revisionTimestamp,
    canonicalUrl: item.canonicalUrl,
    historyUrl: item.historyUrl,
    attributionUrl: item.attributionUrl,
    license: item.license
  }
}

function annotationProjection(annotation: LoadedCorpus['volumes'][number]['annotations'][number]): AnnotationProjection {
  return {
    sid: annotation.sid,
    startOffset: annotation.startOffset,
    endOffset: annotation.endOffset,
    offsetUnit: annotation.offsetUnit,
    surfaceText: annotation.surfaceText,
    annotationType: annotation.annotationType,
    targetEntitySid: annotation.targetEntitySid,
    normalizedValue: annotation.normalizedValue,
    status: annotation.status,
    method: annotation.method
  }
}

function buildLocatorMappings(corpus: LoadedCorpus, curated: CuratedDataset) {
  const volume = corpus.volumes[337]
  const anchors = new Map([
    ['locator:songshi-338-hangzhou-mizhou', ['軾遂請外', '時新政日下']],
    ['locator:songshi-338-xuzhou-flood', ['徙知徐州']],
    ['locator:songshi-338-huzhou-wutai-huangzhou', ['徙知湖州']]
  ])
  const passageByLocator = new Map<string, Array<{ passageSid: string; mappingSequence: number }>>()
  for (const [locatorSid, locatorAnchors] of anchors) {
    passageByLocator.set(locatorSid, locatorAnchors.map((anchor, index) => {
      const matches = volume.passages.filter((passage) => (passage.normalizedText ?? passage.sourceText).includes(anchor))
      if (matches.length !== 1) throw new Error(`${locatorSid} anchor ${anchor} resolved to ${matches.length} passages`)
      return { passageSid: matches[0].sid, mappingSequence: index + 1 }
    }))
  }
  const assertionsBySid = new Map<string, CuratedDataset['assertions'][number]>(curated.assertions.map((assertion) => [assertion.sid, assertion]))
  const locatorBySid = new Map<string, CuratedDataset['passages'][number]>(curated.passages.map((locator) => [locator.sid, locator]))
  const passageLocators = new Map<string, Array<{
    locatorSid: string
    locatorValue: string
    quoteText: string | null
    mappingSequence: number
    assertions: Array<{ assertionSid: string; subjectSid: string; predicate: string; status: string; stance: string }>
  }>>()
  for (const [locatorSid, mappings] of passageByLocator) {
    const locator = locatorBySid.get(locatorSid)
    if (!locator) throw new Error(`Missing curated locator ${locatorSid}`)
    const linked = curated.evidenceLinks.flatMap((link) => {
      if (link.locatorSid !== locatorSid) return []
      const assertion = assertionsBySid.get(link.assertionSid)
      return assertion ? [{
        assertionSid: assertion.sid,
        subjectSid: assertion.subjectSid,
        predicate: assertion.predicate,
        status: assertion.status,
        stance: link.stance
      }] : []
    }).sort((left, right) => left.assertionSid.localeCompare(right.assertionSid))
    for (const mapping of mappings) {
      const values = passageLocators.get(mapping.passageSid) ?? []
      values.push({
        locatorSid,
        locatorValue: locator.locatorValue,
        quoteText: locator.quoteText,
        mappingSequence: mapping.mappingSequence,
        assertions: linked
      })
      passageLocators.set(mapping.passageSid, values)
    }
  }
  return { passageByLocator, passageLocators }
}

function volumeSummary(volume: LoadedCorpus['volumes'][number]) {
  return {
    unitSid: volume.unit.sid,
    sourceItemSid: volume.sourceItem.sid,
    juan: volume.unit.juan!,
    division: volume.unit.division,
    labelOriginal: volume.unit.labelOriginal,
    labelNormalized: volume.unit.labelNormalized,
    revisionId: volume.sourceItem.revisionId,
    passageCount: volume.passages.length,
    candidateAnnotationCount: volume.annotations.filter((annotation) => annotation.status === 'candidate').length
  }
}

function literalOccurrences(
  volume: LoadedCorpus['volumes'][number],
  query: string,
  textSelector: (source: string, normalized: string | null) => string = (source) => source
): TextSearchOccurrence[] {
  const results: TextSearchOccurrence[] = []
  for (const passage of volume.passages) {
    const text = textSelector(passage.sourceText, passage.normalizedText)
    let start = text.indexOf(query)
    while (start >= 0) {
      const end = start + query.length
      const contextStart = Math.max(0, start - 36)
      const contextEnd = Math.min(text.length, end + 36)
      results.push({
        occurrenceType: 'occurrence',
        passageSid: passage.sid,
        unitSid: volume.unit.sid,
        juan: volume.unit.juan!,
        division: volume.unit.division,
        sequenceIndex: passage.sequenceIndex,
        context: `${contextStart > 0 ? '…' : ''}${text.slice(contextStart, contextEnd)}${contextEnd < text.length ? '…' : ''}`,
        matchStart: Array.from(text.slice(0, start)).length,
        matchEnd: Array.from(text.slice(0, end)).length,
        reviewStatus: passage.reviewStatus,
        sourceRevisionId: volume.sourceItem.revisionId
      })
      start = text.indexOf(query, end)
    }
  }
  return results
}

const corpus = await loadCorpus()
const curated = await loadCuratedDataset()
const projectionContext = context(corpus, curated)
const { passageByLocator, passageLocators } = buildLocatorMappings(corpus, curated)

await rm(outputRoot, { recursive: true, force: true })

const divisionUnits = corpus.units.units.filter((unit) => unit.unitType === 'work_division')
await writeValidated('catalog.json', corpusCatalogResponseSchema, {
  ...projectionContext,
  source: corpusSource(corpus),
  coverage: coverage(corpus),
  divisions: divisionUnits.map((unit) => ({
    sid: unit.sid,
    division: unit.division,
    labelOriginal: unit.labelOriginal,
    labelNormalized: unit.labelNormalized,
    volumeCount: corpus.volumes.filter((volume) => volume.unit.division === unit.division).length,
    volumes: corpus.volumes.filter((volume) => volume.unit.division === unit.division).map(volumeSummary)
  }))
})

await writeValidated('coverage.json', coverageResponseSchema, {
  ...projectionContext,
  source: corpusSource(corpus),
  coverage: coverage(corpus)
})

for (const volume of corpus.volumes) {
  const annotationsByPassage = new Map<string, AnnotationProjection[]>()
  for (const annotation of volume.annotations) {
    const values = annotationsByPassage.get(annotation.passageSid) ?? []
    values.push(annotationProjection(annotation))
    annotationsByPassage.set(annotation.passageSid, values)
  }
  await writeValidated(`volumes/${juanKey(volume.unit.juan!)}.json`, unitPassagesResponseSchema, {
    ...projectionContext,
    unit: volumeSummary(volume),
    source: passageSource(volume),
    pagination: { offset: 0, limit: volume.passages.length, total: volume.passages.length },
    passages: volume.passages.map((passage) => ({
      sid: passage.sid,
      unitSid: passage.sourceUnitSid,
      juan: volume.unit.juan,
      division: volume.unit.division,
      sequenceIndex: passage.sequenceIndex,
      sourceText: passage.sourceText,
      normalizedText: passage.normalizedText,
      checksum: passage.checksum,
      reviewStatus: passage.reviewStatus,
      annotations: annotationsByPassage.get(passage.sid) ?? [],
      locators: passageLocators.get(passage.sid) ?? []
    }))
  })
}

const shardIndex: Array<{ file: string; fromJuan: number; toJuan: number; passageCount: number }> = []
for (let fromJuan = 1; fromJuan <= 496; fromJuan += 16) {
  const toJuan = Math.min(496, fromJuan + 15)
  const volumes = corpus.volumes.slice(fromJuan - 1, toJuan)
  const passages = volumes.flatMap((volume) => volume.passages.map((passage) => ({
    passageSid: passage.sid,
    unitSid: volume.unit.sid,
    juan: volume.unit.juan!,
    division: volume.unit.division,
    sequenceIndex: passage.sequenceIndex,
    sourceText: passage.sourceText,
    normalizedText: passage.normalizedText,
    reviewStatus: passage.reviewStatus,
    sourceRevisionId: volume.sourceItem.revisionId
  })))
  const file = `search/${juanKey(fromJuan)}-${juanKey(toJuan)}.json`
  await writeValidated(file, corpusSearchShardSchema, { ...projectionContext, fromJuan, toJuan, passages })
  shardIndex.push({ file, fromJuan, toJuan, passageCount: passages.length })
}
await writeValidated('index.json', corpusStaticIndexSchema, {
  ...projectionContext,
  generatedFrom: 'fixed-local-corpus-snapshot',
  shards: shardIndex
})

const annotationTypes = ['chronology', 'person', 'place', 'institution', 'office', 'appointment-action', 'event-term'] as const
await writeValidated('annals.json', annalsResponseSchema, {
  ...projectionContext,
  query: {
    id: 'shenzong-annals-v1', version: '1.0.0', title: '神宗本纪原文顺序纪事',
    scope: '《宋史》卷十四至卷十六；仅显示原文与候选标注，不推定公历日期。',
    statisticalUnit: 'source passage', fromJuan: 14, toJuan: 16, annotationStatus: null
  },
  rows: corpus.volumes.slice(13, 16).flatMap((volume) => volume.passages.map((passage) => {
    const annotations = volume.annotations.filter((annotation) => annotation.passageSid === passage.sid).map(annotationProjection)
    return {
      passageSid: passage.sid,
      unitSid: passage.sourceUnitSid,
      juan: volume.unit.juan!,
      sequenceIndex: passage.sequenceIndex,
      sourceText: passage.sourceText,
      normalizedText: passage.normalizedText,
      chronology: annotations.filter((annotation) => annotation.annotationType === 'chronology'),
      candidateCounts: Object.fromEntries(annotationTypes.map((type) => [
        type, annotations.filter((annotation) => annotation.annotationType === type && annotation.status === 'candidate').length
      ])),
      sourceRevisionId: volume.sourceItem.revisionId
    }
  })),
  exportMetadata: {
    queryId: 'shenzong-annals-v1', queryVersion: '1.0.0', ...projectionContext,
    statisticalUnit: 'source passage',
    columns: ['passageSid', 'juan', 'sequenceIndex', 'sourceText', 'chronology', 'candidateCounts', 'sourceRevisionId']
  }
})

const sushi = curated.people.find((person) => person.sid === 'person:sushi')
if (!sushi) throw new Error('Missing person:sushi regression entity')
const relatedSubjects = new Set<string>([
  sushi.sid,
  ...curated.appointments.filter((item) => item.personSid === sushi.sid).map((item) => item.sid),
  ...curated.serviceEpisodes.filter((item) => item.personSid === sushi.sid).map((item) => item.sid),
  ...curated.eventParticipations.filter((item) => item.entitySid === sushi.sid).map((item) => item.eventSid)
])
const acceptedBySid = new Map(curated.assertions.filter((assertion) =>
  assertion.status === 'accepted' && relatedSubjects.has(assertion.subjectSid)
).map((assertion) => [assertion.sid, assertion]))
const acceptedAssertions = curated.evidenceLinks.flatMap((link) => {
  const assertion = acceptedBySid.get(link.assertionSid)
  const mappings = passageByLocator.get(link.locatorSid)
  if (!assertion || link.stance !== 'supports' || !mappings) return []
  return mappings.map((mapping) => ({
    assertionSid: assertion.sid,
    subjectSid: assertion.subjectSid,
    predicate: assertion.predicate,
    locatorSid: link.locatorSid,
    passageSid: mapping.passageSid,
    stance: link.stance
  }))
})
await writeValidated('entities/person_sushi.json', entityPassagesResponseSchema, {
  ...projectionContext,
  entity: { sid: sushi.sid, label: sushi.primaryName, entityType: 'person' },
  stringOccurrences: corpus.volumes.flatMap((volume) => literalOccurrences(volume, sushi.traditionalName)),
  resolvedAnnotations: [],
  acceptedAssertions
})

console.log(`Built static corpus projection: 496 volumes, ${shardIndex.length} search shards, ${corpus.volumes.reduce((sum, volume) => sum + volume.passages.length, 0)} passages.`)
