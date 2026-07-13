BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE entity_registry DROP CONSTRAINT IF EXISTS entity_registry_sid_check;
ALTER TABLE entity_registry ADD CONSTRAINT entity_registry_sid_check CHECK (
  sid ~ '^(person|place|office|event|service|source|locator|assertion|time|concept|curation|corpus):'
);

ALTER TABLE source_item
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS page_id bigint,
  ADD COLUMN IF NOT EXISTS revision_id bigint,
  ADD COLUMN IF NOT EXISTS revision_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS history_url text,
  ADD COLUMN IF NOT EXISTS attribution_url text,
  ADD COLUMN IF NOT EXISTS content_model text,
  ADD COLUMN IF NOT EXISTS license_spdx text,
  ADD COLUMN IF NOT EXISTS license_name text,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS attribution_required boolean,
  ADD COLUMN IF NOT EXISTS retrieved_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_text_checksum text,
  ADD COLUMN IF NOT EXISTS source_text_bytes bigint;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'source_item_revision_metadata_check') THEN
    ALTER TABLE source_item ADD CONSTRAINT source_item_revision_metadata_check CHECK (
      revision_id IS NULL OR (
        provider IS NOT NULL AND page_title IS NOT NULL AND page_id IS NOT NULL AND
        revision_timestamp IS NOT NULL AND canonical_url IS NOT NULL AND history_url IS NOT NULL AND
        attribution_url IS NOT NULL AND content_model IS NOT NULL AND license_spdx IS NOT NULL AND
        license_name IS NOT NULL AND license_url IS NOT NULL AND attribution_required IS NOT NULL AND
        retrieved_at IS NOT NULL AND source_text_checksum ~ '^[a-f0-9]{64}$' AND source_text_bytes > 0
      )
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS corpus_snapshot (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  corpus_version text NOT NULL UNIQUE,
  content_hash text NOT NULL UNIQUE CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  work_sid text NOT NULL REFERENCES source_work(sid),
  directory_revision_id bigint NOT NULL,
  expected_volumes integer NOT NULL CHECK (expected_volumes > 0),
  processing jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS corpus_snapshot_item (
  snapshot_sid text NOT NULL REFERENCES corpus_snapshot(sid) ON DELETE CASCADE,
  source_item_sid text NOT NULL UNIQUE REFERENCES source_item(sid),
  item_role text NOT NULL CHECK (item_role IN ('directory', 'volume')),
  juan integer,
  PRIMARY KEY (snapshot_sid, source_item_sid),
  UNIQUE (snapshot_sid, juan),
  CHECK ((item_role = 'directory' AND juan IS NULL) OR (item_role = 'volume' AND juan BETWEEN 1 AND 496))
);

CREATE TABLE IF NOT EXISTS source_unit (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  snapshot_sid text NOT NULL REFERENCES corpus_snapshot(sid) ON DELETE CASCADE,
  source_item_sid text NOT NULL REFERENCES source_item(sid),
  parent_unit_sid text,
  unit_type text NOT NULL CHECK (unit_type IN ('work_division', 'juan', 'chapter', 'section')),
  division text NOT NULL CHECK (division IN ('benji', 'zhi', 'biao', 'liezhuan', 'appendix')),
  juan integer,
  label_original text NOT NULL,
  label_normalized text NOT NULL,
  sequence_index integer NOT NULL CHECK (sequence_index >= 0),
  external_anchor text,
  UNIQUE (sid, snapshot_sid),
  UNIQUE (snapshot_sid, unit_type, division, sequence_index),
  FOREIGN KEY (parent_unit_sid, snapshot_sid) REFERENCES source_unit(sid, snapshot_sid),
  CHECK ((unit_type = 'juan' AND juan BETWEEN 1 AND 496) OR (unit_type <> 'juan' AND juan IS NULL))
);

CREATE TABLE IF NOT EXISTS source_passage (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE RESTRICT,
  snapshot_sid text NOT NULL REFERENCES corpus_snapshot(sid) ON DELETE CASCADE,
  source_unit_sid text NOT NULL,
  sequence_index integer NOT NULL CHECK (sequence_index > 0),
  source_text text NOT NULL,
  normalized_text text,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  segmentation_method text NOT NULL,
  segmentation_version text NOT NULL,
  review_status text NOT NULL CHECK (review_status IN ('raw', 'reviewed')),
  search_text text GENERATED ALWAYS AS (coalesce(normalized_text, '') || E'\n' || source_text) STORED,
  UNIQUE (sid, snapshot_sid),
  UNIQUE (source_unit_sid, sequence_index),
  FOREIGN KEY (source_unit_sid, snapshot_sid) REFERENCES source_unit(sid, snapshot_sid)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'source_unit_snapshot_item_fk') THEN
    ALTER TABLE source_unit ADD CONSTRAINT source_unit_snapshot_item_fk
      FOREIGN KEY (snapshot_sid, source_item_sid)
      REFERENCES corpus_snapshot_item(snapshot_sid, source_item_sid);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS source_locator_passage (
  locator_sid text NOT NULL REFERENCES source_locator(sid) ON DELETE CASCADE,
  passage_sid text NOT NULL REFERENCES source_passage(sid) ON DELETE RESTRICT,
  sequence_index integer NOT NULL CHECK (sequence_index > 0),
  start_offset integer,
  end_offset integer,
  PRIMARY KEY (locator_sid, passage_sid),
  UNIQUE (locator_sid, sequence_index),
  CHECK (
    (start_offset IS NULL AND end_offset IS NULL) OR
    (start_offset >= 0 AND end_offset > start_offset)
  )
);

CREATE TABLE IF NOT EXISTS text_annotation (
  sid text PRIMARY KEY REFERENCES entity_registry(sid) ON DELETE CASCADE,
  snapshot_sid text NOT NULL REFERENCES corpus_snapshot(sid) ON DELETE CASCADE,
  passage_sid text NOT NULL,
  start_offset integer NOT NULL CHECK (start_offset >= 0),
  end_offset integer NOT NULL CHECK (end_offset > start_offset),
  offset_unit text NOT NULL CHECK (offset_unit = 'unicode-code-point'),
  surface_text text NOT NULL,
  annotation_type text NOT NULL CHECK (annotation_type IN (
    'chronology', 'person', 'place', 'institution', 'office', 'appointment-action', 'event-term'
  )),
  target_entity_sid text REFERENCES entity_registry(sid),
  normalized_value text,
  status text NOT NULL CHECK (status IN ('candidate', 'reviewed', 'rejected')),
  method text NOT NULL,
  curation_activity_sid text NOT NULL REFERENCES curation_activity(sid),
  FOREIGN KEY (passage_sid, snapshot_sid) REFERENCES source_passage(sid, snapshot_sid),
  UNIQUE (passage_sid, start_offset, end_offset, annotation_type, method)
);

CREATE TABLE IF NOT EXISTS corpus_coverage (
  snapshot_sid text PRIMARY KEY REFERENCES corpus_snapshot(sid) ON DELETE CASCADE,
  expected integer NOT NULL,
  discovered integer NOT NULL,
  acquired integer NOT NULL,
  validated integer NOT NULL,
  segmented integer NOT NULL,
  searchable integer NOT NULL,
  reviewed integer NOT NULL,
  candidate_annotations integer NOT NULL,
  anomalies jsonb NOT NULL,
  CHECK (
    expected >= 0 AND discovered >= 0 AND acquired >= 0 AND validated >= 0 AND
    segmented >= 0 AND searchable >= 0 AND reviewed >= 0 AND candidate_annotations >= 0
  )
);

CREATE OR REPLACE FUNCTION check_annotation_surface()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  passage_text text;
BEGIN
  SELECT source_text INTO passage_text FROM source_passage WHERE sid = NEW.passage_sid;
  IF passage_text IS NULL OR substring(passage_text FROM NEW.start_offset + 1 FOR NEW.end_offset - NEW.start_offset) <> NEW.surface_text THEN
    RAISE EXCEPTION 'annotation surface text does not match passage %', NEW.passage_sid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS text_annotation_surface_check ON text_annotation;
CREATE TRIGGER text_annotation_surface_check
BEFORE INSERT OR UPDATE ON text_annotation
FOR EACH ROW EXECUTE FUNCTION check_annotation_surface();

CREATE INDEX IF NOT EXISTS idx_corpus_snapshot_item_snapshot ON corpus_snapshot_item(snapshot_sid);
CREATE INDEX IF NOT EXISTS idx_source_unit_parent ON source_unit(parent_unit_sid);
CREATE INDEX IF NOT EXISTS idx_source_unit_juan ON source_unit(snapshot_sid, juan);
CREATE INDEX IF NOT EXISTS idx_source_passage_unit ON source_passage(source_unit_sid, sequence_index);
CREATE INDEX IF NOT EXISTS idx_source_passage_search ON source_passage USING gin(search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locator_passage_passage ON source_locator_passage(passage_sid);
CREATE INDEX IF NOT EXISTS idx_annotation_passage ON text_annotation(passage_sid, start_offset);
CREATE INDEX IF NOT EXISTS idx_annotation_target ON text_annotation(target_entity_sid) WHERE target_entity_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_annotation_status_type ON text_annotation(snapshot_sid, status, annotation_type);

COMMIT;
