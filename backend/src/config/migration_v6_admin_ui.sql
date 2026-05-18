-- Admin UI parity: roles display names, classes metadata, subject–class links, schedule year
-- psql -U postgres -d school_db -f src/config/migration_v6_admin_ui.sql

ALTER TABLE roles ADD COLUMN IF NOT EXISTS label_kz VARCHAR(255);
UPDATE roles SET label_kz = COALESCE(label_kz,
  CASE name
    WHEN 'admin' THEN 'Администратор'
    WHEN 'teacher' THEN 'Мұғалім'
    WHEN 'student' THEN 'Оқушы'
    ELSE INITCAP(REPLACE(name, '_', ' '))
  END
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(20);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_shift VARCHAR(20) DEFAULT 'daytime';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS grade_label VARCHAR(80);
COMMENT ON COLUMN classes.schedule_shift IS 'daytime | evening';

ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_open_lesson BOOLEAN DEFAULT FALSE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_homeroom_lesson BOOLEAN DEFAULT FALSE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_block_lesson BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS subject_classes (
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (subject_id, class_id)
);
CREATE INDEX IF NOT EXISTS idx_subject_classes_class ON subject_classes(class_id);

ALTER TABLE schedule ADD COLUMN IF NOT EXISTS academic_year VARCHAR(9);
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS note TEXT;

-- Seed role labels (slug = Latin, label = Kazakh)
INSERT INTO roles (name, label_kz) VALUES
  ('parent', 'Ата-ана'),
  ('admin_staff', 'Әкімшілік құрам'),
  ('pe_instructor', 'Денешынықтыру нұсқаушы'),
  ('director', 'Директор'),
  ('deputy_profile', 'Директордың бейіндік жұмыстары жөніндегі орынбасары'),
  ('deputy_academic', 'Директордың оқу істері жөніндегі орынбасары'),
  ('deputy_education', 'Директордың тәрбие істері жөніндегі орынбасары'),
  ('labor_instructor', 'Еңбек нұсқаушысы'),
  ('librarian', 'Кітапханашы'),
  ('extra_education', 'Қосымша білім беру педагогы'),
  ('lab_assistant', 'Лаборант'),
  ('nurse', 'Мейіргер'),
  ('reader', 'Оқырман'),
  ('career_counselor', 'Педагог-профориентатор'),
  ('psychologist', 'Педагог-психолог'),
  ('organizer', 'Педагог-ұйымдастырушы'),
  ('assistant', 'Педагоги-ассистент'),
  ('tutor', 'Тәлімгер'),
  ('club_leader', 'Үйірме жетекшісі'),
  ('secretary', 'Хатшы')
ON CONFLICT (name) DO UPDATE SET label_kz = EXCLUDED.label_kz;

UPDATE roles SET label_kz = 'Администратор' WHERE name = 'admin' AND (label_kz IS NULL OR label_kz = '');
UPDATE roles SET label_kz = 'Мұғалім' WHERE name = 'teacher';
UPDATE roles SET label_kz = 'Оқушы' WHERE name = 'student';
