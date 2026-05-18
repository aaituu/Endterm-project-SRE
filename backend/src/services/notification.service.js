const { query, getCurrentTenant } = require('../config/db');
const { ensureTelegramSchema } = require('./telegramSchemaService');
const { sendMessage } = require('./telegram.service');
const { cleanText, formatDeadline } = require('./assignment.service');

async function loadTask(taskId, schoolId) {
  const result = await query(
    `SELECT t.*, te.full_name AS teacher_name, c.name AS class_name
     FROM tasks t
     LEFT JOIN teachers te ON te.id = t.teacher_id AND te.school_id = t.school_id
     LEFT JOIN classes c ON c.id = t.class_id AND c.school_id = t.school_id
     WHERE t.id = $1 AND t.school_id = $2
     LIMIT 1`,
    [taskId, schoolId]
  );
  return result.rows[0] || null;
}

async function recipientsForTask(task) {
  if (!task?.class_id) return [];
  const result = await query(
    `SELECT DISTINCT u.id, u.full_name, u.telegram_chat_id
     FROM students st
     JOIN users u ON u.id = st.user_id AND u.school_id = st.school_id
     WHERE st.school_id = $1
       AND st.class_id = $2
       AND st.is_active = TRUE
       AND u.is_active = TRUE
       AND u.telegram_chat_id IS NOT NULL
       AND COALESCE(u.notification_enabled, TRUE) = TRUE`,
    [task.school_id, task.class_id]
  );
  return result.rows;
}

function assignmentMessage(kind, task) {
  const title = cleanText(task.title, 160);
  const teacher = cleanText(task.teacher_name, 120) || 'Teacher';
  const deadline = formatDeadline(task.deadline);
  if (kind === 'updated') {
    return `✏️ Assignment updated\nTitle: ${title}\nDeadline: ${deadline}`;
  }
  if (kind === 'deleted') {
    return `🗑 Assignment removed\nTitle: ${title}`;
  }
  return `📚 New assignment added\nTitle: ${title}\nTeacher: ${teacher}\nDeadline: ${deadline}`;
}

async function notifyAssignment(taskOrId, kind = 'created') {
  const task = typeof taskOrId === 'object'
    ? (kind === 'deleted' ? taskOrId : await loadTask(taskOrId.id, taskOrId.school_id))
    : null;
  if (!task || !task.class_id) return { sent: 0 };

  const tenant = getCurrentTenant();
  await ensureTelegramSchema({ query }, tenant?.databaseName || `school-${task.school_id}`);
  const recipients = await recipientsForTask(task);
  const text = assignmentMessage(kind, task);

  let sent = 0;
  for (const user of recipients) {
    try {
      await sendMessage(user.telegram_chat_id, text);
      sent += 1;
    } catch (error) {
      console.error('Telegram assignment notification failed:', error.message);
    }
  }
  return { sent };
}

const notifyAssignmentCreated = (task) => notifyAssignment(task, 'created');
const notifyAssignmentUpdated = (task) => notifyAssignment(task, 'updated');
const notifyAssignmentDeleted = (task) => notifyAssignment(task, 'deleted');

module.exports = {
  notifyAssignmentCreated,
  notifyAssignmentUpdated,
  notifyAssignmentDeleted
};
