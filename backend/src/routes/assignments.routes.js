const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');
const { getAssignmentsForUser } = require('../services/assignment.service');
const { notifyAssignmentCreated } = require('../services/notification.service');

function requireSchool(req, res, next) {
  if (!req.school_id) {
    return res.status(403).json({ success: false, message: 'Мектеп контексті қажет' });
  }
  return next();
}

router.get('/my', authenticate, attachSchoolContext, requireSchool, asyncHandler(async (req, res) => {
  const assignments = await getAssignmentsForUser(query, req.user, {
    onlyToday: req.query.today === 'true',
    limit: parseInt(req.query.limit, 10) || 50
  });
  res.json({ success: true, data: assignments });
}));

router.post('/', authenticate, requireTeacher, attachSchoolContext, requireSchool, asyncHandler(async (req, res) => {
  const { title, description, subject_id, class_id, due_date, deadline, teacher_id } = req.body;
  if (!title || !class_id) {
    return res.status(400).json({ success: false, message: 'Тақырып пен сынып міндетті' });
  }

  const tid = req.user.role === 'admin' && teacher_id
    ? parseInt(teacher_id, 10)
    : (req.user.teacher_id || null);

  const result = await query(
    `INSERT INTO tasks (
      school_id, title, description, subject_id, class_id, teacher_id,
      assigned_by_user_id, deadline, status, is_archived
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',FALSE)
    RETURNING id, school_id, title, description, subject_id, class_id, teacher_id, deadline, created_at, updated_at`,
    [
      req.school_id,
      title,
      description || null,
      subject_id || null,
      class_id,
      tid,
      req.user.id || null,
      due_date || deadline || null
    ]
  );
  const assignment = result.rows[0];
  notifyAssignmentCreated(assignment).catch((error) => {
    console.error('Assignment notification failed:', error.message);
  });
  res.status(201).json({ success: true, data: assignment });
}));

module.exports = router;
