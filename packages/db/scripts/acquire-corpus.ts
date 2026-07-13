import { Buffer } from 'node:buffer'
import { readFile, rename, rm, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  corpusCoverageSchema,
  corpusDirectoryFileSchema,
  corpusManifestSchema,
  corpusUnitsFileSchema,
  corpusVolumeFileSchema,
  type CorpusManifest,
  type CorpusSourceItem,
  type Sid
} from '@songscope/schema'
import {
  annotatePassages,
  buildDivisionUnits,
  buildJuanUnit,
  computeManifestContentHash,
  corpusDirectoryRevisionId,
  corpusExpectedVolumes,
  corpusLicense,
  corpusProcessing,
  corpusSchemaVersion,
  juanKey,
  parseDirectoryEntries,
  segmentWikitext,
  sha256
} from '../src/corpus.js'

const apiEndpoint = 'https://zh.wikisource.org/w/api.php'
const outputRoot = resolve(process.cwd(), 'data/corpus/songshi-wikisource')
const stagingRoot = resolve(process.cwd(), 'data/corpus/.songshi-wikisource-acquire')
const userAgent = 'SongScope/0.3 corpus acquisition (https://github.com/Chen-Qingxiang/songscope)'

interface RevisionSlot {
  contentmodel: string
  content: string
}

interface ApiRevision {
  revid: number
  parentid: number
  timestamp: string
  size?: number
  slots?: { main: RevisionSlot }
}

interface ApiPage {
  pageid: number
  title: string
  missing?: boolean
  revisions?: ApiRevision[]
}

interface QueryResponse {
  query: { pages: ApiPage[] }
}

async function api(params: Record<string, string>): Promise<unknown> {
  const url = new URL(apiEndpoint)
  for (const [key, value] of Object.entries({ action: 'query', format: 'json', formatversion: '2', ...params })) {
    url.searchParams.set(key, value)
  }
  let lastError: unknown
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': userAgent } })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const body = await response.json() as { error?: { code: string; info: string } }
      if (body.error) throw new Error(`${body.error.code}: ${body.error.info}`)
      return body
    } catch (error) {
      lastError = error
      if (attempt < 4) await new Promise((resolvePromise) => setTimeout(resolvePromise, 500 * attempt))
    }
  }
  throw new Error(`MediaWiki API failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

async function getRevision(revisionId: number): Promise<{ page: ApiPage; revision: ApiRevision; sourceText: string; contentModel: string }> {
  const response = await api({
    prop: 'revisions',
    revids: String(revisionId),
    rvprop: 'ids|timestamp|size|content|contentmodel',
    rvslots: 'main'
  }) as QueryResponse
  const page = response.query.pages[0]
  const revision = page?.revisions?.find((item) => item.revid === revisionId)
  const slot = revision?.slots?.main
  if (!page || !revision || !slot?.content) throw new Error(`Cannot load fixed revision ${revisionId}`)
  return { page, revision, sourceText: slot.content, contentModel: slot.contentmodel }
}

async function getLatestPages(titles: string[]): Promise<Map<string, ApiPage>> {
  const pages = new Map<string, ApiPage>()
  for (let index = 0; index < titles.length; index += 50) {
    const response = await api({
      prop: 'info|revisions',
      titles: titles.slice(index, index + 50).join('|'),
      redirects: '1',
      rvprop: 'ids|timestamp|size|contentmodel'
    }) as QueryResponse
    for (const page of response.query.pages) pages.set(page.title, page)
  }
  return pages
}

async function getRevisions(revisionIds: number[]): Promise<Map<number, { page: ApiPage; revision: ApiRevision; sourceText: string; contentModel: string }>> {
  const revisions = new Map<number, { page: ApiPage; revision: ApiRevision; sourceText: string; contentModel: string }>()
  for (let index = 0; index < revisionIds.length; index += 20) {
    const response = await api({
      prop: 'revisions',
      revids: revisionIds.slice(index, index + 20).join('|'),
      rvprop: 'ids|timestamp|size|content|contentmodel',
      rvslots: 'main'
    }) as QueryResponse
    for (const page of response.query.pages) {
      for (const revision of page.revisions ?? []) {
        const slot = revision.slots?.main
        if (!slot?.content) throw new Error(`Revision ${revision.revid} has no main-slot content`)
        revisions.set(revision.revid, { page, revision, sourceText: slot.content, contentModel: slot.contentmodel })
      }
    }
  }
  return revisions
}

async function readExistingManifest(): Promise<CorpusManifest | null> {
  try {
    return corpusManifestSchema.parse(JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8')))
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    throw new Error(`Existing corpus manifest is invalid: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function wikiUrl(title: string): string {
  return `https://zh.wikisource.org/wiki/${title.split('/').map(encodeURIComponent).join('/')}`
}

function historyUrl(title: string): string {
  return `https://zh.wikisource.org/w/index.php?title=${encodeURIComponent(title)}&action=history`
}

function sourceItem(args: {
  page: ApiPage
  revision: ApiRevision
  contentModel: string
  sourceText: string
  retrievedAt: string
  sid: Sid
}): CorpusSourceItem {
  return {
    sid: args.sid,
    workSid: 'source:work:songshi',
    provider: 'Chinese Wikisource',
    pageTitle: args.page.title,
    pageId: args.page.pageid,
    revisionId: args.revision.revid,
    revisionTimestamp: args.revision.timestamp,
    canonicalUrl: wikiUrl(args.page.title),
    historyUrl: historyUrl(args.page.title),
    attributionUrl: historyUrl(args.page.title),
    contentModel: args.contentModel,
    license: corpusLicense,
    retrievedAt: args.retrievedAt,
    sourceTextChecksum: sha256(args.sourceText),
    sourceTextBytes: Buffer.byteLength(args.sourceText)
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const existing = await readExistingManifest()
const acquiredAt = new Date().toISOString()
const directoryRevision = await getRevision(corpusDirectoryRevisionId)
const entries = parseDirectoryEntries(directoryRevision.sourceText)
if (entries.length !== corpusExpectedVolumes || entries.some((entry, index) => entry.juan !== index + 1)) {
  throw new Error(`Fixed directory revision must contain juan 1..${corpusExpectedVolumes}; parsed ${entries.length}`)
}

const existingDirectory = existing?.directory.revisionId === corpusDirectoryRevisionId ? existing.directory : null
const directoryItem = sourceItem({
  ...directoryRevision,
  retrievedAt: existingDirectory?.retrievedAt ?? acquiredAt,
  sid: `source:item:songshi-wikisource:index:r${corpusDirectoryRevisionId}`
})

const latestPages = await getLatestPages(entries.map((entry) => entry.pageTitle))
const existingByTitle = new Map(existing?.pages.map((page) => [page.pageTitle, page]) ?? [])
const revisionIds: number[] = []
const upstreamDrift: Array<{ pageTitle: string; pinnedRevisionId: number; latestRevisionId: number }> = []
for (const entry of entries) {
  const latest = latestPages.get(entry.pageTitle)
  const latestRevision = latest?.revisions?.[0]
  if (!latest || latest.missing || !latestRevision) throw new Error(`Cannot resolve latest metadata for ${entry.pageTitle}`)
  const pinned = existingByTitle.get(entry.pageTitle)
  revisionIds.push(pinned?.revisionId ?? latestRevision.revid)
  if (pinned && pinned.revisionId !== latestRevision.revid) {
    upstreamDrift.push({ pageTitle: entry.pageTitle, pinnedRevisionId: pinned.revisionId, latestRevisionId: latestRevision.revid })
  }
}

const fixedRevisions = await getRevisions(revisionIds)
const volumes = entries.map((entry) => {
  const pinned = existingByTitle.get(entry.pageTitle)
  const revisionId = pinned?.revisionId ?? latestPages.get(entry.pageTitle)?.revisions?.[0]?.revid
  const fixed = revisionId ? fixedRevisions.get(revisionId) : null
  if (!fixed || fixed.page.title !== entry.pageTitle) throw new Error(`Cannot load fixed content for ${entry.pageTitle}`)
  const item = sourceItem({
    ...fixed,
    retrievedAt: pinned?.retrievedAt ?? acquiredAt,
    sid: `source:item:songshi-wikisource:juan${juanKey(entry.juan)}:r${fixed.revision.revid}`
  })
  const unit = buildJuanUnit(entry, item)
  const passages = segmentWikitext(fixed.sourceText, unit.sid, fixed.revision.revid)
  const annotations = annotatePassages(passages, entry.juan)
  return corpusVolumeFileSchema.parse({
    schemaVersion: corpusSchemaVersion,
    sourceItem: item,
    unit,
    sourceText: fixed.sourceText,
    passages,
    annotations
  })
})

const contentHash = computeManifestContentHash({ directory: directoryItem, pages: volumes.map((volume) => volume.sourceItem) })
const corpusVersion = `songshi-wikisource-r${corpusDirectoryRevisionId}-${contentHash.slice(0, 12)}`
const snapshotSid = `corpus:snapshot:songshi-wikisource:${contentHash.slice(0, 16)}`
const manifest = corpusManifestSchema.parse({
  schemaVersion: corpusSchemaVersion,
  corpusVersion,
  snapshotSid,
  contentHash,
  workSid: 'source:work:songshi',
  directoryRevisionId: corpusDirectoryRevisionId,
  expectedVolumes: corpusExpectedVolumes,
  processing: corpusProcessing,
  directory: directoryItem,
  pages: volumes.map((volume) => volume.sourceItem)
})
const directory = corpusDirectoryFileSchema.parse({
  schemaVersion: corpusSchemaVersion,
  sourceItem: directoryItem,
  sourceText: directoryRevision.sourceText,
  entries
})
const divisionUnits = buildDivisionUnits(directoryItem.sid)
const units = corpusUnitsFileSchema.parse({
  schemaVersion: corpusSchemaVersion,
  snapshotSid,
  units: [...divisionUnits, ...volumes.map((volume) => volume.unit)]
})
const coverage = corpusCoverageSchema.parse({
  schemaVersion: corpusSchemaVersion,
  corpusVersion,
  snapshotSid,
  expected: corpusExpectedVolumes,
  discovered: entries.length,
  acquired: volumes.length,
  validated: volumes.length,
  segmented: volumes.filter((volume) => volume.passages.length > 0).length,
  searchable: volumes.filter((volume) => volume.passages.some((passage) => (passage.normalizedText ?? passage.sourceText).trim())).length,
  reviewed: volumes.flatMap((volume) => volume.passages).filter((passage) => passage.reviewStatus === 'reviewed').length,
  candidateAnnotations: volumes.flatMap((volume) => volume.annotations).filter((annotation) => annotation.status === 'candidate').length,
  anomalies: []
})

await rm(stagingRoot, { recursive: true, force: true })
await mkdir(resolve(stagingRoot, 'volumes'), { recursive: true })
await Promise.all([
  writeJson(resolve(stagingRoot, 'manifest.json'), manifest),
  writeJson(resolve(stagingRoot, 'directory.json'), directory),
  writeJson(resolve(stagingRoot, 'units.json'), units),
  writeJson(resolve(stagingRoot, 'coverage.json'), coverage),
  ...volumes.map((volume) => writeJson(resolve(stagingRoot, `volumes/${juanKey(volume.unit.juan ?? 0)}.json`), volume))
])
await rm(outputRoot, { recursive: true, force: true })
await rename(stagingRoot, outputRoot)

console.log(`Acquired ${manifest.corpusVersion}: ${coverage.acquired}/${coverage.expected} volumes, ${coverage.candidateAnnotations} candidate annotations.`)
console.log(`Snapshot ${manifest.snapshotSid}; content hash ${manifest.contentHash}.`)
if (upstreamDrift.length) {
  console.warn(`${upstreamDrift.length} upstream pages have newer revisions; the pinned snapshot was preserved.`)
  for (const drift of upstreamDrift.slice(0, 20)) console.warn(`${drift.pageTitle}: pinned ${drift.pinnedRevisionId}, latest ${drift.latestRevisionId}`)
  if (upstreamDrift.length > 20) console.warn(`... ${upstreamDrift.length - 20} more`)
}
