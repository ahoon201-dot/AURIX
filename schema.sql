CREATE TABLE IF NOT EXISTS users (
  telegram_id TEXT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  wallet TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  saved REAL NOT NULL DEFAULT 0,
  mined REAL NOT NULL DEFAULT 0,
  energy REAL NOT NULL DEFAULT 200,
  mining INTEGER NOT NULL DEFAULT 0,
  last_mine_at INTEGER,
  referrer_id TEXT,
  referral_earned REAL NOT NULL DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS task_claims (
  telegram_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  created_at INTEGER,
  PRIMARY KEY (telegram_id, task_id)
);
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER
);
