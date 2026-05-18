-- Telegram linking and assignment notification support.

ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_link_code VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_link_code_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE;

UPDATE users SET notification_enabled = TRUE WHERE notification_enabled IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_class_id_fkey') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE users u
SET class_id = s.class_id
FROM students s
WHERE s.user_id = u.id
  AND u.class_id IS NULL
  AND s.class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_chat_id
  ON users(telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_link_code
  ON users(telegram_link_code)
  WHERE telegram_link_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_notifications
  ON users(school_id, notification_enabled)
  WHERE telegram_chat_id IS NOT NULL;

CREATE OR REPLACE VIEW assignments AS
SELECT
  id,
  school_id,
  teacher_id,
  class_id,
  title,
  description,
  deadline AS due_date,
  created_at,
  updated_at
FROM tasks;
