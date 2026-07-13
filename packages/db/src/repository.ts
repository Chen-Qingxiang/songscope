import type { Pool } from 'pg'
import type { CorpusDivision } from '@songscope/schema'

export interface CareerFilters {
  from?: number
  to?: number
  placeSid?: string
  itemType?: string
}

export interface PassagePagination {
  offset?: number
  limit?: number
}

export interface TextSearchFilters extends PassagePagination {
  division?: CorpusDivision
  juan?: number
  status?: 'raw' | 'reviewed'
}

export interface AnnalsFilters {
  fromJuan?: number
  toJuan?: number
  status?: 'candidate' | 'reviewed' | 'rejected'
}

export interface SongScopeRepository {
  getDatasetVersion(): Promise<string>
  getPerson(sid: string): Promise<unknown | null>
  getCareer(sid: string, filters?: CareerFilters): Promise<unknown | null>
  getEvent(sid: string): Promise<unknown | null>
  getAssertionEvidence(sid: string): Promise<unknown | null>
  getSource(sid: string): Promise<unknown | null>
  search(query: string): Promise<unknown>
  getCorpusCatalog(): Promise<unknown | null>
  getCorpusUnits(sourceItemSid: string): Promise<unknown | null>
  getUnitPassages(unitSid: string, pagination?: PassagePagination): Promise<unknown | null>
  getPassage(sid: string): Promise<unknown | null>
  searchText(query: string, filters?: TextSearchFilters): Promise<unknown>
  getEntityPassages(sid: string): Promise<unknown | null>
  getAnnals(filters?: AnnalsFilters): Promise<unknown | null>
  getCoverage(version?: string): Promise<unknown | null>
}

interface CorpusContextRow {
  datasetVersion: string
  corpusVersion: string
  snapshotSid: string
  contentHash: string
  workSid: string
  sourceTitle: string
  directoryRevisionId: string | number
  sourceItemSid: string
  provider: string
  pageTitle: string
  pageId: string | number
  revisionId: string | number
  revisionTimestamp: string
  canonicalUrl: string
  historyUrl: string
  attributionUrl: string
  licenseSpdx: string
  licenseName: string
  licenseUrl: string
  expected: number
  discovered: number
  acquired: number
  validated: number
  segmented: number
  searchable: number
  reviewed: number
  candidateAnnotations: number
  anomalies: unknown[]
}

const passageProjectionSelect = `SELECT sp.sid,sp.source_unit_sid AS "unitSid",su.juan,su.division,
  sp.sequence_index AS "sequenceIndex",sp.source_text AS "sourceText",sp.normalized_text AS "normalizedText",
  sp.checksum,sp.review_status AS "reviewStatus",
  (SELECT revision_id FROM source_item WHERE sid=su.source_item_sid) AS "sourceRevisionId",
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'sid',ta.sid,'startOffset',ta.start_offset,'endOffset',ta.end_offset,'offsetUnit',ta.offset_unit,
    'surfaceText',ta.surface_text,'annotationType',ta.annotation_type,'targetEntitySid',ta.target_entity_sid,
    'normalizedValue',ta.normalized_value,'status',ta.status,'method',ta.method
  ) ORDER BY ta.start_offset,ta.end_offset,ta.annotation_type)
    FROM text_annotation ta WHERE ta.passage_sid=sp.sid),'[]'::jsonb) AS annotations,
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'locatorSid',sl.sid,'locatorValue',sl.locator_value,'quoteText',sl.quote_text,
    'mappingSequence',slp.sequence_index,'assertions',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'assertionSid',a.sid,'subjectSid',a.subject_sid,'predicate',a.predicate,'status',a.status,'stance',el.stance
      ) ORDER BY a.sid)
      FROM evidence_link el JOIN assertion a ON a.sid=el.assertion_sid WHERE el.locator_sid=sl.sid
    ),'[]'::jsonb)
  ) ORDER BY slp.sequence_index,sl.sid)
    FROM source_locator_passage slp JOIN source_locator sl ON sl.sid=slp.locator_sid
    WHERE slp.passage_sid=sp.sid),'[]'::jsonb) AS locators
  FROM source_passage sp JOIN source_unit su ON su.sid=sp.source_unit_sid`

export class PostgresSongScopeRepository implements SongScopeRepository {
  constructor(private readonly pool: Pool) {}

  private async getCorpusContext(version?: string): Promise<CorpusContextRow | null> {
    const result = await this.pool.query<CorpusContextRow>(`SELECT
      dv.version AS "datasetVersion",cs.corpus_version AS "corpusVersion",cs.sid AS "snapshotSid",
      cs.content_hash AS "contentHash",cs.work_sid AS "workSid",sw.title AS "sourceTitle",
      cs.directory_revision_id AS "directoryRevisionId",si.sid AS "sourceItemSid",si.provider,
      si.page_title AS "pageTitle",si.page_id AS "pageId",si.revision_id AS "revisionId",
      to_char(si.revision_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "revisionTimestamp",
      si.canonical_url AS "canonicalUrl",si.history_url AS "historyUrl",si.attribution_url AS "attributionUrl",
      si.license_spdx AS "licenseSpdx",si.license_name AS "licenseName",si.license_url AS "licenseUrl",
      cc.expected,cc.discovered,cc.acquired,cc.validated,cc.segmented,cc.searchable,cc.reviewed,
      cc.candidate_annotations AS "candidateAnnotations",cc.anomalies
      FROM corpus_snapshot cs
      JOIN source_work sw ON sw.sid=cs.work_sid
      JOIN corpus_snapshot_item csi ON csi.snapshot_sid=cs.sid AND csi.item_role='directory'
      JOIN source_item si ON si.sid=csi.source_item_sid
      JOIN corpus_coverage cc ON cc.snapshot_sid=cs.sid
      CROSS JOIN LATERAL (SELECT version FROM dataset_version ORDER BY created_at DESC LIMIT 1) dv
      WHERE ($1::text IS NULL OR cs.corpus_version=$1 OR dv.version=$1)
      ORDER BY cs.corpus_version DESC LIMIT 1`, [version ?? null])
    return result.rows[0] ?? null
  }

  private corpusContextProjection(context: CorpusContextRow) {
    return {
      datasetVersion: context.datasetVersion,
      corpusVersion: context.corpusVersion,
      snapshotSid: context.snapshotSid
    }
  }

  private coverageProjection(context: CorpusContextRow) {
    return {
      expected: context.expected,
      discovered: context.discovered,
      acquired: context.acquired,
      validated: context.validated,
      segmented: context.segmented,
      searchable: context.searchable,
      reviewed: context.reviewed,
      candidateAnnotations: context.candidateAnnotations,
      anomalies: context.anomalies
    }
  }

  private corpusSourceProjection(context: CorpusContextRow) {
    return {
      workSid: context.workSid,
      title: context.sourceTitle,
      provider: context.provider,
      directoryRevisionId: Number(context.directoryRevisionId),
      canonicalUrl: context.canonicalUrl,
      historyUrl: context.historyUrl,
      license: { spdxId: context.licenseSpdx, name: context.licenseName, url: context.licenseUrl }
    }
  }

  private async passageSourceProjection(sourceItemSid: string) {
    const result = await this.pool.query(`SELECT sid AS "sourceItemSid",page_title AS "pageTitle",page_id AS "pageId",
      revision_id AS "revisionId",to_char(revision_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "revisionTimestamp",
      canonical_url AS "canonicalUrl",history_url AS "historyUrl",attribution_url AS "attributionUrl",
      license_spdx AS "licenseSpdx",license_name AS "licenseName",license_url AS "licenseUrl"
      FROM source_item WHERE sid=$1`, [sourceItemSid])
    const row = result.rows[0]
    return row ? {
      sourceItemSid: row.sourceItemSid,
      pageTitle: row.pageTitle,
      pageId: Number(row.pageId),
      revisionId: Number(row.revisionId),
      revisionTimestamp: row.revisionTimestamp,
      canonicalUrl: row.canonicalUrl,
      historyUrl: row.historyUrl,
      attributionUrl: row.attributionUrl,
      license: { spdxId: row.licenseSpdx, name: row.licenseName, url: row.licenseUrl }
    } : null
  }

  async getDatasetVersion(): Promise<string> {
    const result = await this.pool.query<{ version: string }>('SELECT version FROM dataset_version ORDER BY created_at DESC LIMIT 1')
    return result.rows[0]?.version ?? 'unknown'
  }

  async getPerson(sid: string) {
    const result = await this.pool.query(`SELECT sid, primary_name AS name,
      traditional_name AS "traditionalName", birth_year AS "birthYear",
      death_year AS "deathYear", summary FROM person WHERE sid = $1`, [sid])
    return result.rows[0] ? { datasetVersion: await this.getDatasetVersion(), ...result.rows[0] } : null
  }

  async getCareer(sid: string, filters: CareerFilters = {}) {
    const person = await this.pool.query<{ sid: string; name: string }>(
      'SELECT sid, primary_name AS name FROM person WHERE sid = $1', [sid]
    )
    if (!person.rows[0]) return null

    const result = await this.pool.query(`
      WITH base AS (
        SELECT aa.sid AS id, 'appointment'::text AS "itemType",
          EXTRACT(YEAR FROM te.normalized_start)::int AS year,
          te.original_text AS "yearLabel", te.precision, te.certainty AS uncertainty,
          e.label AS title, e.description AS summary,
          p.sid AS "placeSid", p.preferred_name AS "placeName", p.geometry_status AS "resolutionStatus",
          CASE WHEN p.geom IS NULL THEN NULL ELSE ST_X(p.geom) END AS longitude,
          CASE WHEN p.geom IS NULL THEN NULL ELSE ST_Y(p.geom) END AS latitude, p.note AS "placeNote",
          a.sid AS "assertionSid", a.status = 'accepted' AS accepted,
          e.sequence_index AS "sequenceIndex"
        FROM appointment_action aa
        JOIN event e ON e.sid = aa.event_sid
        JOIN temporal_extent te ON te.sid = aa.temporal_extent_sid
        LEFT JOIN place p ON p.sid = e.place_sid
        JOIN assertion a ON a.subject_sid = aa.sid AND a.status = 'accepted'
        WHERE aa.person_sid = $1

        UNION ALL

        SELECT se.sid AS id,
          CASE WHEN se.episode_type = 'residence' THEN 'residence' ELSE 'service' END AS "itemType",
          EXTRACT(YEAR FROM te.normalized_start)::int AS year,
          te.original_text AS "yearLabel", te.precision, te.certainty AS uncertainty,
          CASE WHEN se.episode_type = 'residence' THEN '黄州实际居住状态'
            ELSE '实际任职：' || oc.label END AS title,
          se.note AS summary,
          p.sid AS "placeSid", p.preferred_name AS "placeName", p.geometry_status AS "resolutionStatus",
          CASE WHEN p.geom IS NULL THEN NULL ELSE ST_X(p.geom) END AS longitude,
          CASE WHEN p.geom IS NULL THEN NULL ELSE ST_Y(p.geom) END AS latitude, p.note AS "placeNote",
          a.sid AS "assertionSid", a.status = 'accepted' AS accepted,
          COALESCE(source_event.sequence_index, 0) + 1 AS "sequenceIndex"
        FROM service_episode se
        JOIN temporal_extent te ON te.sid = se.temporal_extent_sid
        LEFT JOIN office_concept oc ON oc.sid = se.duty_office_sid
        JOIN place p ON p.sid = se.place_sid
        LEFT JOIN event source_event ON source_event.sid = COALESCE(se.created_by_event_sid, se.derived_from_appointment_sid)
        JOIN assertion a ON a.subject_sid = se.sid AND a.status = 'accepted'
        WHERE se.person_sid = $1

        UNION ALL

        SELECT e.sid AS id, e.event_type AS "itemType",
          EXTRACT(YEAR FROM te.normalized_start)::int AS year,
          te.original_text AS "yearLabel", te.precision, te.certainty AS uncertainty,
          e.label AS title, e.description AS summary,
          p.sid AS "placeSid", p.preferred_name AS "placeName", p.geometry_status AS "resolutionStatus",
          CASE WHEN p.geom IS NULL THEN NULL ELSE ST_X(p.geom) END AS longitude,
          CASE WHEN p.geom IS NULL THEN NULL ELSE ST_Y(p.geom) END AS latitude, p.note AS "placeNote",
          a.sid AS "assertionSid", a.status = 'accepted' AS accepted,
          e.sequence_index AS "sequenceIndex"
        FROM event e
        JOIN temporal_extent te ON te.sid = e.temporal_extent_sid
        LEFT JOIN place p ON p.sid = e.place_sid
        JOIN assertion a ON a.subject_sid = e.sid AND a.status = 'accepted'
        WHERE e.event_type IN ('movement','political','disaster','disaster-response')
          AND e.parent_event_sid IS NULL
          AND (
            EXISTS (SELECT 1 FROM event_participation ep WHERE ep.event_sid=e.sid AND ep.entity_sid=$1)
            OR EXISTS (
              SELECT 1 FROM event_relation er
              JOIN event_participation response_participation
                ON response_participation.event_sid=er.subject_event_sid AND response_participation.entity_sid=$1
              WHERE er.object_event_sid=e.sid AND er.relation_type='responded-to'
            )
          )
      )
      SELECT base.*, count(el.locator_sid)::int AS "evidenceCount",
        array_agg(DISTINCT sw.title) FILTER (WHERE sw.title IS NOT NULL) AS "sourceTitles",
        array_agg(DISTINCT sl.locator_value) FILTER (WHERE sl.locator_value IS NOT NULL) AS "locatorLabels"
      FROM base
      LEFT JOIN evidence_link el ON el.assertion_sid = base."assertionSid" AND el.stance = 'supports'
      LEFT JOIN source_locator sl ON sl.sid = el.locator_sid
      LEFT JOIN source_item si ON si.sid = sl.source_item_sid
      LEFT JOIN source_work sw ON sw.sid = si.work_sid
      WHERE ($2::int IS NULL OR base.year >= $2)
        AND ($3::int IS NULL OR base.year <= $3)
        AND ($4::text IS NULL OR base."placeSid" = $4)
        AND ($5::text IS NULL OR base."itemType" = $5)
      GROUP BY base.id, base."itemType", base.year, base."yearLabel", base.precision,
        base.uncertainty, base.title, base.summary, base."placeSid", base."placeName",
        base."resolutionStatus", base.longitude, base.latitude, base."placeNote", base."assertionSid", base.accepted,
        base."sequenceIndex"
      ORDER BY base.year, base."sequenceIndex",
        CASE base."itemType" WHEN 'appointment' THEN 1 WHEN 'movement' THEN 2 WHEN 'service' THEN 3
          WHEN 'disaster' THEN 4 WHEN 'disaster-response' THEN 5 WHEN 'political' THEN 6 ELSE 7 END,
        base.id
    `, [sid, filters.from ?? null, filters.to ?? null, filters.placeSid ?? null, filters.itemType ?? null])

    return {
      datasetVersion: await this.getDatasetVersion(),
      person: person.rows[0],
      items: result.rows.map((row) => ({
        id: row.id,
        itemType: row.itemType,
        year: row.year,
        yearLabel: row.yearLabel,
        precision: row.precision,
        uncertainty: row.uncertainty,
        title: row.title,
        summary: row.summary,
        place: row.placeSid ? {
          sid: row.placeSid,
          name: row.placeName,
          resolutionStatus: row.resolutionStatus,
          longitude: row.longitude === null ? null : Number(row.longitude),
          latitude: row.latitude === null ? null : Number(row.latitude),
          note: row.placeNote
        } : null,
        evidenceSummary: {
          assertionSid: row.assertionSid,
          accepted: row.accepted,
          evidenceCount: row.evidenceCount,
          sourceTitles: row.sourceTitles ?? [],
          locatorLabels: row.locatorLabels ?? []
        }
      }))
    }
  }

  async getEvent(sid: string) {
    const [base, participants, children, relations, appointment, components, assertions] = await Promise.all([
      this.pool.query(`SELECT e.sid, e.event_type AS "eventType", e.label, e.description, e.status,
        te.original_text AS "dateOriginal", to_char(te.normalized_start,'YYYY-MM-DD') AS "normalizedStart",
        to_char(te.normalized_end,'YYYY-MM-DD') AS "normalizedEnd", te.precision, te.certainty AS uncertainty,
        te.conversion_method AS "conversionMethod", te.conversion_note AS "conversionNote",
        p.sid AS "placeSid", p.preferred_name AS "placeName", p.geometry_status AS "resolutionStatus",
        CASE WHEN p.geom IS NULL THEN NULL ELSE ST_X(p.geom) END AS longitude,
        CASE WHEN p.geom IS NULL THEN NULL ELSE ST_Y(p.geom) END AS latitude, p.note AS "placeNote"
        FROM event e JOIN temporal_extent te ON te.sid=e.temporal_extent_sid
        LEFT JOIN place p ON p.sid=e.place_sid WHERE e.sid=$1`, [sid]),
      this.pool.query(`SELECT er.sid, er.label, er.entity_type AS "entityType", ep.role
        FROM event_participation ep JOIN entity_registry er ON er.sid=ep.entity_sid
        WHERE ep.event_sid=$1 ORDER BY ep.role, er.label`, [sid]),
      this.pool.query(`SELECT sid, event_type AS "eventType", label FROM event
        WHERE parent_event_sid=$1 ORDER BY sid`, [sid]),
      this.pool.query(`SELECT 'outgoing' AS direction, er.relation_type AS "relationType", er.note,
          e.sid, e.label, e.event_type AS "eventType"
        FROM event_relation er JOIN event e ON e.sid=er.object_event_sid WHERE er.subject_event_sid=$1
        UNION ALL
        SELECT 'incoming' AS direction, er.relation_type AS "relationType", er.note,
          e.sid, e.label, e.event_type AS "eventType"
        FROM event_relation er JOIN event e ON e.sid=er.subject_event_sid WHERE er.object_event_sid=$1`, [sid]),
      this.pool.query(`SELECT action_type AS "actionType", raw_expression AS "rawExpression", note
        FROM appointment_action WHERE sid=$1`, [sid]),
      this.pool.query(`SELECT ac.component_type AS "componentType", ac.raw_expression AS "rawExpression",
          oc.sid AS "officeSid", oc.label AS "officeLabel", oc.category AS "officeCategory",
          p.sid AS "placeSid", p.preferred_name AS "placeName"
        FROM appointment_component ac JOIN office_concept oc ON oc.sid=ac.office_concept_sid
        LEFT JOIN place p ON p.sid=ac.place_sid WHERE ac.appointment_action_sid=$1
        ORDER BY ac.id`, [sid]),
      this.pool.query(`SELECT a.sid AS "assertionSid", a.status='accepted' AS accepted,
          count(el.locator_sid)::int AS "evidenceCount",
          array_agg(DISTINCT sw.title) FILTER (WHERE sw.title IS NOT NULL) AS "sourceTitles",
          array_agg(DISTINCT sl.locator_value) FILTER (WHERE sl.locator_value IS NOT NULL) AS "locatorLabels"
        FROM assertion a LEFT JOIN evidence_link el ON el.assertion_sid=a.sid AND el.stance='supports'
        LEFT JOIN source_locator sl ON sl.sid=el.locator_sid
        LEFT JOIN source_item si ON si.sid=sl.source_item_sid
        LEFT JOIN source_work sw ON sw.sid=si.work_sid
        WHERE a.subject_sid=$1 GROUP BY a.sid,a.status ORDER BY a.sid`, [sid])
    ])
    const row = base.rows[0]
    if (!row) return null

    return {
      datasetVersion: await this.getDatasetVersion(),
      event: {
        sid: row.sid,
        eventType: row.eventType,
        label: row.label,
        description: row.description,
        status: row.status,
        date: {
          original: row.dateOriginal,
          normalizedStart: row.normalizedStart,
          normalizedEnd: row.normalizedEnd,
          precision: row.precision,
          uncertainty: row.uncertainty,
          conversionMethod: row.conversionMethod,
          conversionNote: row.conversionNote
        },
        place: row.placeSid ? {
          sid: row.placeSid,
          name: row.placeName,
          resolutionStatus: row.resolutionStatus,
          longitude: row.longitude === null ? null : Number(row.longitude),
          latitude: row.latitude === null ? null : Number(row.latitude),
          note: row.placeNote
        } : null
      },
      participants: participants.rows,
      children: children.rows,
      relations: relations.rows.map((item) => ({
        direction: item.direction,
        relationType: item.relationType,
        note: item.note,
        event: { sid: item.sid, label: item.label, eventType: item.eventType }
      })),
      appointment: appointment.rows[0] ? { ...appointment.rows[0], components: components.rows } : null,
      assertions: assertions.rows.map((item) => ({
        assertionSid: item.assertionSid,
        accepted: item.accepted,
        evidenceCount: item.evidenceCount,
        sourceTitles: item.sourceTitles ?? [],
        locatorLabels: item.locatorLabels ?? []
      }))
    }
  }

  async getAssertionEvidence(sid: string) {
    const result = await this.pool.query(`SELECT a.sid, a.subject_sid AS "subjectSid", a.predicate, a.status,
      a.confidence::float, a.rationale,
      te.original_text AS "dateOriginal", to_char(te.normalized_start,'YYYY-MM-DD') AS "normalizedStart",
      to_char(te.normalized_end,'YYYY-MM-DD') AS "normalizedEnd", te.precision,
      te.certainty AS uncertainty, te.conversion_method AS "conversionMethod", te.conversion_note AS "conversionNote",
      el.stance, el.note, sl.sid AS "locatorSid", sl.locator_type AS "locatorType",
      sl.locator_value AS "locatorValue", sl.quote_text AS quote,
      sw.sid AS "sourceSid", si.label AS "sourceItem", si.url, si.citation, sw.title AS "sourceTitle"
      FROM assertion a LEFT JOIN temporal_extent te ON te.sid=a.temporal_extent_sid
      LEFT JOIN evidence_link el ON el.assertion_sid=a.sid
      LEFT JOIN source_locator sl ON sl.sid=el.locator_sid
      LEFT JOIN source_item si ON si.sid=sl.source_item_sid
      LEFT JOIN source_work sw ON sw.sid=si.work_sid WHERE a.sid=$1
      ORDER BY el.stance, sw.title, sl.locator_value`, [sid])
    if (!result.rows[0]) return null
    const first = result.rows[0]
    return {
      datasetVersion: await this.getDatasetVersion(),
      assertion: {
        sid: first.sid,
        subjectSid: first.subjectSid,
        predicate: first.predicate,
        status: first.status,
        confidence: first.confidence,
        rationale: first.rationale,
        date: first.dateOriginal ? {
          original: first.dateOriginal,
          normalizedStart: first.normalizedStart,
          normalizedEnd: first.normalizedEnd,
          precision: first.precision,
          uncertainty: first.uncertainty,
          conversionMethod: first.conversionMethod,
          conversionNote: first.conversionNote
        } : null
      },
      evidence: result.rows.filter((row) => row.locatorSid).map((row) => ({
        stance: row.stance,
        note: row.note,
        locator: { sid: row.locatorSid, type: row.locatorType, value: row.locatorValue, quote: row.quote },
        source: { sid: row.sourceSid, title: row.sourceTitle, item: row.sourceItem, citation: row.citation, url: row.url }
      }))
    }
  }

  async getSource(sid: string) {
    const source = await this.pool.query(`SELECT sid, title, creator, work_type AS "workType"
      FROM source_work WHERE sid=$1`, [sid])
    if (!source.rows[0]) return null
    const [items, assertions] = await Promise.all([
      this.pool.query(`SELECT si.sid AS "itemSid", si.label, si.url, si.citation,
          sl.sid AS "locatorSid", sl.locator_type AS "locatorType", sl.locator_value AS "locatorValue", sl.quote_text AS quote
        FROM source_item si LEFT JOIN source_locator sl ON sl.source_item_sid=si.sid
        WHERE si.work_sid=$1 ORDER BY si.sid,sl.sid`, [sid]),
      this.pool.query(`SELECT DISTINCT a.sid, a.subject_sid AS "subjectSid", a.predicate, a.status,
          el.stance, sl.sid AS "locatorSid"
        FROM assertion a JOIN evidence_link el ON el.assertion_sid=a.sid
        JOIN source_locator sl ON sl.sid=el.locator_sid JOIN source_item si ON si.sid=sl.source_item_sid
        WHERE si.work_sid=$1 ORDER BY a.sid,sl.sid`, [sid])
    ])
    const grouped = new Map<string, { sid: string; label: string; url: string | null; citation: string; locators: unknown[] }>()
    for (const row of items.rows) {
      const item = grouped.get(row.itemSid) ?? {
        sid: row.itemSid,
        label: row.label,
        url: row.url,
        citation: row.citation,
        locators: [] as unknown[]
      }
      if (row.locatorSid) item.locators.push({ sid: row.locatorSid, type: row.locatorType, value: row.locatorValue, quote: row.quote })
      grouped.set(row.itemSid, item)
    }
    return { datasetVersion: await this.getDatasetVersion(), source: source.rows[0], items: [...grouped.values()], assertions: assertions.rows }
  }

  async search(query: string) {
    const result = await this.pool.query(`
      SELECT sid, 'person' AS type, primary_name AS label, summary AS description
        FROM person WHERE primary_name ILIKE $1 OR traditional_name ILIKE $1 OR summary ILIKE $1
      UNION ALL
      SELECT sid, 'place', preferred_name, note FROM place
        WHERE preferred_name ILIKE $1 OR historical_name ILIKE $1 OR note ILIKE $1
      UNION ALL
      SELECT sid, 'event', label, description FROM event
        WHERE label ILIKE $1 OR description ILIKE $1
      UNION ALL
      SELECT sid, 'source', title, creator FROM source_work
        WHERE title ILIKE $1 OR creator ILIKE $1
      ORDER BY type,label LIMIT 30
    `, [`%${query}%`])
    return { datasetVersion: await this.getDatasetVersion(), query, results: result.rows }
  }

  async getCorpusCatalog() {
    const context = await this.getCorpusContext()
    if (!context) return null
    const [divisions, volumes] = await Promise.all([
      this.pool.query(`SELECT sid,division,label_original AS "labelOriginal",label_normalized AS "labelNormalized",
        sequence_index AS "sequenceIndex"
        FROM source_unit WHERE snapshot_sid=$1 AND unit_type='work_division'
        ORDER BY sequence_index`, [context.snapshotSid]),
      this.pool.query(`SELECT su.sid AS "unitSid",su.source_item_sid AS "sourceItemSid",su.juan,su.division,
        su.label_original AS "labelOriginal",su.label_normalized AS "labelNormalized",si.revision_id AS "revisionId",
        count(DISTINCT sp.sid)::int AS "passageCount",count(DISTINCT ta.sid)::int AS "candidateAnnotationCount"
        FROM source_unit su JOIN source_item si ON si.sid=su.source_item_sid
        LEFT JOIN source_passage sp ON sp.source_unit_sid=su.sid
        LEFT JOIN text_annotation ta ON ta.passage_sid=sp.sid AND ta.status='candidate'
        WHERE su.snapshot_sid=$1 AND su.unit_type='juan'
        GROUP BY su.sid,si.revision_id ORDER BY su.sequence_index`, [context.snapshotSid])
    ])
    return {
      ...this.corpusContextProjection(context),
      source: this.corpusSourceProjection(context),
      coverage: this.coverageProjection(context),
      divisions: divisions.rows.map((division) => ({
        sid: division.sid,
        division: division.division,
        labelOriginal: division.labelOriginal,
        labelNormalized: division.labelNormalized,
        volumeCount: volumes.rows.filter((volume) => volume.division === division.division).length,
        volumes: volumes.rows.filter((volume) => volume.division === division.division).map((volume) => ({
          ...volume,
          revisionId: Number(volume.revisionId)
        }))
      }))
    }
  }

  async getCorpusUnits(sourceItemSid: string) {
    const context = await this.getCorpusContext()
    if (!context) return null
    const exists = await this.pool.query('SELECT 1 FROM corpus_snapshot_item WHERE snapshot_sid=$1 AND source_item_sid=$2', [
      context.snapshotSid, sourceItemSid
    ])
    if (!exists.rows[0]) return null
    const units = await this.pool.query(`SELECT sid,parent_unit_sid AS "parentUnitSid",unit_type AS "unitType",division,juan,
      label_original AS "labelOriginal",label_normalized AS "labelNormalized",sequence_index AS "sequenceIndex"
      FROM source_unit WHERE snapshot_sid=$1 AND source_item_sid=$2 ORDER BY sequence_index,sid`, [context.snapshotSid, sourceItemSid])
    return { ...this.corpusContextProjection(context), sourceItemSid, units: units.rows }
  }

  async getUnitPassages(unitSid: string, pagination: PassagePagination = {}) {
    const context = await this.getCorpusContext()
    if (!context) return null
    const offset = Math.max(0, pagination.offset ?? 0)
    const limit = Math.min(500, Math.max(1, pagination.limit ?? 100))
    const unit = await this.pool.query(`SELECT su.sid AS "unitSid",su.source_item_sid AS "sourceItemSid",su.juan,su.division,
      su.label_original AS "labelOriginal",su.label_normalized AS "labelNormalized",si.revision_id AS "revisionId",
      count(DISTINCT sp.sid)::int AS "passageCount",count(DISTINCT ta.sid)::int AS "candidateAnnotationCount"
      FROM source_unit su JOIN source_item si ON si.sid=su.source_item_sid
      LEFT JOIN source_passage sp ON sp.source_unit_sid=su.sid
      LEFT JOIN text_annotation ta ON ta.passage_sid=sp.sid AND ta.status='candidate'
      WHERE su.sid=$1 AND su.snapshot_sid=$2 AND su.unit_type='juan'
      GROUP BY su.sid,si.revision_id`, [unitSid, context.snapshotSid])
    const unitRow = unit.rows[0]
    if (!unitRow) return null
    const passages = await this.pool.query(`${passageProjectionSelect}
      WHERE sp.source_unit_sid=$1 ORDER BY sp.sequence_index OFFSET $2 LIMIT $3`, [unitSid, offset, limit])
    const source = await this.passageSourceProjection(unitRow.sourceItemSid)
    if (!source) return null
    return {
      ...this.corpusContextProjection(context),
      unit: { ...unitRow, revisionId: Number(unitRow.revisionId) },
      source,
      pagination: { offset, limit, total: unitRow.passageCount },
      passages: passages.rows
    }
  }

  async getPassage(sid: string) {
    const context = await this.getCorpusContext()
    if (!context) return null
    const result = await this.pool.query(`${passageProjectionSelect} WHERE sp.sid=$1 AND sp.snapshot_sid=$2`, [sid, context.snapshotSid])
    const passage = result.rows[0]
    if (!passage) return null
    const unit = await this.pool.query('SELECT source_item_sid AS "sourceItemSid" FROM source_unit WHERE sid=$1', [passage.unitSid])
    const source = await this.passageSourceProjection(unit.rows[0].sourceItemSid)
    if (!source) return null
    const adjacent = await this.pool.query(`SELECT sid,sequence_index AS "sequenceIndex" FROM source_passage
      WHERE source_unit_sid=$1 AND sequence_index IN ($2-1,$2+1) ORDER BY sequence_index`, [passage.unitSid, passage.sequenceIndex])
    const previous = adjacent.rows.find((row) => row.sequenceIndex === passage.sequenceIndex - 1) ?? null
    const next = adjacent.rows.find((row) => row.sequenceIndex === passage.sequenceIndex + 1) ?? null
    return {
      ...this.corpusContextProjection(context),
      passage,
      source,
      stableCitation: `《宋史》卷${passage.juan}，第${passage.sequenceIndex}段，中文维基文库 revision ${source.revisionId}，SongScope passage ${passage.sid}`,
      previous,
      next
    }
  }

  async searchText(query: string, filters: TextSearchFilters = {}) {
    const context = await this.getCorpusContext()
    if (!context) throw new Error('Corpus snapshot is not available')
    const offset = Math.max(0, filters.offset ?? 0)
    const limit = Math.min(500, Math.max(1, filters.limit ?? 100))
    const candidates = await this.pool.query(`SELECT sp.sid AS "passageSid",sp.source_unit_sid AS "unitSid",su.juan,su.division,
      sp.sequence_index AS "sequenceIndex",coalesce(sp.normalized_text,sp.source_text) AS text,
      sp.review_status AS "reviewStatus",si.revision_id AS "sourceRevisionId"
      FROM source_passage sp JOIN source_unit su ON su.sid=sp.source_unit_sid
      JOIN source_item si ON si.sid=su.source_item_sid
      WHERE sp.snapshot_sid=$1 AND strpos(coalesce(sp.normalized_text,sp.source_text),$2)>0
        AND ($3::text IS NULL OR su.division=$3) AND ($4::int IS NULL OR su.juan=$4)
        AND ($5::text IS NULL OR sp.review_status=$5)
      ORDER BY su.sequence_index,sp.sequence_index`, [
        context.snapshotSid, query, filters.division ?? null, filters.juan ?? null, filters.status ?? null
      ])
    const occurrences: Array<Record<string, unknown>> = []
    for (const row of candidates.rows) {
      let matchIndex = row.text.indexOf(query)
      while (matchIndex >= 0) {
        const matchEndIndex = matchIndex + query.length
        const contextStart = Math.max(0, matchIndex - 36)
        const contextEnd = Math.min(row.text.length, matchEndIndex + 36)
        occurrences.push({
          occurrenceType: 'occurrence',
          passageSid: row.passageSid,
          unitSid: row.unitSid,
          juan: row.juan,
          division: row.division,
          sequenceIndex: row.sequenceIndex,
          context: `${contextStart > 0 ? '…' : ''}${row.text.slice(contextStart, contextEnd)}${contextEnd < row.text.length ? '…' : ''}`,
          matchStart: Array.from(row.text.slice(0, matchIndex)).length,
          matchEnd: Array.from(row.text.slice(0, matchEndIndex)).length,
          reviewStatus: row.reviewStatus,
          sourceRevisionId: Number(row.sourceRevisionId)
        })
        matchIndex = row.text.indexOf(query, matchEndIndex)
      }
    }
    return {
      ...this.corpusContextProjection(context),
      query,
      occurrenceLabel: '文本命中',
      filters: { division: filters.division ?? null, juan: filters.juan ?? null, status: filters.status ?? null },
      pagination: { offset, limit, total: occurrences.length },
      results: occurrences.slice(offset, offset + limit),
      coverage: this.coverageProjection(context),
      exportMetadata: {
        queryId: 'songshi-literal-text-search', queryVersion: '1.0.0',
        ...this.corpusContextProjection(context), statisticalUnit: 'exact non-overlapping text occurrence',
        columns: ['passageSid', 'juan', 'division', 'sequenceIndex', 'context', 'matchStart', 'matchEnd', 'sourceRevisionId']
      }
    }
  }

  async getEntityPassages(sid: string) {
    const context = await this.getCorpusContext()
    if (!context) return null
    const entity = await this.pool.query('SELECT sid,label,entity_type AS "entityType" FROM entity_registry WHERE sid=$1', [sid])
    if (!entity.rows[0]) return null
    const stringResponse = await this.searchText(entity.rows[0].label, { limit: 500 }) as { results: unknown[] }
    const [annotations, assertions] = await Promise.all([
      this.pool.query(`SELECT ta.sid,ta.start_offset AS "startOffset",ta.end_offset AS "endOffset",ta.offset_unit AS "offsetUnit",
        ta.surface_text AS "surfaceText",ta.annotation_type AS "annotationType",ta.target_entity_sid AS "targetEntitySid",
        ta.normalized_value AS "normalizedValue",ta.status,ta.method,ta.passage_sid AS "passageSid",su.juan
        FROM text_annotation ta JOIN source_passage sp ON sp.sid=ta.passage_sid JOIN source_unit su ON su.sid=sp.source_unit_sid
        WHERE ta.snapshot_sid=$1 AND ta.target_entity_sid=$2 ORDER BY su.sequence_index,sp.sequence_index,ta.start_offset`, [context.snapshotSid, sid]),
      this.pool.query(`WITH related_subjects AS (
          SELECT $2::text AS sid
          UNION SELECT aa.sid FROM appointment_action aa WHERE aa.person_sid=$2
          UNION SELECT se.sid FROM service_episode se WHERE se.person_sid=$2
          UNION SELECT ep.event_sid FROM event_participation ep WHERE ep.entity_sid=$2
        )
        SELECT DISTINCT a.sid AS "assertionSid",a.subject_sid AS "subjectSid",a.predicate,sl.sid AS "locatorSid",
          slp.passage_sid AS "passageSid",el.stance
        FROM related_subjects rs JOIN assertion a ON a.subject_sid=rs.sid AND a.status='accepted'
        JOIN evidence_link el ON el.assertion_sid=a.sid AND el.stance='supports'
        JOIN source_locator sl ON sl.sid=el.locator_sid
        JOIN source_locator_passage slp ON slp.locator_sid=sl.sid
        JOIN source_passage sp ON sp.sid=slp.passage_sid AND sp.snapshot_sid=$1
        ORDER BY slp.passage_sid,a.sid`, [context.snapshotSid, sid])
    ])
    return {
      ...this.corpusContextProjection(context),
      entity: entity.rows[0],
      stringOccurrences: stringResponse.results,
      resolvedAnnotations: annotations.rows.map((row) => ({
        annotation: {
          sid: row.sid, startOffset: row.startOffset, endOffset: row.endOffset, offsetUnit: row.offsetUnit,
          surfaceText: row.surfaceText, annotationType: row.annotationType, targetEntitySid: row.targetEntitySid,
          normalizedValue: row.normalizedValue, status: row.status, method: row.method
        },
        passageSid: row.passageSid,
        juan: row.juan
      })),
      acceptedAssertions: assertions.rows
    }
  }

  async getAnnals(filters: AnnalsFilters = {}) {
    const context = await this.getCorpusContext()
    if (!context) return null
    const fromJuan = Math.max(14, filters.fromJuan ?? 14)
    const toJuan = Math.min(16, filters.toJuan ?? 16)
    const rows = await this.pool.query(`${passageProjectionSelect}
      WHERE sp.snapshot_sid=$1 AND su.juan BETWEEN $2 AND $3 ORDER BY su.sequence_index,sp.sequence_index`, [
        context.snapshotSid, fromJuan, toJuan
      ])
    const annotationTypes = ['chronology', 'person', 'place', 'institution', 'office', 'appointment-action', 'event-term'] as const
    return {
      ...this.corpusContextProjection(context),
      query: {
        id: 'shenzong-annals-v1', version: '1.0.0', title: '神宗本纪原文顺序纪事',
        scope: '《宋史》卷十四至卷十六；仅显示原文与候选标注，不推定公历日期。',
        statisticalUnit: 'source passage', fromJuan, toJuan, annotationStatus: filters.status ?? null
      },
      rows: rows.rows.map((row) => {
        const selectedAnnotations = (row.annotations as Array<{ annotationType: string; status: string }>).filter(
          (annotation) => filters.status === undefined || annotation.status === filters.status
        )
        const candidateCounts = Object.fromEntries(annotationTypes.map((type) => [
          type, selectedAnnotations.filter((annotation) => annotation.annotationType === type).length
        ]))
        return {
          passageSid: row.sid, unitSid: row.unitSid, juan: row.juan, sequenceIndex: row.sequenceIndex,
          sourceText: row.sourceText, normalizedText: row.normalizedText,
          chronology: selectedAnnotations.filter((annotation) => annotation.annotationType === 'chronology'),
          candidateCounts, sourceRevisionId: Number(row.sourceRevisionId)
        }
      }),
      exportMetadata: {
        queryId: 'shenzong-annals-v1', queryVersion: '1.0.0', ...this.corpusContextProjection(context),
        statisticalUnit: 'source passage',
        columns: ['passageSid', 'juan', 'sequenceIndex', 'sourceText', 'chronology', 'candidateCounts', 'sourceRevisionId']
      }
    }
  }

  async getCoverage(version?: string) {
    const context = await this.getCorpusContext(version)
    return context ? {
      ...this.corpusContextProjection(context),
      source: this.corpusSourceProjection(context),
      coverage: this.coverageProjection(context)
    } : null
  }
}
