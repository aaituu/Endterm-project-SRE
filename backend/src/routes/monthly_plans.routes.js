const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');

// GET /api/monthly-plans
router.get('/', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const params = [req.user.teacher_id];
  let schoolFilter = '';
  if (req.user.role !== 'super_admin' && req.school_id) {
    params.push(req.school_id);
    schoolFilter = ` AND (school_id = $${params.length} OR school_id IS NULL)`;
  }
  const result = await query(
    `SELECT * FROM teacher_monthly_plans WHERE teacher_id = $1 ${schoolFilter} ORDER BY created_at DESC`,
    params
  );
  
  // Also fetch tasks for each plan
  const plans = result.rows;
  if (plans.length > 0) {
    const ids = plans.map(p => p.id);
    const tasksRes = await query(
      `SELECT * FROM teacher_monthly_plan_tasks WHERE plan_id = ANY($1::int[]) ORDER BY deadline ASC`,
      [ids]
    );
    plans.forEach(p => {
      p.tasks = tasksRes.rows.filter(t => t.plan_id === p.id);
    });
  }
  
  res.json({ success: true, data: plans });
}));

// POST /api/monthly-plans
router.post('/', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  const { title, month } = req.body;
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  
  const result = await query(
    `INSERT INTO teacher_monthly_plans (school_id, teacher_id, title, month) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.school_id || req.user.school_id || 1, req.user.teacher_id, title, month]
  );
  res.json({ success: true, data: {...result.rows[0], tasks: []} });
}));

// POST /api/monthly-plans/:id/tasks
router.post('/:id/tasks', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { title, start_date, deadline } = req.body;
  // verify ownership
  const pCheck = await query(`SELECT * FROM teacher_monthly_plans WHERE id = $1 AND teacher_id = $2`, [req.params.id, req.user.teacher_id]);
  if (!pCheck.rows.length) return res.status(404).json({success: false, message: 'Plan not found'});

  const result = await query(
    `INSERT INTO teacher_monthly_plan_tasks (plan_id, title, start_date, deadline) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.params.id, title, start_date, deadline]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// GET /api/monthly-plans/:id
router.get('/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const pCheck = await query(
    `SELECT * FROM teacher_monthly_plans WHERE id = $1 AND teacher_id = $2`,
    [req.params.id, req.user.teacher_id]
  );
  if (!pCheck.rows.length) return res.status(404).json({ success: false, message: 'Plan not found' });

  const tasksRes = await query(
    `SELECT * FROM teacher_monthly_plan_tasks WHERE plan_id = $1 ORDER BY deadline ASC NULLS LAST, id ASC`,
    [req.params.id]
  );
  res.json({ success: true, data: { ...pCheck.rows[0], tasks: tasksRes.rows } });
}));

// PUT /api/monthly-plans/:id
router.put('/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { title, month } = req.body;
  const result = await query(
    `UPDATE teacher_monthly_plans
     SET title = COALESCE($1, title), month = COALESCE($2, month), updated_at = NOW()
     WHERE id = $3 AND teacher_id = $4
     RETURNING *`,
    [title || null, month || null, req.params.id, req.user.teacher_id]
  );
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Plan not found' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/monthly-plans/:id
router.delete('/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const result = await query(
    `DELETE FROM teacher_monthly_plans WHERE id = $1 AND teacher_id = $2 RETURNING id`,
    [req.params.id, req.user.teacher_id]
  );
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Plan not found' });
  res.json({ success: true, message: 'Жойылды' });
}));

// PUT /api/monthly-plans/tasks/:taskId
router.put('/tasks/:taskId', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { title, start_date, deadline, status } = req.body;
  const tCheck = await query(
    `SELECT t.*, p.teacher_id
     FROM teacher_monthly_plan_tasks t
     JOIN teacher_monthly_plans p ON p.id = t.plan_id
     WHERE t.id = $1`,
    [req.params.taskId]
  );
  if (!tCheck.rows.length || tCheck.rows[0].teacher_id !== req.user.teacher_id) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  const result = await query(
    `UPDATE teacher_monthly_plan_tasks
     SET title = COALESCE($1, title),
         start_date = COALESCE($2, start_date),
         deadline = COALESCE($3, deadline),
         status = COALESCE($4, status)
     WHERE id = $5
     RETURNING *`,
    [title || null, start_date || null, deadline || null, status || null, req.params.taskId]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/monthly-plans/tasks/:taskId
router.delete('/tasks/:taskId', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const tCheck = await query(
    `SELECT t.id, p.teacher_id
     FROM teacher_monthly_plan_tasks t
     JOIN teacher_monthly_plans p ON p.id = t.plan_id
     WHERE t.id = $1`,
    [req.params.taskId]
  );
  if (!tCheck.rows.length || tCheck.rows[0].teacher_id !== req.user.teacher_id) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  await query(`DELETE FROM teacher_monthly_plan_tasks WHERE id = $1`, [req.params.taskId]);
  res.json({ success: true, message: 'Жойылды' });
}));

module.exports = router;
