-- ============================================================
-- Migration V9: Olympiad Dictionaries (Competition Types and Levels)
-- ============================================================

CREATE TABLE IF NOT EXISTS competition_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(255) DEFAULT 'Offline',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initially from screenshots
INSERT INTO competition_types (id, name, type) VALUES 
  (5, 'Олимпиада', 'Offline'),
  (6, 'Ғылыми жоба', 'Offline'),
  (7, 'Байқау конкурс', 'Offline'),
  (8, 'Мұғалімдерге арналған олимпиада', 'Offline'),
  (9, 'Спорттық олимпиада', 'Offline')
ON CONFLICT (id) DO NOTHING;

SELECT setval('competition_types_id_seq', (SELECT MAX(id) FROM competition_types));

INSERT INTO competition_levels (id, name) VALUES 
  (1, 'Мектеп арлық'),
  (2, 'Аудандық'),
  (3, 'Облыстық'),
  (4, 'Республикалық')
ON CONFLICT (id) DO NOTHING;

SELECT setval('competition_levels_id_seq', (SELECT MAX(id) FROM competition_levels));
