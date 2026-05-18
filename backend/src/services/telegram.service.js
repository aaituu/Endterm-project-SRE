const crypto = require('crypto');
const { centralQuery, getPoolForDatabase } = require('../config/db');
const { ensureTelegramSchema } = require('./telegramSchemaService');

const CODE_TTL_MINUTES = 15;
const LINK_CODE_RE = /^[A-Za-z0-9_-]{6,80}$/;
const MENU_LABELS = {
  assignments: '📚 My assignments',
  today: '📅 Today',
  profile: '👤 My profile',
  disable: '🔕 Disable notifications',
  enable: '🔔 Enable notifications'
};

let cachedBotUsername = null;

function getTelegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function isTelegramConfigured() {
  return Boolean(getTelegramToken());
}

async function telegramApi(method, payload = {}) {
  const token = getTelegramToken();
  if (!token) {
    return { ok: false, skipped: true, description: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    const message = body.description || `Telegram API ${method} failed`;
    const error = new Error(message);
    error.telegram = body;
    throw error;
  }
  return body;
}

async function getBotUsername() {
  if (cachedBotUsername) return cachedBotUsername;
  if (process.env.TELEGRAM_BOT_USERNAME) {
    cachedBotUsername = String(process.env.TELEGRAM_BOT_USERNAME).replace(/^@/, '');
    return cachedBotUsername;
  }
  const me = await telegramApi('getMe');
  cachedBotUsername = me.result?.username || null;
  return cachedBotUsername;
}

async function buildBotLink(code) {
  const username = await getBotUsername();
  return username ? `https://t.me/${username}?start=${encodeURIComponent(code)}` : null;
}

function generateLinkCode() {
  return `SCH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function menuKeyboard(notificationEnabled = true) {
  return {
    keyboard: [
      [{ text: MENU_LABELS.assignments }, { text: MENU_LABELS.today }],
      [{ text: MENU_LABELS.profile }],
      [{ text: notificationEnabled ? MENU_LABELS.disable : MENU_LABELS.enable }]
    ],
    resize_keyboard: true
  };
}

async function sendMessage(chatId, text, options = {}) {
  if (!chatId || !text || !isTelegramConfigured()) return { ok: false, skipped: true };
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...options
  });
}

async function getReadyTenantSchools() {
  const result = await centralQuery(
    `SELECT id, name, slug, subdomain, database_name, database_status
     FROM schools
     WHERE is_active = TRUE
       AND database_name IS NOT NULL
       AND COALESCE(database_status, 'ready') = 'ready'
     ORDER BY id`
  );
  return result.rows;
}

async function forEachTenant(callback) {
  const schools = await getReadyTenantSchools();
  for (const school of schools) {
    const pool = getPoolForDatabase(school.database_name);
    await ensureTelegramSchema(pool, school.database_name);
    const result = await callback({ school, pool });
    if (result) return result;
  }
  return null;
}

async function generateUserLinkCode(db, { userId, schoolId, databaseKey = 'active' }) {
  await ensureTelegramSchema(db, databaseKey);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateLinkCode();
    try {
      const result = await db.query(
        `UPDATE users
         SET telegram_link_code = $1,
             telegram_link_code_expires_at = $2,
             updated_at = NOW()
         WHERE id = $3 AND school_id = $4 AND is_active = TRUE
         RETURNING id, telegram_link_code`,
        [code, expiresAt, userId, schoolId]
      );
      if (!result.rows[0]) {
        const err = new Error('Пайдаланушы табылмады');
        err.status = 404;
        throw err;
      }
      return {
        code,
        expires_at: expiresAt,
        bot_link: await buildBotLink(code)
      };
    } catch (error) {
      if (error.code !== '23505' || attempt === 4) throw error;
    }
  }

  throw new Error('Telegram кодын жасау мүмкін болмады');
}

async function unlinkUserTelegram(db, { userId, schoolId, databaseKey = 'active' }) {
  await ensureTelegramSchema(db, databaseKey);
  await db.query(
    `UPDATE users
     SET telegram_chat_id = NULL,
         telegram_link_code = NULL,
         telegram_link_code_expires_at = NULL,
         telegram_linked_at = NULL,
         updated_at = NOW()
     WHERE id = $1 AND school_id = $2`,
    [userId, schoolId]
  );
}

async function getUserTelegramStatus(db, { userId, schoolId, databaseKey = 'active' }) {
  await ensureTelegramSchema(db, databaseKey);
  const result = await db.query(
    `SELECT telegram_chat_id, telegram_linked_at, notification_enabled,
            telegram_link_code_expires_at
     FROM users
     WHERE id = $1 AND school_id = $2`,
    [userId, schoolId]
  );
  const row = result.rows[0] || {};
  return {
    linked: Boolean(row.telegram_chat_id),
    linked_at: row.telegram_linked_at || null,
    notification_enabled: row.notification_enabled !== false,
    pending_link_expires_at: row.telegram_link_code_expires_at || null
  };
}

async function findTenantUserByChatId(chatId) {
  const chat = String(chatId);
  return forEachTenant(async ({ school, pool }) => {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.iin, u.school_id, u.teacher_id, u.class_id,
              u.notification_enabled, r.name AS role, r.label_kz AS role_label,
              s.name AS school_name, s.timezone
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.telegram_chat_id = $1 AND u.is_active = TRUE
       LIMIT 1`,
      [chat]
    );
    if (!result.rows[0]) return null;
    return { school, pool, user: result.rows[0] };
  });
}

async function findTenantUserByLinkCode(code) {
  if (!LINK_CODE_RE.test(String(code || ''))) return null;
  return forEachTenant(async ({ school, pool }) => {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.iin, u.school_id, u.teacher_id, u.class_id,
              u.notification_enabled, r.name AS role, r.label_kz AS role_label,
              s.name AS school_name, s.timezone
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.telegram_link_code = $1
         AND u.telegram_link_code_expires_at > NOW()
         AND u.is_active = TRUE
       LIMIT 1`,
      [code]
    );
    if (!result.rows[0]) return null;
    return { school, pool, user: result.rows[0] };
  });
}

async function unlinkChatEverywhere(chatId) {
  const chat = String(chatId);
  await forEachTenant(async ({ pool }) => {
    await pool.query(
      `UPDATE users
       SET telegram_chat_id = NULL,
           telegram_linked_at = NULL,
           updated_at = NOW()
       WHERE telegram_chat_id = $1`,
      [chat]
    );
    return null;
  });
}

async function linkTelegramByCode(code, chatId) {
  const context = await findTenantUserByLinkCode(code);
  if (!context) return null;

  const chat = String(chatId);
  await unlinkChatEverywhere(chat);
  const result = await context.pool.query(
    `UPDATE users
     SET telegram_chat_id = $1,
         telegram_linked_at = NOW(),
         telegram_link_code = NULL,
         telegram_link_code_expires_at = NULL,
         notification_enabled = COALESCE(notification_enabled, TRUE),
         updated_at = NOW()
     WHERE id = $2 AND school_id = $3
     RETURNING id, full_name, notification_enabled`,
    [chat, context.user.id, context.user.school_id]
  );

  return {
    ...context,
    user: { ...context.user, ...result.rows[0], telegram_chat_id: chat }
  };
}

async function setNotificationEnabled(context, enabled) {
  const result = await context.pool.query(
    `UPDATE users
     SET notification_enabled = $1, updated_at = NOW()
     WHERE id = $2 AND school_id = $3
     RETURNING notification_enabled`,
    [enabled, context.user.id, context.user.school_id]
  );
  context.user.notification_enabled = result.rows[0]?.notification_enabled;
  return context.user.notification_enabled;
}

module.exports = {
  MENU_LABELS,
  CODE_TTL_MINUTES,
  isTelegramConfigured,
  telegramApi,
  sendMessage,
  getBotUsername,
  buildBotLink,
  menuKeyboard,
  generateUserLinkCode,
  unlinkUserTelegram,
  getUserTelegramStatus,
  findTenantUserByChatId,
  linkTelegramByCode,
  setNotificationEnabled
};
