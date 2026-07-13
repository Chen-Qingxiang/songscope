import type { PoolClient } from 'pg'
import { createPool } from '../src/client.js'
import { loadCorpus, validateCorpusCrossReferences } from '../src/corpus.js'

const corpus = await loadCorpus()
const validationErrors = validateCorpusCrossReferences(corpus)
if (validationErrors.length) throw new Error(`Refusing to import invalid corpus:\n${validationErrors.join('\n')}`)

const pool = createPool()
const client = await pool.connect()

async function upsertRows(
  connection: PoolClient,
  table: string,
  columns: string[],
  rows: unknown[][],
  conflict: string,
  batchSize = 200
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize)
    const values: unknown[] = []
    const tuples = batch.map((row) => {
      if (row.length !== columns.length) throw new Error(`${table} row has ${row.length} values for ${columns.length} columns`)
      const placeholders = row.map((value) => {
        values.push(value)
        return `$${values.length}`
      })
      return `(${placeholders.join(',')})`
    })
    await connection.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES ${tuples.join(',')} ${conflict}`, values)
  }
}

function locatorPassageMappings() {
  const volume338 = corpus.volumes[337]
  const definitions = [
    { locatorSid: 'locator:songshi-338-hangzhou-mizhou', anchors: ['軾遂請外', '時新政日下'] },
    { locatorSid: 'locator:songshi-338-xuzhou-flood', anchors: ['徙知徐州'] },
    { locatorSid: 'locator:songshi-338-huzhou-wutai-huangzhou', anchors: ['徙知湖州'] }
  ]
  return definitions.flatMap((definition) => definition.anchors.map((anchor, index) => {
    const passages = volume338.passages.filter((passage) => (passage.normalizedText ?? passage.sourceText).includes(anchor))
    if (passages.length !== 1) throw new Error(`${definition.locatorSid} anchor ${anchor} resolved to ${passages.length} passages`)
    return [definition.locatorSid, passages[0].sid, index + 1, null, null] as const
  }))
}

try {
  await client.query('BEGIN')
  const work = await client.query('SELECT sid FROM source_work WHERE sid = $1', [corpus.manifest.workSid])
  if (!work.rows[0]) throw new Error('Curated source:work:songshi must be imported before the corpus')

  const allItems = [corpus.directory.sourceItem, ...corpus.volumes.map((volume) => volume.sourceItem)]
  const allUnits = corpus.units.units
  const allPassages = corpus.volumes.flatMap((volume) => volume.passages)
  const allAnnotations = corpus.volumes.flatMap((volume) => volume.annotations)
  const entityRows: unknown[][] = [
    [corpus.manifest.snapshotSid, 'corpus_snapshot', `《宋史》语料快照 ${corpus.manifest.corpusVersion}`],
    ['curation:songshi-shenzong-rules-v1', 'curation_activity', '神宗本纪候选标注规则 v1'],
    ...allItems.map((item) => [item.sid, 'source_item', item.pageTitle]),
    ...allUnits.map((unit) => [unit.sid, 'source_unit', unit.labelOriginal]),
    ...allPassages.map((passage) => [passage.sid, 'source_passage', `${passage.sourceUnitSid} 第${passage.sequenceIndex}段`]),
    ...allAnnotations.map((annotation) => [annotation.sid, 'text_annotation', `${annotation.annotationType}:${annotation.surfaceText}`])
  ]
  await upsertRows(client, 'entity_registry', ['sid', 'entity_type', 'label'], entityRows,
    'ON CONFLICT (sid) DO UPDATE SET entity_type=EXCLUDED.entity_type,label=EXCLUDED.label', 500)

  await upsertRows(client, 'source_item', [
    'sid', 'work_sid', 'label', 'url', 'citation', 'provider', 'page_title', 'page_id', 'revision_id',
    'revision_timestamp', 'canonical_url', 'history_url', 'attribution_url', 'content_model', 'license_spdx',
    'license_name', 'license_url', 'attribution_required', 'retrieved_at', 'source_text_checksum', 'source_text_bytes'
  ], allItems.map((item) => [
    item.sid,
    item.workSid,
    item.pageTitle === '宋史' ? '中文维基文库《宋史》固定目录' : `中文维基文库《${item.pageTitle}》固定转录`,
    item.canonicalUrl,
    `${item.pageTitle}，中文维基文库 revision ${item.revisionId}。`,
    item.provider,
    item.pageTitle,
    item.pageId,
    item.revisionId,
    item.revisionTimestamp,
    item.canonicalUrl,
    item.historyUrl,
    item.attributionUrl,
    item.contentModel,
    item.license.spdxId,
    item.license.name,
    item.license.url,
    item.license.attributionRequired,
    item.retrievedAt,
    item.sourceTextChecksum,
    item.sourceTextBytes
  ]), `ON CONFLICT (sid) DO UPDATE SET
    work_sid=EXCLUDED.work_sid,label=EXCLUDED.label,url=EXCLUDED.url,citation=EXCLUDED.citation,
    provider=EXCLUDED.provider,page_title=EXCLUDED.page_title,page_id=EXCLUDED.page_id,revision_id=EXCLUDED.revision_id,
    revision_timestamp=EXCLUDED.revision_timestamp,canonical_url=EXCLUDED.canonical_url,history_url=EXCLUDED.history_url,
    attribution_url=EXCLUDED.attribution_url,content_model=EXCLUDED.content_model,license_spdx=EXCLUDED.license_spdx,
    license_name=EXCLUDED.license_name,license_url=EXCLUDED.license_url,attribution_required=EXCLUDED.attribution_required,
    retrieved_at=EXCLUDED.retrieved_at,source_text_checksum=EXCLUDED.source_text_checksum,source_text_bytes=EXCLUDED.source_text_bytes`, 100)

  await upsertRows(client, 'corpus_snapshot', [
    'sid', 'corpus_version', 'content_hash', 'work_sid', 'directory_revision_id', 'expected_volumes', 'processing'
  ], [[
    corpus.manifest.snapshotSid,
    corpus.manifest.corpusVersion,
    corpus.manifest.contentHash,
    corpus.manifest.workSid,
    corpus.manifest.directoryRevisionId,
    corpus.manifest.expectedVolumes,
    JSON.stringify(corpus.manifest.processing)
  ]], `ON CONFLICT (sid) DO UPDATE SET
    corpus_version=EXCLUDED.corpus_version,content_hash=EXCLUDED.content_hash,work_sid=EXCLUDED.work_sid,
    directory_revision_id=EXCLUDED.directory_revision_id,expected_volumes=EXCLUDED.expected_volumes,processing=EXCLUDED.processing`)

  await upsertRows(client, 'corpus_snapshot_item', ['snapshot_sid', 'source_item_sid', 'item_role', 'juan'], [
    [corpus.manifest.snapshotSid, corpus.directory.sourceItem.sid, 'directory', null],
    ...corpus.volumes.map((volume) => [corpus.manifest.snapshotSid, volume.sourceItem.sid, 'volume', volume.unit.juan])
  ], `ON CONFLICT (source_item_sid) DO UPDATE SET
    snapshot_sid=EXCLUDED.snapshot_sid,item_role=EXCLUDED.item_role,juan=EXCLUDED.juan`)

  await upsertRows(client, 'source_unit', [
    'sid', 'snapshot_sid', 'source_item_sid', 'parent_unit_sid', 'unit_type', 'division', 'juan',
    'label_original', 'label_normalized', 'sequence_index', 'external_anchor'
  ], allUnits.map((unit) => [
    unit.sid, corpus.manifest.snapshotSid, unit.sourceItemSid, unit.parentUnitSid, unit.unitType, unit.division,
    unit.juan, unit.labelOriginal, unit.labelNormalized, unit.sequenceIndex, unit.externalAnchor
  ]), `ON CONFLICT (sid) DO UPDATE SET
    snapshot_sid=EXCLUDED.snapshot_sid,source_item_sid=EXCLUDED.source_item_sid,parent_unit_sid=EXCLUDED.parent_unit_sid,
    unit_type=EXCLUDED.unit_type,division=EXCLUDED.division,juan=EXCLUDED.juan,label_original=EXCLUDED.label_original,
    label_normalized=EXCLUDED.label_normalized,sequence_index=EXCLUDED.sequence_index,external_anchor=EXCLUDED.external_anchor`)

  await upsertRows(client, 'source_passage', [
    'sid', 'snapshot_sid', 'source_unit_sid', 'sequence_index', 'source_text', 'normalized_text', 'checksum',
    'segmentation_method', 'segmentation_version', 'review_status'
  ], allPassages.map((passage) => [
    passage.sid, corpus.manifest.snapshotSid, passage.sourceUnitSid, passage.sequenceIndex, passage.sourceText,
    passage.normalizedText, passage.checksum, passage.segmentationMethod, passage.segmentationVersion, passage.reviewStatus
  ]), `ON CONFLICT (sid) DO UPDATE SET
    snapshot_sid=EXCLUDED.snapshot_sid,source_unit_sid=EXCLUDED.source_unit_sid,sequence_index=EXCLUDED.sequence_index,
    source_text=EXCLUDED.source_text,normalized_text=EXCLUDED.normalized_text,checksum=EXCLUDED.checksum,
    segmentation_method=EXCLUDED.segmentation_method,segmentation_version=EXCLUDED.segmentation_version,
    review_status=EXCLUDED.review_status`, 100)

  await upsertRows(client, 'curation_activity', ['sid', 'activity_type', 'agent', 'happened_at', 'description'], [[
    'curation:songshi-shenzong-rules-v1',
    'rule-based-candidate-annotation',
    'SongScope corpus importer 1.0.0',
    corpus.manifest.directory.retrievedAt,
    '在卷十四至卷十六原始 source passage 上生成候选标注；不产生 accepted assertion。'
  ]], `ON CONFLICT (sid) DO UPDATE SET
    activity_type=EXCLUDED.activity_type,agent=EXCLUDED.agent,happened_at=EXCLUDED.happened_at,description=EXCLUDED.description`)

  await upsertRows(client, 'text_annotation', [
    'sid', 'snapshot_sid', 'passage_sid', 'start_offset', 'end_offset', 'offset_unit', 'surface_text',
    'annotation_type', 'target_entity_sid', 'normalized_value', 'status', 'method', 'curation_activity_sid'
  ], allAnnotations.map((annotation) => [
    annotation.sid, corpus.manifest.snapshotSid, annotation.passageSid, annotation.startOffset, annotation.endOffset,
    annotation.offsetUnit, annotation.surfaceText, annotation.annotationType, annotation.targetEntitySid,
    annotation.normalizedValue, annotation.status, annotation.method, annotation.curationActivitySid
  ]), `ON CONFLICT (sid) DO UPDATE SET
    snapshot_sid=EXCLUDED.snapshot_sid,passage_sid=EXCLUDED.passage_sid,start_offset=EXCLUDED.start_offset,
    end_offset=EXCLUDED.end_offset,offset_unit=EXCLUDED.offset_unit,surface_text=EXCLUDED.surface_text,
    annotation_type=EXCLUDED.annotation_type,target_entity_sid=EXCLUDED.target_entity_sid,
    normalized_value=EXCLUDED.normalized_value,status=EXCLUDED.status,method=EXCLUDED.method,
    curation_activity_sid=EXCLUDED.curation_activity_sid`)

  await upsertRows(client, 'corpus_coverage', [
    'snapshot_sid', 'expected', 'discovered', 'acquired', 'validated', 'segmented', 'searchable',
    'reviewed', 'candidate_annotations', 'anomalies'
  ], [[
    corpus.manifest.snapshotSid, corpus.coverage.expected, corpus.coverage.discovered, corpus.coverage.acquired,
    corpus.coverage.validated, corpus.coverage.segmented, corpus.coverage.searchable, corpus.coverage.reviewed,
    corpus.coverage.candidateAnnotations, JSON.stringify(corpus.coverage.anomalies)
  ]], `ON CONFLICT (snapshot_sid) DO UPDATE SET
    expected=EXCLUDED.expected,discovered=EXCLUDED.discovered,acquired=EXCLUDED.acquired,validated=EXCLUDED.validated,
    segmented=EXCLUDED.segmented,searchable=EXCLUDED.searchable,reviewed=EXCLUDED.reviewed,
    candidate_annotations=EXCLUDED.candidate_annotations,anomalies=EXCLUDED.anomalies`)

  const mappings = locatorPassageMappings()
  const locatorSids = [...new Set(mappings.map((mapping) => mapping[0]))]
  const existingLocators = await client.query<{ sid: string }>('SELECT sid FROM source_locator WHERE sid = ANY($1::text[])', [locatorSids])
  if (existingLocators.rows.length !== locatorSids.length) throw new Error('Expected all three curated volume 338 locators before passage mapping')
  await client.query('DELETE FROM source_locator_passage WHERE locator_sid = ANY($1::text[])', [locatorSids])
  await upsertRows(client, 'source_locator_passage', [
    'locator_sid', 'passage_sid', 'sequence_index', 'start_offset', 'end_offset'
  ], mappings.map((mapping) => [...mapping]), 'ON CONFLICT (locator_sid,passage_sid) DO NOTHING')
  await client.query('UPDATE source_locator SET source_item_sid=$1 WHERE sid = ANY($2::text[])', [corpus.volumes[337].sourceItem.sid, locatorSids])

  await client.query('SET CONSTRAINTS ALL IMMEDIATE')
  await client.query('COMMIT')
  console.log(`Imported ${corpus.manifest.corpusVersion} (${corpus.manifest.contentHash.slice(0, 12)}): ${allPassages.length} passages, ${allAnnotations.length} candidate annotations.`)
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
