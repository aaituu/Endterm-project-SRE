-- ============================================================
-- Migration V11: Ratings & Competition Names
-- ============================================================

CREATE TABLE IF NOT EXISTS competition_names (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  competition_type_id INTEGER REFERENCES competition_types(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Рейтинг түрлері (Олимпиада, Ғылыми жоба, Іс-шаралар, т.б.)
CREATE TABLE IF NOT EXISTS rating_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rating_types (id, name) VALUES 
  (1, 'Олимпиада'),
  (2, 'Ғылыми жоба'),
  (3, 'Іс-шаралар'),
  (4, 'Байқау конкурстары'),
  (5, 'Дарынды, Үлгерімі төмен оқушылармен жұмыс'),
  (6, 'Өз жетістіктері'),
  (7, 'Сынып жетекші'),
  (8, 'Жалпы рейтинг'),
  (9, 'Олимпиада дайындық'),
  (10, 'Сабаққа ену')
ON CONFLICT (id) DO NOTHING;

SELECT setval('rating_types_id_seq', (SELECT MAX(id) FROM rating_types));

-- Пайдаланушының жалпы рейтингі
CREATE TABLE IF NOT EXISTS user_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_points NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Пайдаланушының рейтинг статистикасының жолдары
CREATE TABLE IF NOT EXISTS user_rating_details (
  id SERIAL PRIMARY KEY,
  user_rating_id INTEGER REFERENCES user_ratings(id) ON DELETE CASCADE,
  rating_type_id INTEGER REFERENCES rating_types(id) ON DELETE SET NULL,
  material_link VARCHAR(1000),
  points NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
