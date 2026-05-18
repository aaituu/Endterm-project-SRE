const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');
const upload = require('../middleware/upload');
const {
  notifyAssignmentCreated,
  notifyAssignmentUpdated,
  notifyAssignmentDeleted
} = require('../services/notification.service');

async function taskListWhere(req) {
  const isAdmin = req.user.role === 'admin';
  const archived = req.query.archived === 'true';
  const params = [archived];
  let where = 'WHERE COALESCE(t.is_archived, FALSE) = $1';

  if (req.user.role === 'student') {
    const studentResult = await query('SELECT class_id FROM students WHERE user_id = $1 LIMIT 1', [req.user.id]);
    if (studentResult.rows[0]) {
      params.push(studentResult.rows[0].class_id);
      where += ` AND t.class_id = $${params.length}`;
    }
  } else if (req.user.role === 'parent') {
    const linkedResult = await query(
      `SELECT DISTINCT s.class_id
       FROM parent_student_links psl
       JOIN students s ON s.id = psl.student_id
       WHERE psl.parent_user_id = $1 AND s.class_id IS NOT NULL`,
      [req.user.id]
    );
    const classIds = linkedResult.rows.map((row) => row.class_id);
    if (classIds.length) {
      params.push(classIds);
      where += ` AND t.class_id = ANY($${params.length})`;
    } else {
      where += ' AND 1=0';
    }
  } else if (!isAdmin && req.user.teacher_id) {
    params.push(req.user.teacher_id);
    where += ` AND t.teacher_id = $${params.length}`;
  }

  if (req.user.role !== 'super_admin' && req.user.school_id) {
    params.push(req.user.school_id);
    where += ` AND t.school_id = $${params.length}`;
  }

  const searchRaw = req.query.search && String(req.query.search).trim();
  if (searchRaw) {
    params.push(`%${searchRaw}%`);
    const n = params.length;
    where += ` AND (t.title ILIKE $${n} OR t.description ILIKE $${n} OR te.full_name ILIKE $${n})`;
  }
  return { where, params };
}

// GET /api/tasks/stats
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const { where, params } = await taskListWhere(req);
  const result = await query(
    `SELECT
      COUNT(*) FILTER (WHERE t.workflow_status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE t.workflow_status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (
        WHERE t.deadline IS NOT NULL AND t.deadline < NOW() AND t.workflow_status <> 'completed'
      )::int AS overdue,
      COUNT(*)::int AS total
     FROM tasks t
     LEFT JOIN teachers te ON t.teacher_id = te.id
     ${where}`,
    params
  );
  res.json({ success: true, data: result.rows[0] || { completed: 0, in_progress: 0, overdue: 0, total: 0 } });
}));

// POST /api/tasks/json — админ: мұғалімге тапсырма (JSON)
router.post('/json', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    title, description, teacher_id, deadline, priority = 'medium', workflow_status = 'not_started'
  } = req.body;
  if (!title || !teacher_id) {
    return res.status(400).json({ success: false, message: 'Тақырып пен мұғалім міндетті' });
  }
  const result = await query(
    `INSERT INTO tasks (
      school_id, title, description, subject_id, class_id, teacher_id, assigned_by_user_id,
      deadline, priority, workflow_status, status, is_archived
    ) VALUES ($1,$2,$3,NULL,NULL,$4,$5,$6,$7,$8,'active',FALSE) RETURNING *`,
    [req.user.school_id || 1, title, description || null, teacher_id, req.user.id, deadline || null, priority, workflow_status]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// GET /api/tasks
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const { where, params } = await taskListWhere(req);
  params.push(limitNum, offset);

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT t.*, s.name AS subject_name, c.name AS class_name,
        te.full_name AS teacher_name,
        assigner.full_name AS assigned_by_name
       FROM tasks t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN classes c ON t.class_id = c.id
       LEFT JOIN teachers te ON t.teacher_id = te.id
       LEFT JOIN users assigner ON t.assigned_by_user_id = assigner.id
       ${where}
       ORDER BY t.deadline ASC NULLS LAST, t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    query(
      `SELECT COUNT(*) FROM tasks t
       LEFT JOIN teachers te ON t.teacher_id = te.id
       ${where}`,
      params.slice(0, params.length - 2)
    )
  ]);
  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

// GET /api/tasks/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const params = [req.params.id];
  let schoolFilter = '';
  if (req.user.role !== 'super_admin' && req.user.school_id) {
    params.push(req.user.school_id);
    schoolFilter = ` AND t.school_id = $${params.length}`;
  }
  const result = await query(
    `SELECT t.*, s.name AS subject_name, c.name AS class_name, te.full_name AS teacher_name,
      assigner.full_name AS assigned_by_name
     FROM tasks t
     LEFT JOIN subjects s ON t.subject_id = s.id
     LEFT JOIN classes c ON t.class_id = c.id
     LEFT JOIN teachers te ON t.teacher_id = te.id
     LEFT JOIN users assigner ON t.assigned_by_user_id = assigner.id
     WHERE t.id = $1${schoolFilter}`,
    params
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Тапсырма табылмады' });
  const task = result.rows[0];
  if (req.user.role === 'student') {
    const studentRes = await query('SELECT class_id FROM students WHERE user_id = $1 LIMIT 1', [req.user.id]);
    if (studentRes.rows[0] && task.class_id !== studentRes.rows[0].class_id) {
      return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
    }
  } else if (req.user.role !== 'admin' && req.user.teacher_id && task.teacher_id !== req.user.teacher_id) {
    return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
  }

  const [files, submissions] = await Promise.all([
    query('SELECT * FROM task_files WHERE task_id = $1', [task.id]),
    query(
      `SELECT ts.*, st.full_name AS student_name
       FROM task_submissions ts JOIN students st ON ts.student_id = st.id
       WHERE ts.task_id = $1 ORDER BY ts.submitted_at DESC`,
      [task.id]
    )
  ]);
  res.json({ success: true, data: { ...task, files: files.rows, submissions: submissions.rows } });
}));

// POST /api/tasks (файлдармен, оқушы тапсырмалары)
router.post('/', authenticate, requireTeacher, upload.array('files', 5), asyncHandler(async (req, res) => {
  const { title, description, subject_id, class_id, deadline, teacher_id } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Тапсырма атауы міндетті' });
  const tid = req.user.role === 'admin' && teacher_id
    ? parseInt(teacher_id, 10)
    : (req.user.teacher_id || null);
  const taskResult = await query(
    `INSERT INTO tasks (
      school_id, title, description, subject_id, class_id, teacher_id,
      assigned_by_user_id, deadline, status, is_archived
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',FALSE) RETURNING *`,
    [req.user.school_id || 1, title, description, subject_id || null, class_id || null, tid, req.user.id || null, deadline || null]
  );
  const task = taskResult.rows[0];

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      await query(
        'INSERT INTO task_files (task_id,file_url,file_name) VALUES ($1,$2,$3)',
        [task.id, `resources/${file.filename}`, file.originalname]
      );
    }
  }
  notifyAssignmentCreated(task).catch((error) => {
    console.error('Assignment notification failed:', error.message);
  });
  res.status(201).json({ success: true, data: task });
}));

// PUT /api/tasks/:id
router.put('/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const rowParams = [req.params.id];
  let rowSchoolFilter = '';
  if (req.user.role !== 'super_admin' && req.user.school_id) {
    rowParams.push(req.user.school_id);
    rowSchoolFilter = ` AND school_id = $${rowParams.length}`;
  }
  const row = await query(`SELECT * FROM tasks WHERE id = $1${rowSchoolFilter}`, rowParams);
  if (!row.rows[0]) return res.status(404).json({ success: false, message: 'Тапсырма табылмады' });
  const task = row.rows[0];
  if (req.user.role !== 'admin' && req.user.teacher_id && task.teacher_id !== req.user.teacher_id) {
    return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
  }

  const {
    title, description, subject_id, class_id, deadline, status,
    priority, workflow_status, is_archived, teacher_id
  } = req.body;

  const has = (k) => Object.prototype.hasOwnProperty.call(req.body, k);

  const sets = [];
  const vals = [];
  let n = 1;
  const push = (col, val) => { sets.push(`${col} = $${n++}`); vals.push(val); };

  if (has('title')) push('title', title);
  if (has('description')) push('description', description);
  if (has('subject_id')) push('subject_id', subject_id);
  if (has('class_id')) push('class_id', class_id);
  if (has('deadline')) push('deadline', deadline);
  if (has('status')) push('status', status);
  if (has('priority')) push('priority', priority);
  if (has('workflow_status')) push('workflow_status', workflow_status);
  if (has('is_archived')) {
    push('is_archived', !!is_archived);
    push('archived_at', is_archived ? new Date().toISOString() : null);
  }
  if (req.user.role === 'admin' && has('teacher_id')) push('teacher_id', teacher_id);

  if (!sets.length) return res.status(400).json({ success: false, message: 'Өзгеріс жоқ' });

  sets.push('updated_at = NOW()');
  vals.push(req.params.id);
  let where = `WHERE id = $${n}`;
  if (req.user.role !== 'super_admin' && req.user.school_id) {
    vals.push(req.user.school_id);
    where += ` AND school_id = $${n + 1}`;
  }
  const result = await query(
    `UPDATE tasks SET ${sets.join(', ')} ${where} RETURNING *`,
    vals
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Тапсырма табылмады' });
  notifyAssignmentUpdated(result.rows[0]).catch((error) => {
    console.error('Assignment update notification failed:', error.message);
  });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const params = [req.params.id];
  let schoolFilter = '';
  if (req.user.role !== 'super_admin' && req.user.school_id) {
    params.push(req.user.school_id);
    schoolFilter = ` AND school_id = $${params.length}`;
  }
  const taskResult = await query(`SELECT * FROM tasks WHERE id = $1${schoolFilter}`, params);
  if (!taskResult.rows[0]) return res.status(404).json({ success: false, message: 'Тапсырма табылмады' });
  await query(`DELETE FROM tasks WHERE id = $1${schoolFilter}`, params);
  notifyAssignmentDeleted(taskResult.rows[0]).catch((error) => {
    console.error('Assignment delete notification failed:', error.message);
  });
  res.json({ success: true, message: 'Тапсырма жойылды' });
}));

// POST /api/tasks/:id/grade
router.post('/:id/grade', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { student_id, grade, comment } = req.body;
  const result = await query(
    `UPDATE task_submissions SET grade=$1, comment=$2, graded_at=NOW()
     WHERE task_id=$3 AND student_id=$4 RETURNING *`,
    [grade, comment, req.params.id, student_id]
  );
  res.json({ success: true, data: result.rows[0] });
}));

module.exports = router;
