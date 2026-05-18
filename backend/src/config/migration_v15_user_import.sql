-- User import module: templates, batch history, profile metadata and parent links.

CREATE TABLE IF NOT EXISTS user_import_batches (
  id                SERIAL PRIMARY KEY,
  school_id          INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category           VARCHAR(50) NOT NULL,
  status             VARCHAR(40) NOT NULL DEFAULT 'uploaded',
  original_filename  VARCHAR(255),
  uploaded_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  options            JSONB DEFAULT '{}'::jsonb,
  total_rows         INTEGER DEFAULT 0,
  valid_rows         INTEGER DEFAULT 0,
  invalid_rows       INTEGER DEFAULT 0,
  created_count      INTEGER DEFAULT 0,
  updated_count      INTEGER DEFAULT 0,
  skipped_count      INTEGER DEFAULT 0,
  error_count        INTEGER DEFAULT 0,
  parsed_rows        JSONB DEFAULT '[]'::jsonb,
  validation_errors  JSONB DEFAULT '[]'::jsonb,
  import_result      JSONB DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  validated_at       TIMESTAMPTZ,
  confirmed_at       TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_import_batches_school ON user_import_batches(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_import_batches_status ON user_import_batches(status);

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS import_batch_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_school_email ON users(school_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_school_phone ON users(school_id, phone);

ALTER TABLE students ADD COLUMN IF NOT EXISTS first_name VARCHAR(120);
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_name VARCHAR(120);
ALTER TABLE students ADD COLUMN IF NOT EXISTS middle_name VARCHAR(120);
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(30);
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_iin VARCHAR(12);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS stream VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS import_batch_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_students_school_parent_iin ON students(school_id, parent_iin);

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS iin VARCHAR(12);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS position VARCHAR(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS employment_status VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS import_batch_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_teachers_school_iin ON teachers(school_id, iin);

ALTER TABLE administration ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE administration ADD COLUMN IF NOT EXISTS iin VARCHAR(12);
ALTER TABLE administration ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE administration ADD COLUMN IF NOT EXISTS import_batch_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_administration_school_iin ON administration(school_id, iin);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS import_batch_id INTEGER;

CREATE TABLE IF NOT EXISTS parent_student_links (
  id             SERIAL PRIMARY KEY,
  school_id      INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relation_type  VARCHAR(50) DEFAULT 'guardian',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, parent_user_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON parent_student_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON parent_student_links(student_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_import_batch_id_fkey') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES user_import_batches(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_import_batch_id_fkey') THEN
    ALTER TABLE students
      ADD CONSTRAINT students_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES user_import_batches(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_import_batch_id_fkey') THEN
    ALTER TABLE teachers
      ADD CONSTRAINT teachers_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES user_import_batches(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'administration_user_id_fkey') THEN
    ALTER TABLE administration
      ADD CONSTRAINT administration_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'administration_import_batch_id_fkey') THEN
    ALTER TABLE administration
      ADD CONSTRAINT administration_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES user_import_batches(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_import_batch_id_fkey') THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES user_import_batches(id) ON DELETE SET NULL;
  END IF;
END $$;
