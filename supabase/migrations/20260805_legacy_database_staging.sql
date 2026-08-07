CREATE TABLE IF NOT EXISTS legacy_database_records (
  collection_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  source_file TEXT NOT NULL DEFAULT 'database.json',
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_name, record_id)
);

ALTER TABLE legacy_database_records ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE legacy_database_records IS
  'Lossless staging copy of the legacy JSON database. Service-role access only.';

