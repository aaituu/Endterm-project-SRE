-- ============================================================
-- Migration V14: Teacher Courses and Certificates
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_courses (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  topic VARCHAR(500),
  provider VARCHAR(500),
  description TEXT,
  started_at DATE,
  finished_at DATE NOT NULL,
  next_training_at DATE NOT NULL,
  reminder_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_course_files (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES teacher_courses(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  file_type VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_courses_teacher ON teacher_courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_courses_school ON teacher_courses(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_courses_next ON teacher_courses(next_training_at);
