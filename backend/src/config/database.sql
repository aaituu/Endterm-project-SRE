-- ============================================================
-- Ө. Жәнібеков атындағы мектеп – Full Database Schema
-- Run: psql -U postgres -f src/config/database.sql
-- ============================================================

-- Create database if it doesn't exist (run manually first):
-- CREATE DATABASE school_db;

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Schools / Tenants ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  code       VARCHAR(50) UNIQUE NOT NULL,
  domain     VARCHAR(255),
  subdomain  VARCHAR(100) UNIQUE,
  timezone   VARCHAR(50) DEFAULT 'Asia/Almaty',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_subdomain ON schools(subdomain);

-- ─── Roles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(50) UNIQUE NOT NULL,
  label_kz VARCHAR(255)
);

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  iin           VARCHAR(12) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  school_id     INTEGER DEFAULT 1,
  teacher_id    INTEGER,  -- linked teacher profile (nullable)
  photo_url     VARCHAR(500),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_iin ON users(iin);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- ─── Slides (Header Carousel) ────────────────────────────────
CREATE TABLE IF NOT EXISTS slides (
  id         SERIAL PRIMARY KEY,
  title_kz   VARCHAR(500),
  quote      TEXT,
  image_url  VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── News ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  image_url   VARCHAR(500),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  event_type  VARCHAR(100),
  recommended BOOLEAN DEFAULT FALSE,
  status      VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  views       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC);
CREATE INDEX IF NOT EXISTS idx_news_event_type ON news(LOWER(event_type));
CREATE INDEX IF NOT EXISTS idx_news_recommended ON news(recommended);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);

-- ─── Administration ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS administration (
  id         SERIAL PRIMARY KEY,
  full_name  VARCHAR(255) NOT NULL,
  position   VARCHAR(255) NOT NULL,
  photo_url  VARCHAR(500),
  bio        TEXT,
  email      VARCHAR(255),
  phone      VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Teachers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id               SERIAL PRIMARY KEY,
  full_name        VARCHAR(255) NOT NULL,
  photo_url        VARCHAR(500),
  category         VARCHAR(100),  -- мұғалім-зерттеуші, мұғалім-сарапшы, мұғалім-модератор
  subject          VARCHAR(255),
  bio              TEXT,
  achievements_count INTEGER DEFAULT 0,
  lessons_count    INTEGER DEFAULT 0,
  events_count     INTEGER DEFAULT 0,
  awards_count     INTEGER DEFAULT 0,
  class_leadership VARCHAR(50),   -- class they manage e.g. "10А"
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_awards (
  id         SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title      VARCHAR(500) NOT NULL,
  year       INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_certificates (
  id         SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title      VARCHAR(500) NOT NULL,
  image_url  VARCHAR(500),
  issued_at  DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link teacher participation to news events
CREATE TABLE IF NOT EXISTS teacher_events (
  id         SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  news_id    INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Gallery ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id          SERIAL PRIMARY KEY,
  image_url   VARCHAR(500),
  description VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Subjects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- ─── Classes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(50) NOT NULL,  -- e.g. "10А"
  homeroom_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  academic_year     VARCHAR(9),            -- e.g. "2025-2026"
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Students ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id         SERIAL PRIMARY KEY,
  full_name  VARCHAR(255) NOT NULL,
  iin        VARCHAR(12) UNIQUE,
  class_id   INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

-- ─── Classrooms ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  capacity INTEGER DEFAULT 30
);

-- ─── Schedule ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule (
  id           SERIAL PRIMARY KEY,
  class_id     INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id   INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id   INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classroom_id INTEGER REFERENCES classrooms(id) ON DELETE SET NULL,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- 1=Mon
  time_slot    INTEGER NOT NULL CHECK (time_slot BETWEEN 1 AND 8),    -- lesson number
  start_time   TIME,
  end_time     TIME,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule(teacher_id);

-- ─── Tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  subject_id  INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  teacher_id  INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  deadline    TIMESTAMPTZ,
  status      VARCHAR(50) DEFAULT 'active',  -- active, archived
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_class ON tasks(class_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

CREATE TABLE IF NOT EXISTS task_files (
  id         SERIAL PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_url   VARCHAR(500) NOT NULL,
  file_name  VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_submissions (
  id           SERIAL PRIMARY KEY,
  task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_url     VARCHAR(500),
  comment      TEXT,
  grade        DECIMAL(4,1),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  graded_at    TIMESTAMPTZ,
  UNIQUE (task_id, student_id)
);

-- ─── Library ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  author      VARCHAR(255),
  quantity    INTEGER DEFAULT 1,
  available   INTEGER DEFAULT 1,
  image_url   VARCHAR(500),
  file_url    VARCHAR(500),  -- optional PDF
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_bookings (
  id          SERIAL PRIMARY KEY,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booked_at   TIMESTAMPTZ DEFAULT NOW(),
  due_date    TIMESTAMPTZ,
  returned_at TIMESTAMPTZ
);

-- ─── Attendance ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id         SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id   INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  status     VARCHAR(20) DEFAULT 'present',  -- present, absent, late
  minutes_late INTEGER DEFAULT 0,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- ─── Reports ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          SERIAL PRIMARY KEY,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  file_url    VARCHAR(500),
  period      VARCHAR(50),  -- e.g. "Q1 2025", "2025-2026"
  status      VARCHAR(50) DEFAULT 'pending',  -- pending, reviewing, accepted, returned
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_teacher ON reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ─── Contacts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255),
  phone      VARCHAR(50),
  subject    VARCHAR(500),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Stats ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stats (
  id    SERIAL PRIMARY KEY,
  key   VARCHAR(100) UNIQUE NOT NULL,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(255)
);

-- ─── Olympiads ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS olympiads (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(500) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  date       DATE,
  level      VARCHAR(100),  -- school, district, regional, national
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS olympiad_results (
  id           SERIAL PRIMARY KEY,
  olympiad_id  INTEGER NOT NULL REFERENCES olympiads(id) ON DELETE CASCADE,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  place        INTEGER,
  award        VARCHAR(255),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Attestations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attestations (
  id          SERIAL PRIMARY KEY,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  category    VARCHAR(100),
  issued_at   DATE,
  expires_at  DATE,
  certificate_url VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Gifted / Struggling students ────────────────────────────
CREATE TABLE IF NOT EXISTS student_profiles (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  profile_type VARCHAR(50) DEFAULT 'normal',  -- gifted, struggling, normal
  notes        TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- Roles
INSERT INTO roles (name, label_kz) VALUES
  ('super_admin', 'Жүйе әкімшісі'),
  ('admin', 'Мектеп әкімшісі'),
  ('teacher', 'Мұғалім'),
  ('student', 'Оқушы'),
  ('parent', 'Ата-ана'),
  ('librarian', 'Кітапханашы'),
  ('director', 'Директор'),
  ('deputy_education', 'Директордың оқу істері жөніндегі орынбасары'),
  ('deputy_culture', 'Директордың тәрбие істері жөніндегі орынбасары'),
  ('deputy_profile', 'Директордың бейіндік жұмыстары жөніндегі орынбасары'),
  ('sport_instructor', 'Денешынықтыру нұсқаушы'),
  ('labor_instructor', 'Еңбек нұсқаушысы'),
  ('extracurricular_teacher', 'Қосымша білім беру педагогы'),
  ('lab_assistant', 'Лаборант'),
  ('nurse', 'Мейіргер'),
  ('reader', 'Оқырман'),
  ('career_counselor', 'Педагог-профориентатор'),
  ('psychologist', 'Педагог-психолог'),
  ('organizer_teacher', 'Педагог-ұйымдастырушы'),
  ('assistant_teacher', 'Педагог-ассистент'),
  ('mentor', 'Тәлімгер'),
  ('club_leader', 'Үйірме жетекшісі'),
  ('secretary', 'Хатшы')
ON CONFLICT (name) DO NOTHING;

-- Default admin user (IIN: 000000000001, password: Admin123!)
-- bcrypt hash for 'Admin123!' (rounds=10, generated with bcryptjs)
INSERT INTO users (full_name, iin, password_hash, role_id, school_id) VALUES (
  'Жүйе әкімшісі',
  '000000000001',
  '$2a$10$dIAVKL9d99vPW.83xJgfHOInAf0nuY1CnrEssjDUpkTUHwLBlFNjy',
  (SELECT id FROM roles WHERE name = 'super_admin'),
  1
) ON CONFLICT (iin) DO NOTHING;

-- School stats
INSERT INTO stats (key, value, label) VALUES
  ('teachers_count',    '45',   'Мұғалімдер саны'),
  ('students_count',    '620',  'Оқушылар саны'),
  ('experience_years',  '35',   'Тәжірибе жылдары'),
  ('founded_year',      '1989', 'Тіркелген жыл')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Slides
INSERT INTO slides (title_kz, quote, image_url, sort_order) VALUES
  ('Білім – болашақтың кілті', 'Білімді ел – бақытты ел. — Абай Құнанбаев', NULL, 1),
  ('Өз мүмкіндігіңді ашу – сенің міндетің', 'Оқу – өрге жүзу, оқымау – көрге кіру. — Халық мақалы', NULL, 2),
  ('Ертеңгі күн – бүгінгі білімде', 'Жас ұрпақ – елдің болашағы. — Ел мақалы', NULL, 3)
ON CONFLICT DO NOTHING;

-- Administration
INSERT INTO administration (full_name, position, sort_order) VALUES
  ('Жәнібеков Асқар Болатович',   'Мектеп директоры',                    1),
  ('Сейткали Гүлнар Маратовна',   'Оқу ісі жөніндегі директор орынбасары', 2),
  ('Тоқтарова Айгүл Серікқызы',   'Тәрбие ісі жөніндегі директор орынбасары', 3),
  ('Нұрланов Дидар Ерланович',    'Шаруашылық ісі жөніндегі директор орынбасары', 4)
ON CONFLICT DO NOTHING;

-- Subjects
INSERT INTO subjects (name) VALUES
  ('Қазақ тілі'), ('Орыс тілі'), ('Ағылшын тілі'),
  ('Математика'), ('Физика'), ('Химия'), ('Биология'),
  ('География'), ('Тарих'), ('Информатика'),
  ('Дене тәрбиесі'), ('Музыка'), ('Бейнелеу өнері')
ON CONFLICT (name) DO NOTHING;

-- Teachers (sample)
INSERT INTO teachers (full_name, category, subject, achievements_count, lessons_count, events_count, awards_count) VALUES
  ('Бекова Айнур Жаксыбековна',    'Мұғалім-сарапшы',      'Математика',       12, 450, 8, 5),
  ('Мұратов Ерлан Сейтқалиұлы',   'Мұғалім-зерттеуші',    'Физика',           8,  380, 5, 3),
  ('Досова Жазира Нұрланқызы',     'Мұғалім-модератор',    'Қазақ тілі',       15, 520, 12, 7),
  ('Сейткалиева Дана Болатовна',   'Мұғалім-сарапшы',      'Химия',            6,  290, 4, 2),
  ('Нұрмаханов Азамат Ерікович',   'Мұғалім-зерттеуші',    'Информатика',      10, 340, 9, 4),
  ('Қасымова Меруерт Айбекқызы',   'Мұғалім-модератор',    'Ағылшын тілі',     9,  410, 7, 6)
ON CONFLICT DO NOTHING;

-- News (sample)
INSERT INTO news (title, description, event_type, recommended, date) VALUES
  (
    'Мектептегі ғылым күні өтті',
    'Биыл мектебімізде дәстүрлі ғылым күні ерекше атмосферада өтті. Оқушылар өздерінің жобаларын ұсынып, жүлделерге ие болды. Іс-шараға 200-ден астам оқушы қатысты.',
    'ғылым',
    TRUE,
    CURRENT_DATE - INTERVAL '3 days'
  ),
  (
    'Математика олимпиадасының нәтижелері',
    'Аудандық математика олимпиадасында біздің оқушыларымыз жоғары нәтижелерге жетті. 3 оқушымыз 1-орын, 5 оқушымыз 2-орын иеленді.',
    'олимпиада',
    TRUE,
    CURRENT_DATE - INTERVAL '7 days'
  ),
  (
    'Наурыз мерекесі салтанатты өтті',
    'Мектебімізде Наурыз мерекесі кең ауқымда тойланды. Оқушылар ұлттық киімдерін киіп, ән айтып, би билеп, халық ойындарын ойнады.',
    'мереке',
    FALSE,
    CURRENT_DATE - INTERVAL '14 days'
  ),
  (
    'Жаңа оқу жылына дайындық',
    'Мектеп ұжымы жаңа оқу жылына толық дайындығын аяқтады. Жаңартылған кабинеттер мен замануи жабдықтар оқушыларды күтіп тұр.',
    'жалпы',
    FALSE,
    CURRENT_DATE - INTERVAL '21 days'
  ),
  (
    'Мұғалімдер күні мерекесі',
    'Оқушылар өз мұғалімдерін Мұғалімдер күнімен құттықтады. Концерт бағдарламасы, сыйлықтар және ыстық сезімдер – бәрі осы күнге арналды.',
    'мереке',
    FALSE,
    CURRENT_DATE - INTERVAL '30 days'
  )
ON CONFLICT DO NOTHING;

-- Gallery (sample)
INSERT INTO gallery (description, image_url) VALUES
  ('Мектептің негізгі ғимараты', NULL),
  ('Оқушылар спорт залда', NULL),
  ('Ғылым күні іс-шарасы', NULL),
  ('Наурыз мерекесі', NULL),
  ('Кітапхана', NULL),
  ('Информатика кабинеті', NULL)
ON CONFLICT DO NOTHING;

-- ─── Multi-tenant and SaaS extension tables ───────────────────────
INSERT INTO schools (id, name, slug, code, domain) VALUES
  (1, 'Ө. Жәнібеков жалпы мектеп', 'default-school', 'DEFAULT', 'default.school.local')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, updated_at = NOW();

CREATE OR REPLACE FUNCTION add_fk_if_missing(constraint_name TEXT, statement TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = constraint_name) THEN
    EXECUTE statement;
  END IF;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
SELECT add_fk_if_missing('users_school_id_fkey', 'ALTER TABLE users ADD CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT');
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);

ALTER TABLE slides ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('slides_school_id_fkey', 'ALTER TABLE slides ADD CONSTRAINT slides_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_slides_school ON slides(school_id);

ALTER TABLE news ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
ALTER TABLE news ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
UPDATE news SET status = 'approved' WHERE status IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'news_status_check'
  ) THEN
    ALTER TABLE news ADD CONSTRAINT news_status_check CHECK (status IN ('approved', 'pending', 'rejected'));
  END IF;
END;
$$ LANGUAGE plpgsql;
SELECT add_fk_if_missing('news_school_id_fkey', 'ALTER TABLE news ADD CONSTRAINT news_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_news_school ON news(school_id);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);

ALTER TABLE administration ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('administration_school_id_fkey', 'ALTER TABLE administration ADD CONSTRAINT administration_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_administration_school ON administration(school_id);

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('teachers_school_id_fkey', 'ALTER TABLE teachers ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);

ALTER TABLE teacher_awards ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('teacher_awards_school_id_fkey', 'ALTER TABLE teacher_awards ADD CONSTRAINT teacher_awards_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_teacher_awards_school ON teacher_awards(school_id);

ALTER TABLE teacher_certificates ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('teacher_certificates_school_id_fkey', 'ALTER TABLE teacher_certificates ADD CONSTRAINT teacher_certificates_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_teacher_certificates_school ON teacher_certificates(school_id);

ALTER TABLE teacher_events ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('teacher_events_school_id_fkey', 'ALTER TABLE teacher_events ADD CONSTRAINT teacher_events_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_teacher_events_school ON teacher_events(school_id);

ALTER TABLE gallery ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('gallery_school_id_fkey', 'ALTER TABLE gallery ADD CONSTRAINT gallery_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_gallery_school ON gallery(school_id);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('subjects_school_id_fkey', 'ALTER TABLE subjects ADD CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('classes_school_id_fkey', 'ALTER TABLE classes ADD CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('students_school_id_fkey', 'ALTER TABLE students ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);

ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('classrooms_school_id_fkey', 'ALTER TABLE classrooms ADD CONSTRAINT classrooms_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_id);

ALTER TABLE schedule ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('schedule_school_id_fkey', 'ALTER TABLE schedule ADD CONSTRAINT schedule_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_schedule_school ON schedule(school_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('tasks_school_id_fkey', 'ALTER TABLE tasks ADD CONSTRAINT tasks_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_tasks_school ON tasks(school_id);

ALTER TABLE task_files ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('task_files_school_id_fkey', 'ALTER TABLE task_files ADD CONSTRAINT task_files_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_task_files_school ON task_files(school_id);

ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('task_submissions_school_id_fkey', 'ALTER TABLE task_submissions ADD CONSTRAINT task_submissions_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_task_submissions_school ON task_submissions(school_id);

ALTER TABLE books ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('books_school_id_fkey', 'ALTER TABLE books ADD CONSTRAINT books_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_books_school ON books(school_id);

ALTER TABLE book_bookings ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('book_bookings_school_id_fkey', 'ALTER TABLE book_bookings ADD CONSTRAINT book_bookings_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_book_bookings_school ON book_bookings(school_id);

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('attendance_school_id_fkey', 'ALTER TABLE attendance ADD CONSTRAINT attendance_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_attendance_school ON attendance(school_id);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('reports_school_id_fkey', 'ALTER TABLE reports ADD CONSTRAINT reports_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_reports_school ON reports(school_id);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('contacts_school_id_fkey', 'ALTER TABLE contacts ADD CONSTRAINT contacts_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_contacts_school ON contacts(school_id);

ALTER TABLE olympiads ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('olympiads_school_id_fkey', 'ALTER TABLE olympiads ADD CONSTRAINT olympiads_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_olympiads_school ON olympiads(school_id);

ALTER TABLE olympiad_results ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('olympiad_results_school_id_fkey', 'ALTER TABLE olympiad_results ADD CONSTRAINT olympiad_results_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_olympiad_results_school ON olympiad_results(school_id);

ALTER TABLE attestations ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('attestations_school_id_fkey', 'ALTER TABLE attestations ADD CONSTRAINT attestations_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_attestations_school ON attestations(school_id);

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
SELECT add_fk_if_missing('student_profiles_school_id_fkey', 'ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE');
CREATE INDEX IF NOT EXISTS idx_student_profiles_school ON student_profiles(school_id);

DROP FUNCTION IF EXISTS add_fk_if_missing(TEXT, TEXT);

CREATE TABLE IF NOT EXISTS permissions (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  label_kz   VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id            SERIAL PRIMARY KEY,
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id   INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE (user_id, role_id, school_id)
);

CREATE TABLE IF NOT EXISTS site_templates (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  config      JSONB DEFAULT '{}'::jsonb,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_settings (
  id        SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  key       VARCHAR(100) NOT NULL,
  value     TEXT,
  UNIQUE (school_id, key)
);

CREATE TABLE IF NOT EXISTS school_content_blocks (
  id         SERIAL PRIMARY KEY,
  school_id  INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  block_key  VARCHAR(100) NOT NULL,
  title      VARCHAR(255),
  body       TEXT,
  image_url  VARCHAR(500),
  metadata   JSONB DEFAULT '{}'::jsonb,
  is_active  BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, block_key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  school_id  INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(100),
  entity_id  INTEGER,
  details    JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS global_styles (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  config     JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS components_config (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  config     JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_plans (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  description     TEXT,
  price_per_month NUMERIC(10,2) DEFAULT 0,
  limits          JSONB DEFAULT '{}'::jsonb,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_plan_assignments (
  id         SERIAL PRIMARY KEY,
  school_id  INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id    INTEGER NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  status     VARCHAR(50) DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date   DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  sender_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject     VARCHAR(255),
  body        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(100),
  content     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_records (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
  record_date DATE DEFAULT CURRENT_DATE,
  notes       TEXT,
  status      VARCHAR(100),
  doctor      VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_transactions (
  id              SERIAL PRIMARY KEY,
  school_id       INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  book_id         INTEGER REFERENCES books(id) ON DELETE CASCADE,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  due_date        TIMESTAMPTZ,
  returned_at     TIMESTAMPTZ,
  status          VARCHAR(50) DEFAULT 'issued'
);

CREATE TABLE IF NOT EXISTS grades (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id  INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  subject_id  INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  class_id    INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  value       NUMERIC(4,2) NOT NULL,
  grade_type  VARCHAR(50) DEFAULT 'exam',
  comments    TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grades_school ON grades(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);

CREATE TABLE IF NOT EXISTS teacher_monthly_plans (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  month       VARCHAR(7) NOT NULL,
  data        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teacher_monthly_plans_school ON teacher_monthly_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_monthly_plans_teacher ON teacher_monthly_plans(teacher_id);

INSERT INTO permissions (name, label_kz) VALUES
  ('manage_users', 'Пайдаланушыларды басқару'),
  ('manage_school', 'Мектепті басқару'),
  ('manage_content', 'Контентті басқару'),
  ('view_analytics', 'Аналитиканы көру'),
  ('manage_library', 'Кітапхананы басқару'),
  ('manage_notifications', 'Хабарламаларды басқару')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.name = 'super_admin' AND p.name IN ('manage_users','manage_school','manage_content','view_analytics','manage_library','manage_notifications')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.name = 'admin' AND p.name IN ('manage_users','manage_content','view_analytics','manage_notifications')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.name = 'teacher' AND p.name IN ('manage_content','view_analytics')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

\ir migration_v3.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v3.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_educational.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_educational.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v4_teacher_dashboard.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v4_teacher_dashboard.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v5_teacher_extended.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v5_teacher_extended.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v6_admin_ui.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v6_admin_ui.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v7_admin_modules.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v7_admin_modules.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v8_admin_screens.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v8_admin_screens.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v9_olympiad_dictionaries.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v9_olympiad_dictionaries.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v10_events.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v10_events.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v11_ratings_competitions.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v11_ratings_competitions.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v12_lesson_observations.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v12_lesson_observations.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v13_site_content.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v13_site_content.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v14_teacher_courses.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v14_teacher_courses.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v15_user_import.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v15_user_import.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v16_school_databases.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v16_school_databases.sql') ON CONFLICT (filename) DO NOTHING;
\ir migration_v17_telegram.sql
INSERT INTO schema_migrations (filename) VALUES ('migration_v17_telegram.sql') ON CONFLICT (filename) DO NOTHING;
