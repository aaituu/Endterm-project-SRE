-- ============================================================
-- Migration: Educational Process Module
-- Run: psql -U postgres -d school_db -f migration_educational.sql
-- ============================================================

-- ─── Classes: add language + is_active ──────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'kk';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN classes.language IS 'kk | ru | en';

-- ─── Subjects: add weekly_hours + category ──────────────────
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS weekly_hours INTEGER DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'standard';
COMMENT ON COLUMN subjects.category IS 'standard | extracurricular';

-- ─── Classrooms: add is_active ──────────────────────────────
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ─── Subject–Teacher junction table ─────────────────────────
CREATE TABLE IF NOT EXISTS subject_teachers (
  id         SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  UNIQUE(subject_id, teacher_id)
);
CREATE INDEX IF NOT EXISTS idx_st_subject ON subject_teachers(subject_id);
CREATE INDEX IF NOT EXISTS idx_st_teacher ON subject_teachers(teacher_id);

-- ─── Plans table (teacher workflow tasks) ───────────────────
CREATE TABLE IF NOT EXISTS plans (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  assigned_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  deadline          DATE,
  workflow_status   VARCHAR(30) DEFAULT 'not_started',  -- not_started | in_progress | completed
  created_by_admin  BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_teacher ON plans(assigned_teacher_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(workflow_status);

-- ─── Seed: sample classrooms (if none exist) ────────────────
INSERT INTO classrooms (name, capacity, is_active) VALUES
  ('Физика зертханасы', 28, TRUE),
  ('Химия зертханасы', 24, TRUE),
  ('Информатика кабинеті', 30, TRUE),
  ('204-кабинет', 32, TRUE),
  ('Спорт залы', 60, TRUE),
  ('Музыка кабинеті', 25, TRUE)
ON CONFLICT DO NOTHING;

-- ─── Seed: sample classes with language ────────────────────
UPDATE classes SET language = 'kk', is_active = TRUE WHERE language IS NULL;

