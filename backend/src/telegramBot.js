const {
  MENU_LABELS,
  isTelegramConfigured,
  telegramApi,
  sendMessage,
  menuKeyboard,
  findTenantUserByChatId,
  linkTelegramByCode,
  setNotificationEnabled
} = require('./services/telegram.service');
const {
  getAssignmentsForUser,
  getTelegramProfile,
  formatAssignmentList
} = require('./services/assignment.service');

let polling = false;
let updateOffset = 0;

function extractStartCode(text) {
  const match = String(text || '').trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/);
  return match?.[1]?.trim() || '';
}

async function requireLinkedUser(chatId) {
  const context = await findTenantUserByChatId(chatId);
  if (!context) {
    await sendMessage(chatId, 'Telegram is not connected. Open Telegram from your website profile using Connect Telegram.');
    return null;
  }
  return context;
}

async function handleStart(message) {
  const chatId = String(message.chat.id);
  const code = extractStartCode(message.text);

  if (!code) {
    const context = await findTenantUserByChatId(chatId);
    if (context) {
      await sendMessage(chatId, 'You are already connected.', {
        reply_markup: menuKeyboard(context.user.notification_enabled !== false)
      });
      return;
    }
    await sendMessage(chatId, 'Open Connect Telegram in your website profile, then start the bot with the generated code.');
    return;
  }

  const linked = await linkTelegramByCode(code, chatId);
  if (!linked) {
    await sendMessage(chatId, 'Invalid or expired linking code. Generate a new code on the website.');
    return;
  }

  await sendMessage(chatId, `Telegram connected successfully.\n${linked.user.full_name}\n${linked.user.school_name || linked.school.name}`, {
    reply_markup: menuKeyboard(linked.user.notification_enabled !== false)
  });
}

async function handleAssignments(chatId, onlyToday = false) {
  const context = await requireLinkedUser(chatId);
  if (!context) return;

  const assignments = await getAssignmentsForUser(context.pool, context.user, {
    onlyToday,
    limit: onlyToday ? 20 : 10
  });
  const text = formatAssignmentList(
    assignments,
    onlyToday ? 'No assignments due today.' : 'No assignments found.'
  );
  await sendMessage(chatId, text, {
    reply_markup: menuKeyboard(context.user.notification_enabled !== false)
  });
}

async function handleProfile(chatId) {
  const context = await requireLinkedUser(chatId);
  if (!context) return;

  const profile = await getTelegramProfile(context.pool, context.user);
  if (!profile) {
    await sendMessage(chatId, 'Profile not found.');
    return;
  }

  const lines = [
    `Name: ${profile.full_name}`,
    `Role: ${profile.role}`,
    `School: ${profile.school_name || context.school.name}`,
    profile.class_name ? `Class: ${profile.class_name}` : null,
    `Notifications: ${profile.notification_enabled === false ? 'disabled' : 'enabled'}`
  ].filter(Boolean);

  await sendMessage(chatId, lines.join('\n'), {
    reply_markup: menuKeyboard(profile.notification_enabled !== false)
  });
}

async function handleNotificationToggle(chatId, enabled) {
  const context = await requireLinkedUser(chatId);
  if (!context) return;

  const next = await setNotificationEnabled(context, enabled);
  await sendMessage(chatId, next ? 'Notifications enabled.' : 'Notifications disabled.', {
    reply_markup: menuKeyboard(next)
  });
}

async function handleMessage(message) {
  if (!message?.chat?.id || !message.text) return;
  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text.startsWith('/start')) return handleStart(message);
  if (text === MENU_LABELS.assignments) return handleAssignments(chatId, false);
  if (text === MENU_LABELS.today) return handleAssignments(chatId, true);
  if (text === MENU_LABELS.profile) return handleProfile(chatId);
  if (text === MENU_LABELS.disable) return handleNotificationToggle(chatId, false);
  if (text === MENU_LABELS.enable) return handleNotificationToggle(chatId, true);

  const context = await findTenantUserByChatId(chatId);
  await sendMessage(chatId, 'Choose an action from the menu.', {
    reply_markup: menuKeyboard(context?.user?.notification_enabled !== false)
  });
}

async function pollOnce() {
  const result = await telegramApi('getUpdates', {
    offset: updateOffset,
    timeout: 25,
    allowed_updates: ['message']
  });

  for (const update of result.result || []) {
    updateOffset = update.update_id + 1;
    try {
      await handleMessage(update.message);
    } catch (error) {
      console.error('Telegram update handling failed:', error.message);
    }
  }
}

async function pollingLoop() {
  while (polling) {
    try {
      await pollOnce();
    } catch (error) {
      console.error('Telegram polling failed:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

function startTelegramBot() {
  if (!isTelegramConfigured()) {
    console.log('Telegram bot disabled: TELEGRAM_BOT_TOKEN is not configured.');
    return;
  }
  if (process.env.TELEGRAM_BOT_POLLING_ENABLED === 'false') {
    console.log('Telegram bot polling disabled by TELEGRAM_BOT_POLLING_ENABLED=false.');
    return;
  }
  if (polling) return;
  polling = true;
  pollingLoop();
  console.log('Telegram bot polling started.');
}

module.exports = { startTelegramBot, handleMessage };
