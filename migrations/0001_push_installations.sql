CREATE TABLE IF NOT EXISTS push_installations (
  token TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  opt_in_status TEXT NOT NULL,
  app_version TEXT NOT NULL,
  locale TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_success_at TEXT
);
