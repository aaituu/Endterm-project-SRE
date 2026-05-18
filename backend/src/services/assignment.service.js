function cleanText(value, max = 120) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function formatDeadline(value) {
  if (!value) return 'No deadline';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function getStudentClassId(db, user) {
  if (user.class_id) return user.class_id;
  const result = await db.query(
    `SELECT class_id
     FROM students
     WHERE user_id = $1 AND school_id = $2 AND is_active = TRUE
     LIMIT 1`,
    [user.id, user.school_id]
  );
  return result.rows[0]?.class_id || null;
}

async function getAssignmentsForUser(db, user, { onlyToday = false, limit = 10 } = {}) {
  const params = [user.school_id];
  const where = [
    't.school_id = $1',
    'COALESCE(t.is_archived, FALSE) = FALSE'
  ];

  if (onlyToday) {
    where.push('t.deadline IS NOT NULL');
    where.push('t.deadline::date = CURRENT_DATE');
  }

  if (user.role === 'student') {
    const classId = await getStudentClassId(db, user);
    if (!classId) return [];
    params.push(classId);
    where.push(`t.class_id = $${params.length}`);
  } else if (user.teacher_id) {
    params.push(user.teacher_id);
    where.push(`t.teacher_id = $${params.length}`);
  } else if (!['admin', 'director', 'super_admin'].includes(user.role)) {
    return [];
  }

  params.push(limit);
  const result = await db.query(
    `SELECT t.id, t.title, t.description, t.deadline AS due_date,
            t.created_at, t.updated_at, c.name AS class_name,
            te.full_name AS teacher_name
     FROM tasks t
     LEFT JOIN classes c ON c.id = t.class_id AND c.school_id = t.school_id
     LEFT JOIN teachers te ON te.id = t.teacher_id AND te.school_id = t.school_id
     WHERE ${where.join(' AND ')}
     ORDER BY t.deadline ASC NULLS LAST, t.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function getTelegramProfile(db, user) {
  const result = await db.query(
    `SELECT u.full_name, u.notification_enabled, r.name AS role,
            s.name AS school_name, c.name AS class_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN students st ON st.user_id = u.id AND st.school_id = u.school_id
     LEFT JOIN classes c ON c.id = COALESCE(u.class_id, st.class_id) AND c.school_id = u.school_id
     LEFT JOIN schools s ON s.id = u.school_id
     WHERE u.id = $1 AND u.school_id = $2
     LIMIT 1`,
    [user.id, user.school_id]
  );
  return result.rows[0] || null;
}

function formatAssignmentList(assignments, emptyText) {
  if (!assignments.length) return emptyText;
  return assignments.map((item, index) => {
    const lines = [
      `${index + 1}. ${item.title}`,
      `Deadline: ${formatDeadline(item.due_date)}`
    ];
    if (item.class_name) lines.push(`Class: ${item.class_name}`);
    if (item.teacher_name) lines.push(`Teacher: ${item.teacher_name}`);
    const description = cleanText(item.description);
    if (description) lines.push(description);
    return lines.join('\n');
  }).join('\n\n');
}

module.exports = {
  cleanText,
  formatDeadline,
  getAssignmentsForUser,
  getTelegramProfile,
  formatAssignmentList
};
