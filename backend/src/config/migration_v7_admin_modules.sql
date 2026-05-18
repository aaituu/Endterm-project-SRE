-- Admin modules: teacher-assigned tasks, library reservations, attestation types

-- ─── Tasks (мұғалімге тапсырмалар) ───────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30) DEFAULT 'not_started';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE tasks SET is_archived = FALSE WHERE is_archived IS NULL;
UPDATE tasks SET is_archived = TRUE WHERE status = 'archived';
UPDATE tasks SET workflow_status = 'not_started' WHERE workflow_status IS NULL;

COMMENT ON COLUMN tasks.workflow_status IS 'not_started | in_progress | completed';
COMMENT ON COLUMN tasks.priority IS 'low | medium | high';

-- ─── Books ───────────────────────────────────────────────────────────────────
ALTER TABLE books ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE books ADD COLUMN IF NOT EXISTS available INTEGER;
ALTER TABLE books ADD COLUMN IF NOT EXISTS author VARCHAR(500);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'total_copies'
  ) THEN
    UPDATE books SET quantity = COALESCE(quantity, total_copies, 1) WHERE quantity IS NULL;
    UPDATE books SET available = COALESCE(available, total_copies, 1) WHERE available IS NULL;
  ELSE
    UPDATE books SET quantity = COALESCE(quantity, 1) WHERE quantity IS NULL;
    UPDATE books SET available = COALESCE(available, quantity, 1) WHERE available IS NULL;
  END IF;
END $$;

-- ─── Броньдар ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_reservations (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  borrow_date DATE DEFAULT CURRENT_DATE,
  return_date DATE,
  actual_return_date DATE,
  status VARCHAR(50) DEFAULT 'issued',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Аттестация түрлері ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attestation_types (
  id SERIAL PRIMARY KEY,
  name_kz VARCHAR(255) NOT NULL UNIQUE
);

INSERT INTO attestation_types (name_kz) VALUES
  ('Педагог'),
  ('Педагог-модератор'),
  ('Педагог-сарапшы'),
  ('Педагог-зерттеуші'),
  ('Педагог-шебер'),
  ('Бірінші санаттағы басшы орынбасары'),
  ('Екінші санаттағы басшы орынбасары'),
  ('Үшінші санаттағы басшы орынбасары')
ON CONFLICT (name_kz) DO NOTHING;

ALTER TABLE attestations ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES attestation_types(id) ON DELETE SET NULL;
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS document_url VARCHAR(500);
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(500);

UPDATE attestations a
SET type_id = t.id
FROM attestation_types t
WHERE a.type_id IS NULL AND a.category IS NOT NULL AND TRIM(a.category) = t.name_kz;
