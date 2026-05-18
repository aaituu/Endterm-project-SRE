-- ============================================================
-- Migration V10: Events & Event Types Module
-- ============================================================

CREATE TABLE IF NOT EXISTS event_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initially from screenshot 5
INSERT INTO event_types (id, name, points) VALUES 
  (1, 'Ашық сабақ', 3),
  (2, 'Сабақтан тыс', 2),
  (3, 'Басқа', 1),
  (5, 'Каучинг сабақ', 8),
  (6, 'Іс-шара', 10),
  (7, 'Олимпиада жүлдегері', 1),
  (9, 'Сайыс сабақ', 5),
  (10, 'Семинар сабақ', 10),
  (11, 'Қарапайым сабақ', 1),
  (12, 'Іс-шараға қатысу', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('event_types_id_seq', (SELECT MAX(id) FROM event_types));

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location VARCHAR(255),
  event_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL,
  image_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'өтті',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);
