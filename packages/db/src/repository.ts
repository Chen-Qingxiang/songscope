import type { Pool } from 'pg'

export interface CareerFilters {
  from?: number
  to?: number
  placeSid?: string
  itemType?: string
}

export interface SongScopeRepository {
  getDatasetVersion(): Promise<string>
  getPerson(sid: string): Promise<unknown | null>
  getCareer(sid: string, filters?: CareerFilters): Promise<unknown | null>
  getEvent(sid: string): Promise<unknown | null>
  getAssertionEvidence(sid: string): Promise<unknown | null>
  getSource(sid: string): Promise<unknown | null>
  search(query: string): Promise<unknown>
}

export class PostgresSongScopeRepository implements SongScopeRepository {
  constructor(private readonly pool: Pool) {}

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
        JOIN event_participation ep ON ep.event_sid = e.sid AND ep.entity_sid = $1
        WHERE e.event_type IN ('movement','political','disaster','disaster-response')
          AND e.parent_event_sid IS NULL
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
}
