CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  apple_sub TEXT NOT NULL UNIQUE,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  is_private_email INTEGER NOT NULL DEFAULT 0,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_signed_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_lookup
  ON auth_sessions(token_hash, revoked_at);

CREATE TABLE IF NOT EXISTS saved_words (
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  href TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  saved_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, slug),
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_words_user_saved_at
  ON saved_words(user_id, saved_at DESC);
