-- ============================================================
-- ThesisForge AI v2.0 - Schema PostgreSQL
-- Migrado desde Cloudflare D1 (SQLite) a Vercel Postgres
-- ============================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50)  UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  full_name   VARCHAR(255) NOT NULL,
  institution VARCHAR(255) DEFAULT '',
  plan        VARCHAR(20)  NOT NULL DEFAULT 'free',   -- 'free' | 'basic' | 'premium' | 'admin'
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de sesiones / tokens de autenticación
CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de proyectos de tesis
CREATE TABLE IF NOT EXISTS thesis_projects (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(500) NOT NULL,
  institution     VARCHAR(255) DEFAULT '',
  normative       VARCHAR(50)  DEFAULT 'APA7',   -- 'IUTA' | 'IUTAR' | 'PNF' | 'APA7'
  research_type   VARCHAR(50)  DEFAULT 'cuantitativa',
  modality        VARCHAR(100) DEFAULT '',
  general_objective TEXT DEFAULT '',
  specific_objectives TEXT DEFAULT '',
  justification   TEXT DEFAULT '',
  keywords        TEXT DEFAULT '',
  status          VARCHAR(20)  NOT NULL DEFAULT 'draft', -- 'draft' | 'in_progress' | 'completed'
  ai_provider     VARCHAR(50)  DEFAULT 'gemini',
  ai_model        VARCHAR(100) DEFAULT 'gemini-1.5-flash',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de capítulos generados
CREATE TABLE IF NOT EXISTS thesis_chapters (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES thesis_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title      VARCHAR(500) NOT NULL,
  content    TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'generating' | 'completed' | 'error'
  generated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, chapter_number)
);

-- Tabla de citas/referencias bibliográficas
CREATE TABLE IF NOT EXISTS citations (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES thesis_projects(id) ON DELETE CASCADE,
  authors    TEXT NOT NULL,
  title      TEXT NOT NULL,
  year       INTEGER,
  source     TEXT DEFAULT '',
  url        TEXT DEFAULT '',
  doi        TEXT DEFAULT '',
  citation_type VARCHAR(50) DEFAULT 'article', -- 'article' | 'book' | 'website' | 'thesis'
  apa_format TEXT DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de log de actividad
CREATE TABLE IF NOT EXISTS activity_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  details    TEXT DEFAULT '',
  ip_address VARCHAR(45) DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  description TEXT DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_sessions_token         ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires       ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_id       ON thesis_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status        ON thesis_projects(status);
CREATE INDEX IF NOT EXISTS idx_chapters_project_id    ON thesis_chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_citations_project_id   ON citations(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id       ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at    ON activity_log(created_at);

-- Configuración inicial del sistema
INSERT INTO system_config (key, value, description)
VALUES
  ('max_projects_free',    '2',    'Máximo de proyectos para plan free'),
  ('max_projects_basic',   '10',   'Máximo de proyectos para plan basic'),
  ('max_projects_premium', '999',  'Máximo de proyectos para plan premium'),
  ('app_version',          '2.0.0', 'Versión de la aplicación'),
  ('maintenance_mode',     'false', 'Modo mantenimiento')
ON CONFLICT (key) DO NOTHING;

-- Usuario administrador por defecto (password: Admin@2024!)
-- Hash bcrypt generado externamente — se reemplaza en seed.ts
INSERT INTO users (username, email, password, full_name, plan, is_admin, is_active)
VALUES (
  'admin',
  'admin@thesisforge.ai',
  '$2b$10$placeholder_hash_replaced_by_seed',
  'Administrador del Sistema',
  'admin',
  TRUE,
  TRUE
)
ON CONFLICT (username) DO NOTHING;
