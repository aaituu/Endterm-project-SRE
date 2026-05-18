-- Кешіккен оқушылар: сабақ контексті
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lesson_context JSONB;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Дарынды/үлгерімі төмен: толық профиль
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS assigned_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS assigned_at DATE;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS ends_at DATE;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Жетістіктер (байқаулар) — әкімші тізімі
CREATE TABLE IF NOT EXISTS student_achievements (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curator_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  competition_name VARCHAR(500) NOT NULL,
  achievement_type VARCHAR(150),
  level VARCHAR(150),
  place_rank VARCHAR(100),
  achievement_date DATE,
  certificate_url VARCHAR(500),
  publish_to_news VARCHAR(50) DEFAULT 'none',
  verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON student_achievements(student_id);
