import { createHash } from 'node:crypto'
import { createPool } from '../src/client.js'
import { loadCuratedDataset } from './load-curated.js'

const dataset = await loadCuratedDataset()
const contentHash = createHash('sha256').update(JSON.stringify(dataset)).digest('hex')
const pool = createPool()
const client = await pool.connect()

async function register(sid: string, entityType: string, label: string) {
  await client.query(
    'INSERT INTO entity_registry(sid, entity_type, label) VALUES ($1,$2,$3)',
    [sid, entityType, label]
  )
}

try {
  await client.query('BEGIN')
  await client.query(`TRUNCATE event_relation, curation_activity, evidence_link, assertion,
    service_episode, appointment_component, appointment_action, event_participation, event,
    source_locator, source_item, source_work, office_concept, place, temporal_extent, person,
    entity_registry, dataset_version RESTART IDENTITY CASCADE`)

  await client.query(
    'INSERT INTO dataset_version(version, schema_version, content_hash, description) VALUES ($1,$2,$3,$4)',
    [dataset.metadata.datasetVersion, dataset.metadata.schemaVersion, contentHash, dataset.metadata.description]
  )

  for (const item of dataset.people) await register(item.sid, 'person', item.primaryName)
  for (const item of dataset.places) await register(item.sid, 'place', item.preferredName)
  for (const item of dataset.offices) await register(item.sid, 'office', item.label)
  for (const item of dataset.temporalExtents) await register(item.sid, 'temporal_extent', item.originalText)
  for (const item of dataset.sourceWorks) await register(item.sid, 'source_work', item.title)
  for (const item of dataset.sourceItems) await register(item.sid, 'source_item', item.label)
  for (const item of dataset.passages) await register(item.sid, 'source_locator', item.locatorValue)
  for (const item of dataset.events) await register(item.sid, 'event', item.label)
  for (const item of dataset.serviceEpisodes) await register(item.sid, 'service', item.note)
  for (const item of dataset.assertions) await register(item.sid, 'assertion', item.rationale)

  for (const item of dataset.people) {
    await client.query('INSERT INTO person VALUES ($1,$2,$3,$4,$5,$6)', [
      item.sid, item.primaryName, item.traditionalName, item.birthYear, item.deathYear, item.summary
    ])
  }
  for (const item of dataset.temporalExtents) {
    await client.query(`INSERT INTO temporal_extent(
      sid, original_text, normalized_start, normalized_end, precision, certainty, calendar,
      conversion_note, conversion_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
      item.sid, item.originalText, item.normalizedStart, item.normalizedEnd, item.precision,
      item.certainty, item.calendar, item.conversionNote, item.conversionMethod
    ])
  }
  for (const item of dataset.places) {
    await client.query(`INSERT INTO place(
      sid, preferred_name, historical_name, place_type, geometry_status, geom, note)
      VALUES ($1,$2,$3,$4,$5,
        CASE WHEN $6::double precision IS NULL OR $7::double precision IS NULL THEN NULL
          ELSE ST_SetSRID(ST_MakePoint($6,$7),4326) END,$8)`, [
      item.sid, item.preferredName, item.historicalName, item.placeType, item.geometryStatus,
      item.longitude, item.latitude, item.note
    ])
  }
  for (const item of dataset.offices) {
    await client.query('INSERT INTO office_concept VALUES ($1,$2,$3,$4)', [item.sid, item.label, item.category, item.description])
  }
  for (const item of dataset.sourceWorks) {
    await client.query('INSERT INTO source_work VALUES ($1,$2,$3,$4)', [item.sid, item.title, item.creator, item.workType])
  }
  for (const item of dataset.sourceItems) {
    await client.query('INSERT INTO source_item(sid,work_sid,label,url,citation) VALUES ($1,$2,$3,$4,$5)', [item.sid, item.workSid, item.label, item.url, item.citation])
  }
  for (const item of dataset.passages) {
    await client.query('INSERT INTO source_locator VALUES ($1,$2,$3,$4,$5)', [
      item.sid, item.sourceItemSid, item.locatorType, item.locatorValue, item.quoteText
    ])
  }
  for (const item of dataset.events) {
    await client.query(`INSERT INTO event(
      sid, event_type, label, temporal_extent_sid, place_sid, description, parent_event_sid, status, sequence_index)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
      item.sid, item.eventType, item.label, item.temporalExtentSid, item.placeSid,
      item.description, item.parentEventSid, item.status, item.sequence
    ])
  }
  for (const item of dataset.eventParticipations) {
    await client.query('INSERT INTO event_participation VALUES ($1,$2,$3)', [item.eventSid, item.entitySid, item.role])
  }
  for (const item of dataset.eventRelations) {
    await client.query('INSERT INTO event_relation VALUES ($1,$2,$3,$4)', [
      item.subjectEventSid, item.relationType, item.objectEventSid, item.note
    ])
  }
  for (const item of dataset.appointments) {
    await client.query('INSERT INTO appointment_action VALUES ($1,$2,$3,$4,$5,$6,$7)', [
      item.sid, item.personSid, item.eventSid, item.actionType, item.temporalExtentSid,
      item.rawExpression, item.note
    ])
  }
  for (const item of dataset.appointmentComponents) {
    await client.query(`INSERT INTO appointment_component(
      appointment_action_sid, office_concept_sid, place_sid, component_type, raw_expression)
      VALUES ($1,$2,$3,$4,$5)`, [
      item.appointmentActionSid, item.officeConceptSid, item.placeSid, item.componentType, item.rawExpression
    ])
  }
  for (const item of dataset.serviceEpisodes) {
    await client.query(`INSERT INTO service_episode(
      sid, person_sid, duty_office_sid, place_sid, temporal_extent_sid,
      derived_from_appointment_sid, status, note, episode_type, created_by_event_sid)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
      item.sid, item.personSid, item.dutyOfficeSid, item.placeSid, item.temporalExtentSid,
      item.derivedFromAppointmentSid, item.status, item.note, item.episodeType, item.createdByEventSid
    ])
  }
  for (const item of dataset.assertions) {
    await client.query(`INSERT INTO assertion(
      sid, subject_sid, predicate, object_sid, object_value, temporal_extent_sid, status, confidence, rationale)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)`, [
      item.sid, item.subjectSid, item.predicate, item.objectSid,
      item.objectValue === null ? null : JSON.stringify(item.objectValue), item.temporalExtentSid,
      item.status, item.confidence, item.rationale
    ])
  }
  for (const item of dataset.evidenceLinks) {
    await client.query('INSERT INTO evidence_link VALUES ($1,$2,$3,$4)', [
      item.assertionSid, item.locatorSid, item.stance, item.note
    ])
  }

  await client.query('SET CONSTRAINTS ALL IMMEDIATE')
  await client.query('COMMIT')
  console.log(`Imported ${dataset.metadata.datasetVersion} (${contentHash.slice(0, 12)}): ${dataset.events.length} events, ${dataset.assertions.length} assertions.`)
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
