require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { query } = require('./src/config/db');
const { ensureCentralTenantColumns } = require('./src/services/tenantDatabaseService');
const { startTelegramBot } = require('./src/telegramBot');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:5005',
      'http://127.0.0.1:5005',
      'http://localhost:5010',
      'http://127.0.0.1:5010',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any localhost port in development
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(null, true); // open for dev — restrict in production
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { resolveSchoolContext } = require('./src/middleware/tenant');
app.use(resolveSchoolContext);

// ─── Frontend (SPA) ────────────────────────────────────────────────────────
// Serve built React app from frontend/dist (production-ready).
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_DIST));

// Static uploads
app.use('/resources', express.static(path.join(__dirname, 'resources')));
// Ensure schema compatibility for production deployments where a new module is
// released before the operator has manually applied every migration.
(async () => {
  try {
    const migrationFiles = [
      'migration_educational.sql',
      'migration_v4_teacher_dashboard.sql',
      'migration_v5_teacher_extended.sql',
      'migration_v6_admin_ui.sql',
      'migration_v7_admin_modules.sql',
      'migration_v8_admin_screens.sql',
      'migration_v9_olympiad_dictionaries.sql',
      'migration_v10_events.sql',
      'migration_v11_ratings_competitions.sql',
      'migration_v12_lesson_observations.sql',
      'migration_v13_site_content.sql',
      'migration_v14_teacher_courses.sql',
      'migration_v15_user_import.sql',
      'migration_v16_school_databases.sql',
      'migration_v17_telegram.sql'
    ];

    if (process.env.RUN_AUTO_MIGRATIONS === 'true') {
      for (const file of migrationFiles) {
        const filePath = path.join(__dirname, 'src', 'config', file);
        if (fs.existsSync(filePath)) {
          await query(fs.readFileSync(filePath, 'utf8'));
        }
      }
    }

    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)');
    await query('ALTER TABLE schools ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_subdomain ON schools(subdomain)');
    await ensureCentralTenantColumns();

    await query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT \'kk\'');
    await query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE');
    await query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(20)');
    await query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_shift VARCHAR(20) DEFAULT \'daytime\'');
    await query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30');
    await query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT');
    await query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS grade_label VARCHAR(80)');
    await query('ALTER TABLE subjects ADD COLUMN IF NOT EXISTS weekly_hours INTEGER DEFAULT 0');
    await query('ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT \'standard\'');
    await query('ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_open_lesson BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_homeroom_lesson BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_block_lesson BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE');
    await query('ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(20)');
    await query('ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL');
    await query('ALTER TABLE schedule ADD COLUMN IF NOT EXISTS academic_year VARCHAR(9)');
    await query('ALTER TABLE schedule ADD COLUMN IF NOT EXISTS note TEXT');
    await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS profession VARCHAR(255)');
    await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lesson_context JSONB');
    await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()');
    await query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT \'medium\'');
    await query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30) DEFAULT \'not_started\'');
    await query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
    await query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ');
    await query('ALTER TABLE books ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1');
    await query('ALTER TABLE books ADD COLUMN IF NOT EXISTS available INTEGER DEFAULT 1');
    await query('ALTER TABLE books ADD COLUMN IF NOT EXISTS author VARCHAR(500)');
    await query('ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS assigned_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL');
    await query('ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS assigned_at DATE');
    await query('ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS ends_at DATE');
    await query('ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE');

    await query(`
      CREATE TABLE IF NOT EXISTS subject_teachers (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        UNIQUE(subject_id, teacher_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS subject_classes (
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        PRIMARY KEY (subject_id, class_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        assigned_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        deadline DATE,
        workflow_status VARCHAR(30) DEFAULT 'not_started',
        created_by_admin BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_monthly_plans (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        month VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_monthly_plan_tasks (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL REFERENCES teacher_monthly_plans(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        start_date DATE,
        deadline DATE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS olympiad_preparations (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        competition_type VARCHAR(255) NOT NULL,
        competition_subtype VARCHAR(255),
        status VARCHAR(50) DEFAULT 'preparing',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS olympiad_achievements (
        id SERIAL PRIMARY KEY,
        preparation_id INTEGER NOT NULL REFERENCES olympiad_preparations(id) ON DELETE CASCADE,
        place VARCHAR(50),
        diploma_url VARCHAR(500),
        photo_url VARCHAR(500),
        date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS book_reservations (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        borrow_date DATE DEFAULT CURRENT_DATE,
        return_date DATE,
        actual_return_date DATE,
        status VARCHAR(50) DEFAULT 'issued',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS student_attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS attestation_types (
        id SERIAL PRIMARY KEY,
        name_kz VARCHAR(255) NOT NULL UNIQUE
      )
    `);
    await query('ALTER TABLE attestations ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES attestation_types(id) ON DELETE SET NULL');
    await query('ALTER TABLE attestations ADD COLUMN IF NOT EXISTS document_url VARCHAR(500)');
    await query('ALTER TABLE attestations ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(500)');
    await query(`
      CREATE TABLE IF NOT EXISTS student_reports (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        report_type VARCHAR(50) NOT NULL,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        topic VARCHAR(500) NOT NULL,
        task_type VARCHAR(255) NOT NULL,
        score INTEGER,
        feedback TEXT,
        photo_url VARCHAR(500),
        report_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_materials (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        direction VARCHAR(255),
        class_category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'ready',
        file_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
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
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS lesson_visits (
        id SERIAL PRIMARY KEY,
        visiting_teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        visited_teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        visit_date DATE NOT NULL,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
        lesson_type VARCHAR(100),
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
      )
    `);
    await query(`
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
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS competition_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        type VARCHAR(255) DEFAULT 'Offline',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS competition_levels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS competition_names (
        id SERIAL PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        competition_type_id INTEGER REFERENCES competition_types(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_online BOOLEAN DEFAULT FALSE,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS rating_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS user_ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        total_points NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS user_rating_details (
        id SERIAL PRIMARY KEY,
        user_rating_id INTEGER REFERENCES user_ratings(id) ON DELETE CASCADE,
        rating_type_id INTEGER REFERENCES rating_types(id) ON DELETE SET NULL,
        material_link VARCHAR(1000),
        points NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS event_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        points INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        time TIME,
        location VARCHAR(255),
        event_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL,
        image_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'өтті',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (event_id, user_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS lesson_observations (
        id SERIAL PRIMARY KEY,
        observation_date DATE NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        students_total INTEGER NOT NULL,
        students_attended INTEGER NOT NULL,
        topic VARCHAR(500) NOT NULL,
        lesson_type VARCHAR(255),
        evaluation VARCHAR(255),
        kmj_standard TEXT,
        organization TEXT,
        homework TEXT,
        teacher_student_relation TEXT,
        new_lesson_explanation TEXT,
        topic_reveal TEXT,
        teaching_methods TEXT,
        task_delivery TEXT,
        feedback TEXT,
        conclusion TEXT,
        photo_url VARCHAR(500),
        filled_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS site_content (
        id SERIAL PRIMARY KEY,
        section VARCHAR(100) NOT NULL,
        content_key VARCHAR(100),
        title TEXT,
        body TEXT,
        image_url VARCHAR(500),
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query('ALTER TABLE teacher_monthly_plans ADD COLUMN IF NOT EXISTS school_id INTEGER');
    await query('UPDATE teacher_monthly_plans SET school_id = 1 WHERE school_id IS NULL');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_monthly_plans_school ON teacher_monthly_plans(school_id)');

    await query(`
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
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_course_files (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES teacher_courses(id) ON DELETE CASCADE,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(120),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_courses_teacher ON teacher_courses(teacher_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_courses_school ON teacher_courses(school_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_courses_next ON teacher_courses(next_training_at)');
  } catch (e) {
    console.error('Unable to ensure schema compatibility:', e.message);
  }
})();
// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/school-context', (req, res) => {
  if (!req.school) {
    return res.json({ success: true, data: null });
  }
  return res.json({
    success: true,
    data: {
      id: req.school.id,
      local_school_id: req.school_id || 1,
      name: req.school.name,
      slug: req.school.slug,
      code: req.school.code,
      domain: req.school.domain,
      subdomain: req.school.subdomain,
      database_status: req.school.database_status || null
    }
  });
});

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/users.routes'));
app.use('/api/user-import', require('./src/routes/import.routes'));
app.use('/api/roles', require('./src/routes/roles.routes'));
app.use('/api/slides', require('./src/routes/slides.routes'));
app.use('/api/news', require('./src/routes/news.routes'));
app.use('/api/teachers', require('./src/routes/teachers.routes'));
app.use('/api/gallery', require('./src/routes/gallery.routes'));
app.use('/api/administration', require('./src/routes/administration.routes'));
app.use('/api/academic', require('./src/routes/academic.routes'));
app.use('/api/assignments', require('./src/routes/assignments.routes'));
app.use('/api/tasks', require('./src/routes/tasks.routes'));
app.use('/api/library', require('./src/routes/library.routes'));
app.use('/api/medical', require('./src/routes/medical.routes'));
app.use('/api/reports', require('./src/routes/reports.routes'));
app.use('/api/attendance', require('./src/routes/attendance.routes'));
app.use('/api/contact', require('./src/routes/contact.routes'));
app.use('/api/stats', require('./src/routes/stats.routes'));
app.use('/api/olympiads', require('./src/routes/olympiads.routes'));
app.use('/api/competition-dictionaries', require('./src/routes/competition_dictionaries.routes'));
app.use('/api/attestations', require('./src/routes/attestations.routes'));
app.use('/api/events', require('./src/routes/events.routes'));
app.use('/api/event-types', require('./src/routes/event_types.routes'));
app.use('/api/ratings', require('./src/routes/ratings.routes'));
app.use('/api/rating-types', require('./src/routes/rating_types.routes'));
app.use('/api/competition-names', require('./src/routes/competition_names.routes'));
app.use('/api/lesson-observations', require('./src/routes/lesson_observations.routes'));
app.use('/api/site-content', require('./src/routes/site_content.routes'));
app.use('/api/analytics', require('./src/routes/analytics.routes'));
app.use('/api/super-admin/schools', require('./src/routes/schools.routes'));
app.use('/api/super-admin/analytics', require('./src/routes/super_admin_analytics.routes'));
app.use('/api/super-admin/site-builder', require('./src/routes/super_admin_site_builder.routes'));
app.use('/api/super-admin/audit-logs', require('./src/routes/super_admin_audit_logs.routes'));
app.use('/api/super-admin/plans', require('./src/routes/super_admin_plans.routes'));
app.use('/api/super-admin/impersonate', require('./src/routes/super_admin_impersonate.routes'));
app.use('/api/messages', require('./src/routes/messages.routes'));
app.use('/api/notifications', require('./src/routes/notifications.routes'));
app.use('/api/telegram', require('./src/routes/telegram.routes'));

// Teacher Dashboard Specific Routes
app.use('/api/teacher/dashboard', require('./src/routes/teacher_profile.routes'));
app.use('/api/monthly-plans', require('./src/routes/monthly_plans.routes'));
app.use('/api/students', require('./src/routes/students.routes'));
app.use('/api/student-reports', require('./src/routes/student_reports.routes'));
app.use('/api/student-profiles', require('./src/routes/student_profiles.routes'));
app.use('/api/student-achievements', require('./src/routes/student_achievements.routes'));
app.use('/api/teacher-materials', require('./src/routes/teacher_materials.routes'));
app.use('/api/teacher-courses', require('./src/routes/teacher_courses.routes'));
app.use('/api/teacher-qmg', require('./src/routes/teacher_qmg.routes'));
app.use('/api/lesson-visits', require('./src/routes/lesson_visits.routes'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'School API is running', timestamp: new Date() });
});

// ─── SPA fallback ────────────────────────────────────────────────────────────
// Any non-API route should return the SPA index.html so UI routing works
// (prevents "jumping" into old admin on full reload / direct links).
app.get(/^\/(?!api\/|resources\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// ─── 404 (API only) ─────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(require('./src/middleware/error'));

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`\n🚀 School API running on http://localhost:${PORT}`);
  console.log(`📁 Uploads served at http://localhost:${PORT}/resources`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health\n`);
  startTelegramBot();
});

module.exports = app;
