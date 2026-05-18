-- Per-school database catalog fields for the central SaaS database.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_name VARCHAR(120);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_status VARCHAR(40) DEFAULT 'pending';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_created_at TIMESTAMPTZ;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_database_name
  ON schools(database_name)
  WHERE database_name IS NOT NULL;
