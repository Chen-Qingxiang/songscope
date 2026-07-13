BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS dataset_version (
  version text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS entity_registry (
  sid text PRIMARY KEY,
  entity_type text NOT NULL,
  label text NOT NULL,
  lifecycle_status text NOT NULL DEFAULT 'active',
  CHECK (sid ~ '^(person|place|office|event|service|source|locator|assertion|time|concept|curation):')
);

CREATE TABLE IF NOT EXISTS person (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  primary_name text NOT NULL,
  traditional_name text NOT NULL,
  birth_year integer,
  death_year integer,
  summary text NOT NULL
);

CREATE TABLE IF NOT EXISTS temporal_extent (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  original_text text NOT NULL,
  normalized_start date,
  normalized_end date,
  precision text NOT NULL CHECK (precision IN ('day','month','year','range','unknown')),
  certainty text NOT NULL CHECK (certainty IN ('exact','approximate','inferred','disputed')),
  calendar text NOT NULL,
  conversion_note text NOT NULL,
  CHECK (normalized_start IS NULL OR normalized_end IS NULL OR normalized_start <= normalized_end)
);

CREATE TABLE IF NOT EXISTS place (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  preferred_name text NOT NULL,
  historical_name text NOT NULL,
  place_type text NOT NULL,
  geometry_status text NOT NULL CHECK (geometry_status IN ('historical-boundary','seat-point','modern-proxy','unresolved')),
  geom geometry(Point, 4326),
  note text NOT NULL
);

CREATE TABLE IF NOT EXISTS office_concept (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('rank-office','duty-assignment','honorific','title','status')),
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS source_work (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  title text NOT NULL,
  creator text NOT NULL,
  work_type text NOT NULL
);

CREATE TABLE IF NOT EXISTS source_item (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  work_sid text NOT NULL REFERENCES source_work(sid),
  label text NOT NULL,
  url text,
  citation text NOT NULL
);

CREATE TABLE IF NOT EXISTS source_locator (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  source_item_sid text NOT NULL REFERENCES source_item(sid),
  locator_type text NOT NULL,
  locator_value text NOT NULL,
  quote_text text
);

CREATE TABLE IF NOT EXISTS event (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  event_type text NOT NULL,
  label text NOT NULL,
  temporal_extent_sid text NOT NULL REFERENCES temporal_extent(sid),
  place_sid text REFERENCES place(sid),
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS event_participation (
  event_sid text NOT NULL REFERENCES event(sid) ON DELETE CASCADE,
  entity_sid text NOT NULL REFERENCES entity_registry(sid),
  role text NOT NULL CHECK (role IN ('appointee','office-holder','origin','destination','subject','agent','witness')),
  PRIMARY KEY (event_sid, entity_sid, role)
);

CREATE TABLE IF NOT EXISTS appointment_action (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  person_sid text NOT NULL REFERENCES person(sid),
  event_sid text NOT NULL REFERENCES event(sid),
  action_type text NOT NULL,
  temporal_extent_sid text NOT NULL REFERENCES temporal_extent(sid),
  raw_expression text NOT NULL,
  note text NOT NULL
);

CREATE TABLE IF NOT EXISTS appointment_component (
  id bigserial PRIMARY KEY,
  appointment_action_sid text NOT NULL REFERENCES appointment_action(sid) ON DELETE CASCADE,
  office_concept_sid text NOT NULL REFERENCES office_concept(sid),
  place_sid text REFERENCES place(sid),
  component_type text NOT NULL,
  raw_expression text NOT NULL,
  UNIQUE (appointment_action_sid, office_concept_sid, component_type)
);

CREATE TABLE IF NOT EXISTS service_episode (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  person_sid text NOT NULL REFERENCES person(sid),
  duty_office_sid text NOT NULL REFERENCES office_concept(sid),
  place_sid text NOT NULL REFERENCES place(sid),
  temporal_extent_sid text NOT NULL REFERENCES temporal_extent(sid),
  derived_from_appointment_sid text REFERENCES appointment_action(sid),
  status text NOT NULL CHECK (status IN ('attested','inferred','disputed')),
  note text NOT NULL
);

CREATE TABLE IF NOT EXISTS assertion (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  subject_sid text NOT NULL REFERENCES entity_registry(sid),
  predicate text NOT NULL,
  object_sid text REFERENCES entity_registry(sid),
  object_value jsonb,
  temporal_extent_sid text REFERENCES temporal_extent(sid),
  status text NOT NULL CHECK (status IN ('proposed','accepted','rejected','superseded')),
  confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  rationale text NOT NULL,
  CHECK (object_sid IS NOT NULL OR object_value IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS evidence_link (
  assertion_sid text NOT NULL REFERENCES assertion(sid) ON DELETE CASCADE,
  locator_sid text NOT NULL REFERENCES source_locator(sid),
  stance text NOT NULL CHECK (stance IN ('supports','opposes','qualifies')),
  note text NOT NULL,
  PRIMARY KEY (assertion_sid, locator_sid, stance)
);

CREATE TABLE IF NOT EXISTS curation_activity (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  activity_type text NOT NULL,
  agent text NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL
);

CREATE OR REPLACE VIEW accepted_assertions_without_support AS
SELECT a.sid
FROM assertion a
LEFT JOIN evidence_link e ON e.assertion_sid = a.sid AND e.stance = 'supports'
WHERE a.status = 'accepted'
GROUP BY a.sid
HAVING count(e.locator_sid) = 0;

CREATE INDEX IF NOT EXISTS idx_event_temporal ON event(temporal_extent_sid);
CREATE INDEX IF NOT EXISTS idx_assertion_subject ON assertion(subject_sid);
CREATE INDEX IF NOT EXISTS idx_evidence_assertion ON evidence_link(assertion_sid);
CREATE INDEX IF NOT EXISTS idx_place_geom ON place USING gist(geom);
COMMIT;
