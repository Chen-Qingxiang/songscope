BEGIN;

ALTER TABLE dataset_version
  ADD COLUMN IF NOT EXISTS schema_version text NOT NULL DEFAULT '0.1.0',
  ADD COLUMN IF NOT EXISTS content_hash text NOT NULL DEFAULT 'legacy';

ALTER TABLE temporal_extent
  ADD COLUMN IF NOT EXISTS conversion_method text NOT NULL DEFAULT 'unspecified';

ALTER TABLE event
  ADD COLUMN IF NOT EXISTS parent_event_sid text REFERENCES event(sid),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS sequence_index integer NOT NULL DEFAULT 0;

ALTER TABLE service_episode
  ADD COLUMN IF NOT EXISTS episode_type text NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS created_by_event_sid text REFERENCES event(sid);

ALTER TABLE service_episode ALTER COLUMN duty_office_sid DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_episode_type_check'
  ) THEN
    ALTER TABLE service_episode ADD CONSTRAINT service_episode_type_check
      CHECK (episode_type IN ('service', 'residence', 'punitive-status'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS event_relation (
  subject_event_sid text NOT NULL REFERENCES event(sid) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('part-of','responded-to','followed','resulted-in')),
  object_event_sid text NOT NULL REFERENCES event(sid) ON DELETE CASCADE,
  note text NOT NULL,
  PRIMARY KEY (subject_event_sid, relation_type, object_event_sid),
  CHECK (subject_event_sid <> object_event_sid)
);

ALTER TABLE event_participation DROP CONSTRAINT IF EXISTS event_participation_role_check;
ALTER TABLE event_participation ADD CONSTRAINT event_participation_role_check CHECK (
  role IN ('appointee','office-holder','origin','destination','subject','agent','witness',
    'organizer','accuser','appointing-authority','affected-place')
);

CREATE INDEX IF NOT EXISTS idx_event_parent ON event(parent_event_sid);
CREATE INDEX IF NOT EXISTS idx_event_type ON event(event_type);
CREATE INDEX IF NOT EXISTS idx_event_place ON event(place_sid);
CREATE INDEX IF NOT EXISTS idx_service_person ON service_episode(person_sid);
CREATE INDEX IF NOT EXISTS idx_evidence_locator ON evidence_link(locator_sid);

CREATE OR REPLACE FUNCTION check_accepted_assertion_support()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM accepted_assertions_without_support) THEN
    RAISE EXCEPTION 'accepted assertion requires supporting evidence';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS accepted_assertion_support_on_assertion ON assertion;
CREATE CONSTRAINT TRIGGER accepted_assertion_support_on_assertion
AFTER INSERT OR UPDATE OR DELETE ON assertion
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_accepted_assertion_support();

DROP TRIGGER IF EXISTS accepted_assertion_support_on_evidence ON evidence_link;
CREATE CONSTRAINT TRIGGER accepted_assertion_support_on_evidence
AFTER INSERT OR UPDATE OR DELETE ON evidence_link
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_accepted_assertion_support();

COMMIT;
