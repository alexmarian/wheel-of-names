import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'wheel.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  base_weight REAL NOT NULL DEFAULT 10,
  gain_mult   REAL NOT NULL DEFAULT 1,
  floor_k     REAL NOT NULL DEFAULT 0.10,
  theme       TEXT NOT NULL DEFAULT 'wheel',
  pin_hash    TEXT NOT NULL,
  pin_salt    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id         TEXT PRIMARY KEY,
  team_id    TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  weight     REAL NOT NULL,
  absent     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spin_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id   TEXT NOT NULL,
  member_id TEXT NOT NULL,
  picked_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_spin_log_team ON spin_log(team_id, picked_on);

CREATE TABLE IF NOT EXISTS snapshots (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id   TEXT NOT NULL,
  snap_date TEXT NOT NULL,
  data      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, snap_date)
);
`);

export default db;
