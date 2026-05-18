-- ============================================================
-- Migration V5: Teacher Extended Modules
-- ============================================================

-- ─── Student Reports (Дарынды / Үлгерімі төмен) ─────────────────
CREATE TABLE IF NOT EXISTS student_reports (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- "gifted" | "underperforming"
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  topic VARCHAR(500) NOT NULL,
  task_type VARCHAR(255) NOT NULL,
  score INTEGER, -- 2, 3, 4, 5
  feedback TEXT,
  photo_url VARCHAR(500),
  report_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Teacher Materials ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_materials (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  direction VARCHAR(255),
  class_category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ready', -- "pending" | "ready" | "failed"
  file_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Teacher QMG (ҚМЖ - Қысқа мерзімді жоспар) ──────────────────
CREATE TABLE IF NOT EXISTS teacher_qmg (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  class_category VARCHAR(100),
  duration_mins INTEGER DEFAULT 45,
  status VARCHAR(50) DEFAULT 'ready',
  file_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Lesson Visits (Сабаққа ену) ────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_visits (
  id SERIAL PRIMARY KEY,
  visiting_teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  visited_teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  lesson_type VARCHAR(100), -- Ашық сабақ, Қарапайым сабақ, т.б.
  students_total INTEGER DEFAULT 0,
  students_present INTEGER DEFAULT 0,
  topic VARCHAR(500),
  qmg_standard VARCHAR(255),
  organization TEXT,
  homework_check TEXT,
  teacher_communication TEXT,
  new_topic_explanation TEXT,
  topic_reveal TEXT,
  methods_used TEXT,
  task_level TEXT,
  feedback_given TEXT,
  overall_conclusion TEXT,
  photo_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Optional Points / Rating Tracker ───────────────────────────
-- (Rating can also simply be computed dynamically, which is frequently preferred)
-- But ensuring existing tables have robust points parsing logic inside JS.
