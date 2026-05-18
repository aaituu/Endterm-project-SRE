-- ============================================================
-- Migration V4: Teacher Dashboard Features
-- ============================================================

-- ─── Students Updates ──────────────────────────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS profession VARCHAR(255);

-- ─── Olympiads / Achievements ──────────────────────────────────
CREATE TABLE IF NOT EXISTS olympiad_preparations (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  competition_type VARCHAR(255) NOT NULL,
  competition_subtype VARCHAR(255),
  status VARCHAR(50) DEFAULT 'preparing',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS olympiad_achievements (
  id SERIAL PRIMARY KEY,
  preparation_id INTEGER NOT NULL REFERENCES olympiad_preparations(id) ON DELETE CASCADE,
  place VARCHAR(50),
  diploma_url VARCHAR(500),
  photo_url VARCHAR(500),
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Teacher Monthly Plans ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_monthly_plans (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  month VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_monthly_plan_tasks (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES teacher_monthly_plans(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  start_date DATE,
  deadline DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Attestations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attestations (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  issued_at DATE NOT NULL,
  expires_at DATE NOT NULL,
  document_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Library ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(500),
  total_copies INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_reservations (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  borrow_date DATE DEFAULT CURRENT_DATE,
  return_date DATE,
  actual_return_date DATE,
  status VARCHAR(50) DEFAULT 'issued', -- issued, returned
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Attendance ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL, -- present, absent, late, excused
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
