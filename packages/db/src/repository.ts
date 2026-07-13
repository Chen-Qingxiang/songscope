import type { Pool } from 'pg'

export interface SongScopeRepository {
  getPerson(sid: string): Promise<unknown | null>
  getCareer(sid: string): Promise<unknown>
  getEvent(sid: string): Promise<unknown | null>
  getAssertionEvidence(sid: string): Promise<unknown | null>
}

export class PostgresSongScopeRepository implements SongScopeRepository {
  constructor(private readonly pool: Pool) {}

  private async version(): Promise<string> {
    const result = await this.pool.query<{ version: string }>('SELECT version FROM dataset_version ORDER BY created_at DESC LIMIT 1')
    return result.rows[0]?.version ?? 'unknown'
  }

  async getPerson(sid: string) {
    const result = await this.pool.query('SELECT sid, primary_name AS name, traditional_name AS "traditionalName", birth_year AS "birthYear", death_year AS "deathYear", summary FROM person WHERE sid = $1', [sid])
    return result.rows[0] ? { datasetVersion: await this.version(), ...result.rows[0] } : null
  }

  async getCareer(sid: string) {
    const version = await this.version()
    const person = await this.pool.query<{ sid: string; name: string }>('SELECT sid, primary_name AS name FROM person WHERE sid = $1', [sid])
    if (!person.rows[0]) return null
    const result = await this.pool.query(`
      SELECT aa.sid AS id, 'appointment' AS "itemType",
        EXTRACT(YEAR FROM te.normalized_start)::int AS year,
        te.original_text AS "yearLabel", te.precision, te.certainty AS uncertainty,
        e.label AS title, e.description AS summary,
        p.sid AS "placeSid", p.preferred_name AS "placeName", p.geometry_status AS "resolutionStatus",
        a.sid AS "assertionSid", a.status = 'accepted' AS accepted,
        count(el.locator_sid)::int AS "evidenceCount",
        array_agg(DISTINCT sw.title) FILTER (WHERE sw.title IS NOT NULL) AS "sourceTitles",
        array_agg(DISTINCT sl.locator_value) FILTER (WHERE sl.locator_value IS NOT NULL) AS "locatorLabels"
      FROM appointment_action aa
      JOIN event e ON e.sid = aa.event_sid
      JOIN temporal_extent te ON te.sid = aa.temporal_extent_sid
      LEFT JOIN place p ON p.sid = e.place_sid
      JOIN assertion a ON a.subject_sid = aa.sid AND a.status = 'accepted'
      LEFT JOIN evidence_link el ON el.assertion_sid = a.sid AND el.stance = 'supports'
      LEFT JOIN source_locator sl ON sl.sid = el.locator_sid
      LEFT JOIN source_item si ON si.sid = sl.source_item_sid
      LEFT JOIN source_work sw ON sw.sid = si.work_sid
      WHERE aa.person_sid = $1
      GROUP BY aa.sid, te.normalized_start, te.original_text, te.precision, te.certainty,
        e.label, e.description, p.sid, p.preferred_name, p.geometry_status, a.sid, a.status
      UNION ALL
      SELECT se.sid AS id, 'service' AS "itemType",
        EXTRACT(YEAR FROM te.normalized_start)::int AS year,
        te.original_text AS "yearLabel", te.precision, te.certainty AS uncertainty,
        '实际任职：' || oc.label AS title, se.note AS summary,
        p.sid AS "placeSid", p.preferred_name AS "placeName", p.geometry_status AS "resolutionStatus",
        a.sid AS "assertionSid", a.status = 'accepted' AS accepted,
        count(el.locator_sid)::int AS "evidenceCount",
        array_agg(DISTINCT sw.title) FILTER (WHERE sw.title IS NOT NULL) AS "sourceTitles",
        array_agg(DISTINCT sl.locator_value) FILTER (WHERE sl.locator_value IS NOT NULL) AS "locatorLabels"
      FROM service_episode se
      JOIN temporal_extent te ON te.sid = se.temporal_extent_sid
      JOIN office_concept oc ON oc.sid = se.duty_office_sid
      JOIN place p ON p.sid = se.place_sid
      JOIN assertion a ON a.subject_sid = se.sid AND a.status = 'accepted'
      LEFT JOIN evidence_link el ON el.assertion_sid = a.sid AND el.stance = 'supports'
      LEFT JOIN source_locator sl ON sl.sid = el.locator_sid
      LEFT JOIN source_item si ON si.sid = sl.source_item_sid
      LEFT JOIN source_work sw ON sw.sid = si.work_sid
      WHERE se.person_sid = $1
      GROUP BY se.sid, te.normalized_start, te.original_text, te.precision, te.certainty,
        oc.label, se.note, p.sid, p.preferred_name, p.geometry_status, a.sid, a.status
      ORDER BY year, "itemType"
    `, [sid])
    return {
      datasetVersion: version,
      person: person.rows[0],
      items: result.rows.map((row) => ({
        id: row.id, itemType: row.itemType, year: row.year, yearLabel: row.yearLabel,
        precision: row.precision, uncertainty: row.uncertainty, title: row.title, summary: row.summary,
        place: row.placeSid ? { sid: row.placeSid, name: row.placeName, resolutionStatus: row.resolutionStatus } : null,
        evidenceSummary: {
          assertionSid: row.assertionSid, accepted: row.accepted, evidenceCount: row.evidenceCount,
          sourceTitles: row.sourceTitles ?? [], locatorLabels: row.locatorLabels ?? []
        }
      }))
    }
  }

  async getEvent(sid: string) {
    const result = await this.pool.query(`SELECT e.sid, e.event_type AS "eventType", e.label, e.description,
      te.original_text AS "dateOriginal", te.normalized_start AS "normalizedStart", te.normalized_end AS "normalizedEnd",
      p.sid AS "placeSid", p.preferred_name AS "placeName"
      FROM event e JOIN temporal_extent te ON te.sid=e.temporal_extent_sid
      LEFT JOIN place p ON p.sid=e.place_sid WHERE e.sid=$1`, [sid])
    return result.rows[0] ? { datasetVersion: await this.version(), ...result.rows[0] } : null
  }

  async getAssertionEvidence(sid: string) {
    const result = await this.pool.query(`SELECT a.sid, a.subject_sid AS "subjectSid", a.predicate, a.status,
      a.confidence::float, a.rationale, el.stance, el.note,
      sl.sid AS "locatorSid", sl.locator_type AS "locatorType", sl.locator_value AS "locatorValue", sl.quote_text AS quote,
      si.label AS "sourceItem", si.url, si.citation, sw.title AS "sourceTitle"
      FROM assertion a LEFT JOIN evidence_link el ON el.assertion_sid=a.sid
      LEFT JOIN source_locator sl ON sl.sid=el.locator_sid
      LEFT JOIN source_item si ON si.sid=sl.source_item_sid
      LEFT JOIN source_work sw ON sw.sid=si.work_sid WHERE a.sid=$1`, [sid])
    if (!result.rows[0]) return null
    const first = result.rows[0]
    return {
      datasetVersion: await this.version(), assertion: {
        sid: first.sid, subjectSid: first.subjectSid, predicate: first.predicate,
        status: first.status, confidence: first.confidence, rationale: first.rationale
      },
      evidence: result.rows.filter((row) => row.locatorSid).map((row) => ({
        stance: row.stance, note: row.note, locator: {
          sid: row.locatorSid, type: row.locatorType, value: row.locatorValue, quote: row.quote
        },
        source: { title: row.sourceTitle, item: row.sourceItem, citation: row.citation, url: row.url }
      }))
    }
  }
}
