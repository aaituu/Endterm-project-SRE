const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const upload = require('../middleware/upload');
const { asyncHandler } = require('../utils/helpers');

let schemaReady;

const ensureSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
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
    })();
  }
  return schemaReady;
};

const addYears = (dateValue, years) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
};

const getTeacherId = (req) => {
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return req.query.teacher_id || req.body.teacher_id || req.user.teacher_id;
  }
  return req.user.teacher_id;
};

const loadCourses = async (req, teacherId) => {
  const params = [];
  const where = [];

  if (teacherId) {
    params.push(teacherId);
    where.push(`c.teacher_id = $${params.length}`);
  }

  if (req.user.role !== 'super_admin' && req.school_id) {
    params.push(req.school_id);
    where.push(`c.school_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await query(
    `SELECT c.*, t.full_name AS teacher_name,
       COALESCE(
         json_agg(
           jsonb_build_object(
             'id', f.id,
             'file_url', f.file_url,
             'file_name', f.file_name,
             'file_type', f.file_type
           )
         ) FILTER (WHERE f.id IS NOT NULL),
         '[]'
       ) AS files
     FROM teacher_courses c
     LEFT JOIN teachers t ON t.id = c.teacher_id
     LEFT JOIN teacher_course_files f ON f.course_id = c.id
     ${whereSql}
     GROUP BY c.id, t.full_name
     ORDER BY c.finished_at DESC, c.created_at DESC`,
    params
  );
  return result.rows;
};

router.get('/', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  await ensureSchema();
  const teacherId = getTeacherId(req);
  if (!teacherId && req.user.role === 'teacher') {
    return res.status(400).json({ success: false, message: 'Мұғалім профилі байланыспаған' });
  }

  const rows = await loadCourses(req, teacherId);
  res.json({ success: true, data: rows });
}));

router.post(
  '/',
  authenticate,
  requireTeacher,
  attachSchoolContext,
  upload.array('files', 8),
  asyncHandler(async (req, res) => {
    await ensureSchema();

    const teacherId = getTeacherId(req);
    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'Мұғалім профилі байланыспаған' });
    }

    const { title, topic, provider, description, started_at, finished_at, next_training_at } = req.body;
    if (!title || !finished_at) {
      return res.status(400).json({ success: false, message: 'Курс атауы және оқыған мерзімі міндетті' });
    }

    const nextDate = next_training_at || addYears(finished_at, 3);
    if (!nextDate) {
      return res.status(400).json({ success: false, message: 'Оқыған мерзімі дұрыс емес' });
    }

    const schoolId = req.user.role === 'super_admin'
      ? (req.body.school_id || req.school_id || req.user.school_id || null)
      : req.school_id;

    const result = await query(
      `INSERT INTO teacher_courses
        (school_id, teacher_id, title, topic, provider, description, started_at, finished_at, next_training_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        schoolId,
        teacherId,
        title.trim(),
        topic ? topic.trim() : null,
        provider ? provider.trim() : null,
        description ? description.trim() : null,
        started_at || null,
        finished_at,
        nextDate
      ]
    );

    const course = result.rows[0];
    const files = req.files || [];
    for (const file of files) {
      const fileUrl = `/resources/${file.destination.includes('documents') ? 'documents' : 'images'}/${file.filename}`;
      await query(
        `INSERT INTO teacher_course_files (course_id, file_url, file_name, file_type)
         VALUES ($1, $2, $3, $4)`,
        [course.id, fileUrl, file.originalname, file.mimetype]
      );
    }

    const rows = await loadCourses(req, teacherId);
    res.status(201).json({ success: true, data: rows.find((item) => item.id === course.id), next_training_at: nextDate });
  })
);

router.delete('/:id', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  await ensureSchema();

  const params = [req.params.id];
  let where = 'id = $1';

  if (req.user.role === 'teacher') {
    params.push(req.user.teacher_id);
    where += ` AND teacher_id = $${params.length}`;
  } else if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    where += ` AND school_id = $${params.length}`;
  }

  const result = await query(`DELETE FROM teacher_courses WHERE ${where} RETURNING id`, params);
  if (!result.rows[0]) {
    return res.status(404).json({ success: false, message: 'Курс табылмады' });
  }
  res.json({ success: true, message: 'Курс жойылды' });
}));

module.exports = router;
