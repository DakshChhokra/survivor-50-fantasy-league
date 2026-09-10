import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/fantasy.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0,
    weekly_pick_points INTEGER NOT NULL DEFAULT 30,
    winner_pick_points INTEGER NOT NULL DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contestants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    headshot_url TEXT,
    display_order INTEGER DEFAULT 0,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_number INTEGER NOT NULL,
    air_date TEXT,
    num_eliminations INTEGER DEFAULT 1,
    deadline DATETIME,
    is_locked INTEGER DEFAULT 0,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eliminations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(episode_id, contestant_id)
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, episode_id)
  );

  CREATE TABLE IF NOT EXISTS preseason_picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, season_id)
  );
`);

function columnNames(table: string): string[] {
  return (db.pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name);
}

function tableSql(table: string): string {
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { sql: string } | undefined;
  return row?.sql ?? '';
}

function migrateSeasons(): void {
  const contestantCols = columnNames('contestants');
  const episodeCols = columnNames('episodes');
  const preseasonCols = columnNames('preseason_picks');
  const preseasonSql = tableSql('preseason_picks');

  const needsContestantSeason = !contestantCols.includes('season_id');
  const needsEpisodeSeason = !episodeCols.includes('season_id');
  const needsPreseasonRebuild =
    !preseasonCols.includes('season_id') || !preseasonSql.includes('UNIQUE(user_id, season_id)');

  if (!needsContestantSeason && !needsEpisodeSeason && !needsPreseasonRebuild) return;

  const leftover =
    (
      db.prepare('SELECT COUNT(*) AS n FROM contestants').get() as { n: number }
    ).n +
    (db.prepare('SELECT COUNT(*) AS n FROM episodes').get() as { n: number }).n +
    (db.prepare('SELECT COUNT(*) AS n FROM preseason_picks').get() as { n: number }).n;

  let backfillId: number | null = null;
  if (leftover > 0) {
    const existing = db.prepare('SELECT id FROM seasons ORDER BY id ASC LIMIT 1').get() as
      | { id: number }
      | undefined;
    if (existing) {
      backfillId = existing.id;
    } else {
      const result = db
        .prepare(`INSERT INTO seasons (name, is_current) VALUES ('Survivor 50', 1)`)
        .run();
      backfillId = result.lastInsertRowid as number;
    }
    const current = db.prepare('SELECT id FROM seasons WHERE is_current = 1 LIMIT 1').get();
    if (!current && backfillId) {
      db.prepare('UPDATE seasons SET is_current = 1 WHERE id = ?').run(backfillId);
    }
  }

  if (needsContestantSeason) {
    db.exec('ALTER TABLE contestants ADD COLUMN season_id INTEGER REFERENCES seasons(id)');
    if (backfillId) {
      db.prepare('UPDATE contestants SET season_id = ? WHERE season_id IS NULL').run(backfillId);
    }
  }

  if (needsEpisodeSeason) {
    db.exec('ALTER TABLE episodes ADD COLUMN season_id INTEGER REFERENCES seasons(id)');
    if (backfillId) {
      db.prepare('UPDATE episodes SET season_id = ? WHERE season_id IS NULL').run(backfillId);
    }
  }

  if (needsPreseasonRebuild) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE preseason_picks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contestant_id INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
        season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, season_id)
      );
    `);

    if (backfillId) {
      db.prepare(
        `INSERT INTO preseason_picks_new (id, user_id, contestant_id, season_id, created_at)
         SELECT id, user_id, contestant_id, ?, created_at FROM preseason_picks`
      ).run(backfillId);
    }

    db.exec(`
      DROP TABLE preseason_picks;
      ALTER TABLE preseason_picks_new RENAME TO preseason_picks;
    `);
    db.pragma('foreign_keys = ON');
  }
}

migrateSeasons();

function migrateSeasonPoints(): void {
  const cols = columnNames('seasons');
  if (!cols.includes('weekly_pick_points')) {
    db.exec('ALTER TABLE seasons ADD COLUMN weekly_pick_points INTEGER NOT NULL DEFAULT 30');
  }
  if (!cols.includes('winner_pick_points')) {
    db.exec('ALTER TABLE seasons ADD COLUMN winner_pick_points INTEGER NOT NULL DEFAULT 50');
  }
}

migrateSeasonPoints();

export type User = {
  id: number;
  username: string;
  password: string;
  created_at: string;
};

export type Season = {
  id: number;
  name: string;
  is_current: number;
  weekly_pick_points: number;
  winner_pick_points: number;
  created_at: string;
};

export type Contestant = {
  id: number;
  name: string;
  headshot_url: string | null;
  display_order: number;
  season_id: number;
  created_at: string;
};

export type Episode = {
  id: number;
  episode_number: number;
  air_date: string | null;
  num_eliminations: number;
  deadline: string | null;
  is_locked: number;
  season_id: number;
  created_at: string;
};

export type Elimination = {
  id: number;
  episode_id: number;
  contestant_id: number;
  created_at: string;
};

export type Prediction = {
  id: number;
  user_id: number;
  episode_id: number;
  contestant_id: number;
  created_at: string;
};

export type PreseasonPick = {
  id: number;
  user_id: number;
  contestant_id: number;
  season_id: number;
  created_at: string;
};

export function getSeasonById(id: number): Season | undefined {
  return db.prepare('SELECT * FROM seasons WHERE id = ?').get(id) as Season | undefined;
}

export function getCurrentSeason(): Season | undefined {
  return db.prepare('SELECT * FROM seasons WHERE is_current = 1 LIMIT 1').get() as
    | Season
    | undefined;
}

export function resolveSeasonId(raw?: string): number | null {
  if (raw !== undefined && raw !== '') {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return getSeasonById(id)?.id ?? null;
  }
  return getCurrentSeason()?.id ?? null;
}

export function setCurrentSeason(id: number): void {
  const tx = db.transaction(() => {
    db.prepare('UPDATE seasons SET is_current = 0').run();
    db.prepare('UPDATE seasons SET is_current = 1 WHERE id = ?').run(id);
  });
  tx();
}

export default db;
