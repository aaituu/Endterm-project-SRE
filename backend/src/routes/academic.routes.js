const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

const DAY_MAP = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
const DAY_NAMES = ['', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'];
function normalizeDayOfWeek(d) {
  if (d === null || d === undefined) return 1;
  if (typeof d === 'number' && d >= 1 && d <= 7) return d;
  if (typeof d === 'string' && DAY_MAP[d.toLowerCase()]) return DAY_MAP[d.toLowerCase()];
  const n = parseInt(d, 10);
  return n >= 1 && n <= 7 ? n : 1;
}

function currentSchoolId(req) {
  return req.school_id || req.user?.school_id || 1;
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// ─── STATS ────────────────────────────────────────────────────────────────────

router.get('/stats', asyncHandler(async (req, res) => {
  const [cRes, sRes, crRes, schRes, totalClassRes] = await Promise.all([
    query('SELECT COUNT(*) FROM classes WHERE is_active = TRUE'),
    query('SELECT COUNT(*) FROM subjects'),
    query('SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM classrooms'),
    query(`SELECT COUNT(DISTINCT class_id) as scheduled FROM schedule`),
    query('SELECT COUNT(*) FROM classes WHERE is_active = TRUE'),
  ]);
  const totalClasses = parseInt(totalClassRes.rows[0].count) || 0;
  const scheduled = parseInt(schRes.rows[0].scheduled) || 0;
  res.json({
    success: true,
    data: {
      classes:       parseInt(cRes.rows[0].count) || 0,
      subjects:      parseInt(sRes.rows[0].count) || 0,
      classrooms:    parseInt(crRes.rows[0].total) || 0,
      classrooms_active: parseInt(crRes.rows[0].active) || 0,
      schedule_pct:  totalClasses ? Math.round((scheduled / totalClasses) * 100) : 0,
    }
  });
}));

// ─── CLASSES ─────────────────────────────────────────────────────────────────

router.get('/classes', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search = '', language = '' } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const sp = `%${search}%`;
  const params = [sp];
  let langFilter = '';
  if (language) { params.push(language); langFilter = `AND c.language = $${params.length}`; }
  params.push(limitNum, offset);

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT c.*,
        t.full_name AS teacher_name,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.is_active = TRUE) AS student_count,
        (SELECT COUNT(*) FROM schedule sch WHERE sch.class_id = c.id) AS lesson_count
       FROM classes c
       LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
       WHERE c.name ILIKE $1 ${langFilter}
       ORDER BY c.name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    query(
      `SELECT COUNT(*) FROM classes c WHERE c.name ILIKE $1 ${langFilter}`,
      params.slice(0, params.length - 2)
    )
  ]);
  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

router.get('/classes/:id', asyncHandler(async (req, res) => {
  const cls = await query(
    `SELECT c.*, t.full_name AS teacher_name,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.is_active = TRUE) AS student_count
     FROM classes c LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id WHERE c.id = $1`,
    [req.params.id]
  );
  if (!cls.rows[0]) return res.status(404).json({ success: false, message: 'Сынып табылмады' });
  const students = await query(
    'SELECT id, full_name, iin FROM students WHERE class_id = $1 AND is_active = TRUE ORDER BY full_name',
    [req.params.id]
  );
  res.json({ success: true, data: { ...cls.rows[0], students: students.rows } });
}));

router.post('/classes', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    name, homeroom_teacher_id, academic_year, language = 'kk',
    section, schedule_shift, max_students, description, grade_label
  } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Сынып атауы міндетті' });
  const result = await query(
    `INSERT INTO classes (
      name, homeroom_teacher_id, academic_year, language, is_active,
      section, schedule_shift, max_students, description, grade_label
    ) VALUES ($1,$2,$3,$4,TRUE,$5,$6,$7,$8,$9) RETURNING *`,
    [
      name, homeroom_teacher_id || null, academic_year || null, language,
      section || null, schedule_shift || 'daytime', max_students || 30,
      description || null, grade_label || null
    ]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/classes/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    name, homeroom_teacher_id, academic_year, language, is_active,
    section, schedule_shift, max_students, description, grade_label
  } = req.body;
  const result = await query(
    `UPDATE classes SET
      name = COALESCE($1, name),
      homeroom_teacher_id = COALESCE($2, homeroom_teacher_id),
      academic_year = COALESCE($3, academic_year),
      language = COALESCE($4, language),
      is_active = COALESCE($5, is_active),
      section = COALESCE($6, section),
      schedule_shift = COALESCE($7, schedule_shift),
      max_students = COALESCE($8, max_students),
      description = COALESCE($9, description),
      grade_label = COALESCE($10, grade_label)
     WHERE id = $11 RETURNING *`,
    [
      name || null, homeroom_teacher_id || null, academic_year || null, language || null, is_active ?? null,
      section || null, schedule_shift || null, max_students ?? null, description || null, grade_label || null,
      req.params.id
    ]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Сынып табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/classes/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM classes WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Сынып табылмады' });
  res.json({ success: true, message: 'Сынып жойылды' });
}));

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

router.get('/subjects', asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT s.*,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'full_name', t.full_name))
        FILTER (WHERE t.id IS NOT NULL), '[]') AS teachers,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name))
        FILTER (WHERE c.id IS NOT NULL), '[]') AS classes
    FROM subjects s
    LEFT JOIN subject_teachers st ON s.id = st.subject_id
    LEFT JOIN teachers t ON st.teacher_id = t.id
    LEFT JOIN subject_classes sc ON s.id = sc.subject_id
    LEFT JOIN classes c ON sc.class_id = c.id
    GROUP BY s.id ORDER BY s.name
  `);
  res.json({ success: true, data: result.rows });
}));

router.get('/subjects/:id', asyncHandler(async (req, res) => {
  const sub = await query('SELECT * FROM subjects WHERE id = $1', [req.params.id]);
  if (!sub.rows[0]) return res.status(404).json({ success: false, message: 'Пән табылмады' });
  const teachers = await query(
    `SELECT t.id, t.full_name FROM subject_teachers st JOIN teachers t ON t.id = st.teacher_id WHERE st.subject_id = $1 ORDER BY t.full_name`,
    [req.params.id]
  );
  const classes = await query(
    `SELECT c.id, c.name FROM subject_classes sc JOIN classes c ON c.id = sc.class_id WHERE sc.subject_id = $1 ORDER BY c.name`,
    [req.params.id]
  );
  res.json({ success: true, data: { ...sub.rows[0], teachers: teachers.rows, classes: classes.rows } });
}));

router.post('/subjects', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, weekly_hours = 0, category = 'standard', teacher_ids = [] } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Пән атауы міндетті' });
  const result = await query(
    'INSERT INTO subjects (name, weekly_hours, category) VALUES ($1,$2,$3) ON CONFLICT (name) DO NOTHING RETURNING *',
    [name, weekly_hours, category]
  );
  if (!result.rows[0]) return res.status(409).json({ success: false, message: 'Бұл пән бар' });
  const subj = result.rows[0];
  for (const tid of teacher_ids) {
    await query('INSERT INTO subject_teachers (subject_id, teacher_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [subj.id, tid]);
  }
  res.status(201).json({ success: true, data: subj });
}));

router.put('/subjects/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, weekly_hours, category, teacher_ids, is_open_lesson, is_homeroom_lesson, is_block_lesson } = req.body;
  const result = await query(
    `UPDATE subjects SET
      name = COALESCE($1, name),
      weekly_hours = COALESCE($2, weekly_hours),
      category = COALESCE($3, category),
      is_open_lesson = COALESCE($4, is_open_lesson),
      is_homeroom_lesson = COALESCE($5, is_homeroom_lesson),
      is_block_lesson = COALESCE($6, is_block_lesson)
     WHERE id = $7 RETURNING *`,
    [
      name || null, weekly_hours ?? null, category || null,
      is_open_lesson ?? null, is_homeroom_lesson ?? null, is_block_lesson ?? null,
      req.params.id
    ]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Пән табылмады' });
  if (Array.isArray(teacher_ids)) {
    await query('DELETE FROM subject_teachers WHERE subject_id = $1', [req.params.id]);
    for (const tid of teacher_ids) {
      await query('INSERT INTO subject_teachers (subject_id, teacher_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, tid]);
    }
  }
  res.json({ success: true, data: result.rows[0] });
}));

router.post('/subjects/:id/teachers', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { teacher_id } = req.body;
  if (!teacher_id) return res.status(400).json({ success: false, message: 'Мұғалім міндетті' });
  await query(
    'INSERT INTO subject_teachers (subject_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.id, teacher_id]
  );
  res.json({ success: true, message: 'Қосылды' });
}));

router.delete('/subjects/:id/teachers/:teacherId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query(
    'DELETE FROM subject_teachers WHERE subject_id = $1 AND teacher_id = $2',
    [req.params.id, req.params.teacherId]
  );
  res.json({ success: true, message: 'Жойылды' });
}));

router.post('/subjects/:id/classes', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { class_id } = req.body;
  if (!class_id) return res.status(400).json({ success: false, message: 'Сынып міндетті' });
  await query(
    'INSERT INTO subject_classes (subject_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.id, class_id]
  );
  res.json({ success: true, message: 'Қосылды' });
}));

router.delete('/subjects/:id/classes/:classId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query(
    'DELETE FROM subject_classes WHERE subject_id = $1 AND class_id = $2',
    [req.params.id, req.params.classId]
  );
  res.json({ success: true, message: 'Жойылды' });
}));

router.delete('/subjects/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Пән жойылды' });
}));

// ─── CLASSROOMS ───────────────────────────────────────────────────────────────

router.get('/classrooms', asyncHandler(async (req, res) => {
  const { search = '', subject_id, status = '' } = req.query;
  const params = [];
  let where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(cr.name ILIKE $${params.length} OR CAST(cr.room_number AS TEXT) ILIKE $${params.length})`);
  }
  if (subject_id) {
    params.push(subject_id);
    where.push(`cr.subject_id = $${params.length}`);
  }
  if (status === 'active') where.push('cr.is_active = TRUE');
  if (status === 'inactive') where.push('cr.is_active = FALSE');
  const wh = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await query(
    `SELECT cr.*, sub.name AS subject_name FROM classrooms cr
     LEFT JOIN subjects sub ON cr.subject_id = sub.id
     ${wh} ORDER BY cr.name`,
    params
  );
  res.json({ success: true, data: result.rows });
}));

router.get('/classrooms/:id', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT cr.*, sub.name AS subject_name FROM classrooms cr
     LEFT JOIN subjects sub ON cr.subject_id = sub.id WHERE cr.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Кабинет табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.post('/classrooms', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, capacity, room_number, subject_id } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Кабинет атауы міндетті' });
  const result = await query(
    'INSERT INTO classrooms (name, capacity, is_active, room_number, subject_id) VALUES ($1, $2, TRUE, $3, $4) RETURNING *',
    [name, capacity || 30, room_number || null, subject_id || null]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/classrooms/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, capacity, is_active, room_number, subject_id } = req.body;
  const hasSubject = Object.prototype.hasOwnProperty.call(req.body, 'subject_id');
  const idIdx = hasSubject ? 6 : 5;
  const result = await query(
    `UPDATE classrooms SET name = COALESCE($1,name), capacity = COALESCE($2,capacity),
     is_active = COALESCE($3,is_active), room_number = COALESCE($4, room_number),
     subject_id = ${hasSubject ? '$5' : 'subject_id'} WHERE id = $${idIdx} RETURNING *`,
    hasSubject
      ? [name || null, capacity || null, is_active ?? null, room_number || null, subject_id ?? null, req.params.id]
      : [name || null, capacity || null, is_active ?? null, room_number || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Кабинет табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.put('/classrooms/:id/toggle-status', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query(
    'UPDATE classrooms SET is_active = NOT is_active WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Кабинет табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/classrooms/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM classrooms WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Кабинет жойылды' });
}));

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────

const SLOT_TIMES = [
  ['08:00', '08:45'],
  ['08:55', '09:40'],
  ['09:50', '10:35'],
  ['10:45', '11:30'],
  ['11:40', '12:25'],
  ['12:35', '13:20'],
  ['13:30', '14:15'],
  ['14:25', '15:10']
];

async function getSubjectPlanForClass(classId, schoolId) {
  const linked = await query(
    `SELECT s.id, s.name, COALESCE(NULLIF(s.weekly_hours, 0), 1)::int AS weekly_hours
     FROM subject_classes sc
     JOIN subjects s ON s.id = sc.subject_id
     WHERE sc.class_id = $1 AND s.school_id = $2
     ORDER BY s.name`,
    [classId, schoolId]
  );
  if (linked.rows.length) return linked.rows;

  const allSubjects = await query(
    `SELECT id, name, COALESCE(NULLIF(weekly_hours, 0), 1)::int AS weekly_hours
     FROM subjects
     WHERE school_id = $1
     ORDER BY name`,
    [schoolId]
  );
  return allSubjects.rows;
}

async function pickTeacherForSubject(subjectId, schoolId, fallbackTeachers, teacherCursor) {
  const subjectTeachers = await query(
    `SELECT t.id
     FROM subject_teachers st
     JOIN teachers t ON t.id = st.teacher_id
     WHERE st.subject_id = $1 AND t.school_id = $2 AND COALESCE(t.is_active, TRUE) = TRUE
     ORDER BY t.id`,
    [subjectId, schoolId]
  );
  const pool = subjectTeachers.rows.length ? subjectTeachers.rows : fallbackTeachers;
  if (!pool.length) return null;
  const cursor = teacherCursor.get(subjectId) || 0;
  const teacher = pool[cursor % pool.length];
  teacherCursor.set(subjectId, cursor + 1);
  return teacher.id;
}

async function pickClassroomForSubject(subjectId, schoolId, fallbackClassrooms) {
  const subjectRoom = await query(
    `SELECT id FROM classrooms
     WHERE COALESCE(is_active, TRUE) = TRUE AND subject_id = $1 AND school_id = $2
     ORDER BY id
     LIMIT 1`,
    [subjectId, schoolId]
  );
  return subjectRoom.rows[0]?.id || fallbackClassrooms[0]?.id || null;
}

router.post('/schedule/generate', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    academic_year,
    schedule_type,
    clear_existing,
    lessons_per_day = 7
  } = req.body;
  const schoolId = currentSchoolId(req);
  const perDay = Math.min(8, Math.max(1, parseInt(lessons_per_day, 10) || 7));

  if (clear_existing) {
    if (academic_year) {
      await query(
        'DELETE FROM schedule WHERE school_id = $1 AND (academic_year = $2 OR academic_year IS NULL)',
        [schoolId, academic_year]
      );
    } else {
      await query('DELETE FROM schedule WHERE school_id = $1', [schoolId]);
    }
  }
  if (schedule_type === 'evening' || schedule_type === 'daytime') {
    await query('UPDATE classes SET schedule_shift = $1 WHERE school_id = $2 AND is_active = TRUE', [schedule_type, schoolId]);
  }

  const [classesRes, teachersRes, classroomsRes] = await Promise.all([
    query(
      `SELECT id, name
       FROM classes
       WHERE school_id = $1 AND is_active = TRUE
       ORDER BY name`,
      [schoolId]
    ),
    query(
      `SELECT id
       FROM teachers
       WHERE school_id = $1 AND COALESCE(is_active, TRUE) = TRUE
       ORDER BY id`,
      [schoolId]
    ),
    query(
      `SELECT id
       FROM classrooms
       WHERE school_id = $1 AND COALESCE(is_active, TRUE) = TRUE
       ORDER BY id`,
      [schoolId]
    )
  ]);

  if (!classesRes.rows.length || !teachersRes.rows.length) {
    return res.json({
      success: true,
      message: 'Генерация үшін сыныптар мен мұғалімдер қажет',
      data: {
        created_count: 0,
        classes_count: classesRes.rows.length,
        teachers_count: teachersRes.rows.length,
        missing: {
          classes: !classesRes.rows.length,
          teachers: !teachersRes.rows.length
        }
      }
    });
  }

  const teacherCursor = new Map();
  let created = 0;
  const perClass = [];

  for (const cls of classesRes.rows) {
    const subjects = await getSubjectPlanForClass(cls.id, schoolId);
    if (!subjects.length) {
      perClass.push({ class_id: cls.id, class_name: cls.name, created_count: 0, reason: 'Пәндер жоқ' });
      continue;
    }

    const weeklyPlan = [];
    for (const subject of subjects) {
      const hours = Math.min(10, Math.max(1, parseInt(subject.weekly_hours, 10) || 1));
      for (let i = 0; i < hours; i += 1) weeklyPlan.push(subject);
    }

    let classCreated = 0;
    const maxLessons = Math.min(weeklyPlan.length, perDay * 5);
    for (let index = 0; index < maxLessons; index += 1) {
      const subject = weeklyPlan[index % weeklyPlan.length];
      const day = Math.floor(index / perDay) + 1;
      const slot = (index % perDay) + 1;
      const teacherId = await pickTeacherForSubject(subject.id, schoolId, teachersRes.rows, teacherCursor);
      if (!teacherId) continue;

      const classroomId = await pickClassroomForSubject(subject.id, schoolId, classroomsRes.rows);
      const [startTime, endTime] = SLOT_TIMES[slot - 1] || SLOT_TIMES[0];
      await query(
        `INSERT INTO schedule (
          school_id, class_id, subject_id, teacher_id, classroom_id,
          day_of_week, time_slot, start_time, end_time, academic_year, note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          schoolId,
          cls.id,
          subject.id,
          teacherId,
          classroomId,
          day,
          slot,
          startTime,
          endTime,
          academic_year || null,
          'Автоматты генерация'
        ]
      );
      classCreated += 1;
      created += 1;
    }

    perClass.push({ class_id: cls.id, class_name: cls.name, created_count: classCreated });
  }

  res.json({
    success: true,
    message: `Кесте генерацияланды: ${created} сабақ құрылды`,
    data: {
      created_count: created,
      classes_count: classesRes.rows.length,
      teachers_count: teachersRes.rows.length,
      classrooms_count: classroomsRes.rows.length,
      lessons_per_day: perDay,
      per_class: perClass
    }
  });
}));

router.get('/schedule/teachers', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const schoolId = currentSchoolId(req);
  const result = await query(
    `SELECT
       t.id,
       t.full_name,
       COUNT(s.id)::int AS lesson_count,
       COUNT(DISTINCT s.class_id)::int AS class_count,
       COUNT(DISTINCT s.day_of_week)::int AS day_count,
       COALESCE(STRING_AGG(DISTINCT c.name, ', ' ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL), '') AS class_names
     FROM teachers t
     LEFT JOIN schedule s ON s.teacher_id = t.id AND s.school_id = $1
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE t.school_id = $1 AND COALESCE(t.is_active, TRUE) = TRUE
     GROUP BY t.id, t.full_name
     ORDER BY lesson_count DESC, t.full_name`,
    [schoolId]
  );

  res.json({
    success: true,
    data: {
      teachers: result.rows,
      total_teachers: result.rows.length,
      total_lessons: result.rows.reduce((sum, row) => sum + (parseInt(row.lesson_count, 10) || 0), 0)
    }
  });
}));

router.get('/schedule/validate', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const schoolId = currentSchoolId(req);
  const [classConflicts, teacherConflicts, roomConflicts, emptyClasses, mismatchedRows] = await Promise.all([
    query(
      `SELECT c.name AS class_name, s.day_of_week, s.time_slot, COUNT(*)::int AS count
       FROM schedule s
       JOIN classes c ON c.id = s.class_id
       WHERE s.school_id = $1
       GROUP BY c.name, s.class_id, s.day_of_week, s.time_slot
       HAVING COUNT(*) > 1
       ORDER BY s.day_of_week, s.time_slot, c.name
       LIMIT 50`,
      [schoolId]
    ),
    query(
      `SELECT t.full_name AS teacher_name, s.day_of_week, s.time_slot, COUNT(*)::int AS count
       FROM schedule s
       JOIN teachers t ON t.id = s.teacher_id
       WHERE s.school_id = $1
       GROUP BY t.full_name, s.teacher_id, s.day_of_week, s.time_slot
       HAVING COUNT(*) > 1
       ORDER BY s.day_of_week, s.time_slot, t.full_name
       LIMIT 50`,
      [schoolId]
    ),
    query(
      `SELECT cr.name AS classroom_name, s.day_of_week, s.time_slot, COUNT(*)::int AS count
       FROM schedule s
       JOIN classrooms cr ON cr.id = s.classroom_id
       WHERE s.school_id = $1 AND s.classroom_id IS NOT NULL
       GROUP BY cr.name, s.classroom_id, s.day_of_week, s.time_slot
       HAVING COUNT(*) > 1
       ORDER BY s.day_of_week, s.time_slot, cr.name
       LIMIT 50`,
      [schoolId]
    ),
    query(
      `SELECT c.id, c.name
       FROM classes c
       WHERE c.school_id = $1 AND c.is_active = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM schedule s WHERE s.class_id = c.id AND s.school_id = $1
         )
       ORDER BY c.name
       LIMIT 50`,
      [schoolId]
    ),
    query(
      `SELECT s.id, c.name AS class_name, sub.name AS subject_name, t.full_name AS teacher_name
       FROM schedule s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       LEFT JOIN teachers t ON t.id = s.teacher_id
       WHERE s.school_id = $1
         AND (
           c.id IS NULL OR sub.id IS NULL OR t.id IS NULL
           OR c.school_id <> s.school_id
           OR sub.school_id <> s.school_id
           OR t.school_id <> s.school_id
         )
       ORDER BY s.id
       LIMIT 50`,
      [schoolId]
    )
  ]);

  const issues = [
    ...classConflicts.rows.map((row) => ({
      type: 'class_conflict',
      severity: 'error',
      message: `${row.class_name}: ${DAY_NAMES[row.day_of_week] || row.day_of_week}, ${row.time_slot}-сабақта ${row.count} жазба бар`
    })),
    ...teacherConflicts.rows.map((row) => ({
      type: 'teacher_conflict',
      severity: 'error',
      message: `${row.teacher_name}: ${DAY_NAMES[row.day_of_week] || row.day_of_week}, ${row.time_slot}-сабақта ${row.count} сабақ қабаттасқан`
    })),
    ...roomConflicts.rows.map((row) => ({
      type: 'room_conflict',
      severity: 'warning',
      message: `${row.classroom_name}: ${DAY_NAMES[row.day_of_week] || row.day_of_week}, ${row.time_slot}-сабақта ${row.count} сынып отыр`
    })),
    ...emptyClasses.rows.map((row) => ({
      type: 'empty_class',
      severity: 'warning',
      message: `${row.name}: кесте жоқ`
    })),
    ...mismatchedRows.rows.map((row) => ({
      type: 'school_mismatch',
      severity: 'error',
      message: `ID ${row.id}: мектеп байланысы сәйкес емес`
    }))
  ];

  res.json({
    success: true,
    message: issues.length ? `${issues.length} мәселе табылды` : 'Кесте тексерілді, мәселе табылмады',
    data: {
      ok: issues.length === 0,
      issue_count: issues.length,
      issues,
      summary: {
        class_conflicts: classConflicts.rows.length,
        teacher_conflicts: teacherConflicts.rows.length,
        room_conflicts: roomConflicts.rows.length,
        empty_classes: emptyClasses.rows.length,
        school_mismatches: mismatchedRows.rows.length
      }
    }
  });
}));

router.get('/schedule/export', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const schoolId = currentSchoolId(req);
  const shift = ['daytime', 'evening'].includes(req.query.shift) ? req.query.shift : 'daytime';
  const withTeachers = String(req.query.with_teachers || 'false') === 'true';
  const result = await query(
    `SELECT
       s.day_of_week,
       s.time_slot,
       s.start_time,
       s.end_time,
       s.academic_year,
       c.name AS class_name,
       sub.name AS subject_name,
       t.full_name AS teacher_name,
       cr.name AS classroom_name
     FROM schedule s
     JOIN classes c ON c.id = s.class_id
     JOIN subjects sub ON sub.id = s.subject_id
     JOIN teachers t ON t.id = s.teacher_id
     LEFT JOIN classrooms cr ON cr.id = s.classroom_id
     WHERE s.school_id = $1 AND c.school_id = $1 AND c.schedule_shift = $2
     ORDER BY c.name, s.day_of_week, s.time_slot`,
    [schoolId, shift]
  );

  const headers = ['Күн', 'Сабақ', 'Басталуы', 'Аяқталуы', 'Сынып', 'Пән'];
  if (withTeachers) headers.push('Мұғалім');
  headers.push('Кабинет', 'Оқу жылы');

  const rows = result.rows.map((row) => {
    const cells = [
      DAY_NAMES[row.day_of_week] || row.day_of_week,
      row.time_slot,
      row.start_time,
      row.end_time,
      row.class_name,
      row.subject_name
    ];
    if (withTeachers) cells.push(row.teacher_name);
    cells.push(row.classroom_name || '', row.academic_year || '');
    return cells.map(csvCell).join(',');
  });

  const csv = `\uFEFF${headers.map(csvCell).join(',')}\n${rows.join('\n')}`;
  const suffix = withTeachers ? '-teachers' : '';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="schedule-${shift}${suffix}.csv"`);
  res.send(csv);
}));

router.get('/schedule/summary', asyncHandler(async (req, res) => {
  const schoolId = currentSchoolId(req);
  const result = await query(`
    SELECT c.id, c.name, c.academic_year, c.schedule_shift, c.max_students,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.school_id = $1 AND s.is_active = TRUE) AS student_count,
      (SELECT COUNT(*) FROM schedule sch WHERE sch.class_id = c.id AND sch.school_id = $1) AS lesson_count
    FROM classes c
    WHERE c.school_id = $1 AND c.is_active = TRUE
    ORDER BY c.name
  `, [schoolId]);
  res.json({ success: true, data: result.rows });
}));

router.get('/schedule', asyncHandler(async (req, res) => {
  const { class_id, teacher_id } = req.query;
  const schoolId = currentSchoolId(req);
  const params = [schoolId];
  const clauses = ['s.school_id = $1'];
  if (class_id) {
    params.push(class_id);
    clauses.push(`s.class_id = $${params.length}`);
  }
  if (teacher_id) {
    params.push(teacher_id);
    clauses.push(`s.teacher_id = $${params.length}`);
  }
  const result = await query(
    `SELECT s.*, c.name AS class_name, sub.name AS subject_name, t.full_name AS teacher_name, cr.name AS classroom_name
     FROM schedule s
     JOIN classes c ON s.class_id = c.id
     JOIN subjects sub ON s.subject_id = sub.id
     JOIN teachers t ON s.teacher_id = t.id
     LEFT JOIN classrooms cr ON s.classroom_id = cr.id
     WHERE ${clauses.join(' AND ')}
     ORDER BY s.day_of_week, s.time_slot`,
    params
  );
  res.json({ success: true, data: result.rows });
}));

router.post('/schedule', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    class_id, subject_id, teacher_id, classroom_id, day_of_week, time_slot,
    start_time, end_time, academic_year, note
  } = req.body;
  if (!class_id || !subject_id || !teacher_id || day_of_week === undefined || !time_slot) {
    return res.status(400).json({ success: false, message: 'Барлық міндетті өрістерді толтырыңыз' });
  }
  const schoolId = currentSchoolId(req);
  const dow = normalizeDayOfWeek(day_of_week);
  const conflict = await query(
    `SELECT id FROM schedule WHERE school_id=$1 AND class_id=$2 AND day_of_week=$3 AND time_slot=$4`,
    [schoolId, class_id, dow, time_slot]
  );
  if (conflict.rows[0]) {
    await query('DELETE FROM schedule WHERE id=$1', [conflict.rows[0].id]);
  }
  const result = await query(
    `INSERT INTO schedule (school_id,class_id,subject_id,teacher_id,classroom_id,day_of_week,time_slot,start_time,end_time,academic_year,note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      schoolId, class_id, subject_id, teacher_id, classroom_id || null, dow, time_slot,
      start_time || null, end_time || null, academic_year || null, note || null
    ]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.delete('/schedule/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM schedule WHERE id = $1 AND school_id = $2', [req.params.id, currentSchoolId(req)]);
  res.json({ success: true, message: 'Кесте жойылды' });
}));

// ─── PLANS ────────────────────────────────────────────────────────────────────

router.get('/plans', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, workflow_status = '', search = '' } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const sp = `%${search}%`;
  const params = [sp];
  let statusFilter = '';
  if (workflow_status) { params.push(workflow_status); statusFilter = `AND p.workflow_status = $${params.length}`; }
  params.push(limitNum, offset);

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT p.*, t.full_name AS teacher_name, t.id AS teacher_id_val
       FROM plans p LEFT JOIN teachers t ON p.assigned_teacher_id = t.id
       WHERE (p.title ILIKE $1 OR t.full_name ILIKE $1) ${statusFilter}
       ORDER BY p.deadline ASC NULLS LAST, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    query(
      `SELECT COUNT(*) FROM plans p LEFT JOIN teachers t ON p.assigned_teacher_id = t.id
       WHERE (p.title ILIKE $1 OR t.full_name ILIKE $1) ${statusFilter}`,
      params.slice(0, params.length - 2)
    )
  ]);
  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

router.get('/plans/stats', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN workflow_status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN workflow_status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN workflow_status = 'not_started' THEN 1 ELSE 0 END) AS not_started
    FROM plans
  `);
  res.json({ success: true, data: result.rows[0] });
}));

router.post('/plans', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { title, description, assigned_teacher_id, deadline } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Жоспар тақырыбы міндетті' });
  const result = await query(
    'INSERT INTO plans (title, description, assigned_teacher_id, deadline) VALUES ($1,$2,$3,$4) RETURNING *',
    [title, description || null, assigned_teacher_id || null, deadline || null]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/plans/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { title, description, assigned_teacher_id, deadline, workflow_status } = req.body;
  const result = await query(
    `UPDATE plans SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      assigned_teacher_id = COALESCE($3, assigned_teacher_id),
      deadline = COALESCE($4, deadline),
      workflow_status = COALESCE($5, workflow_status),
      updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [title || null, description || null, assigned_teacher_id || null, deadline || null, workflow_status || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Жоспар табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/plans/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM plans WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Жоспар жойылды' });
}));

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

router.get('/students', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, class_id, search = '' } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const sp = `%${search}%`;
  const params = [sp, limitNum, offset];
  let where = 'WHERE (s.full_name ILIKE $1 OR s.iin ILIKE $1)';
  if (class_id) { params.push(class_id); where += ` AND s.class_id = $${params.length - 2}`; }

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT s.*, c.name AS class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id
       ${where} ORDER BY s.full_name LIMIT $2 OFFSET $3`, params
    ),
    query(`SELECT COUNT(*) FROM students s ${where}`, [sp, ...(class_id ? [class_id] : [])])
  ]);
  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

router.post('/students', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { full_name, iin, class_id } = req.body;
  if (!full_name) return res.status(400).json({ success: false, message: 'Аты-жөні міндетті' });
  const result = await query(
    'INSERT INTO students (full_name, iin, class_id) VALUES ($1,$2,$3) RETURNING *',
    [full_name, iin || null, class_id || null]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/students/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { full_name, iin, class_id, is_active } = req.body;
  const result = await query(
    `UPDATE students SET full_name = COALESCE($1,full_name), iin = COALESCE($2,iin),
     class_id = COALESCE($3,class_id), is_active = COALESCE($4,is_active) WHERE id = $5 RETURNING *`,
    [full_name || null, iin || null, class_id || null, is_active ?? null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Оқушы табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/students/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM students WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Оқушы жойылды' });
}));

// ─── GRADES ─────────────────────────────────────────────────────────────────
router.get('/grades', authenticate, asyncHandler(async (req, res) => {
  const { student_id, subject_id, class_id, page = 1, limit = 50 } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const params = [];
  let where = 'WHERE 1=1';

  if (req.user.role === 'student') {
    const studentRes = await query('SELECT id FROM students WHERE user_id = $1 LIMIT 1', [req.user.id]);
    if (studentRes.rows[0]) {
      params.push(studentRes.rows[0].id);
      where += ` AND g.student_id = $${params.length}`;
    }
  } else if (req.user.role === 'parent') {
    const linkedRes = await query(
      'SELECT student_id FROM parent_student_links WHERE parent_user_id = $1',
      [req.user.id]
    );
    const linkedIds = linkedRes.rows.map((row) => row.student_id);
    if (linkedIds.length) {
      params.push(linkedIds);
      where += ` AND g.student_id = ANY($${params.length})`;
    } else {
      where += ' AND 1=0';
    }
  }

  if (student_id) { params.push(student_id); where += ` AND g.student_id = $${params.length}`; }
  if (subject_id) { params.push(subject_id); where += ` AND g.subject_id = $${params.length}`; }
  if (class_id) { params.push(class_id); where += ` AND g.class_id = $${params.length}`; }
  if (req.user.role !== 'super_admin' && req.user.school_id) {
    params.push(req.user.school_id);
    where += ` AND g.school_id = $${params.length}`;
  }

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT g.*, s.full_name AS student_name, sub.name AS subject_name, t.full_name AS teacher_name
       FROM grades g
       LEFT JOIN students s ON g.student_id = s.id
       LEFT JOIN subjects sub ON g.subject_id = sub.id
       LEFT JOIN teachers t ON g.teacher_id = t.id
       ${where} ORDER BY g.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    ),
    query(`SELECT COUNT(*) FROM grades g ${where}`, params)
  ]);

  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

module.exports = router;
