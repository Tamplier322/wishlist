import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../env';
import type { DbDriver } from './types';

export type BindValue = null | number | bigint | string | Buffer;


function resolveDbPath(): string {
  if (path.isAbsolute(env.sqliteFile)) return env.sqliteFile;
  return path.resolve(__dirname, '..', '..', env.sqliteFile);
}

function createConnection(): Database.Database {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  avatar_color  TEXT NOT NULL,
  avatar_image  TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY,
  owner_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  color     TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(owner_id, name)
);

CREATE TABLE IF NOT EXISTS wishlists (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_shared   INTEGER NOT NULL DEFAULT 0,
  share_slug  TEXT UNIQUE,
  invite_code TEXT UNIQUE,
  deadline    TEXT,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces_extra_marker (id TEXT);

CREATE TABLE IF NOT EXISTS wishlist_members (
  id          TEXT PRIMARY KEY,
  wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  joined_at   TEXT NOT NULL,
  UNIQUE(wishlist_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#c9762e',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id           TEXT PRIMARY KEY,
  wishlist_id  TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id          TEXT PRIMARY KEY,
  wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  price       REAL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  priority    TEXT NOT NULL DEFAULT 'medium',
  kind        TEXT NOT NULL DEFAULT 'other',
  status      TEXT NOT NULL DEFAULT 'wanted',
  reserved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id               TEXT PRIMARY KEY,
  item_id          TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  author_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text             TEXT NOT NULL,
  hide_from_author INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_wishlist   ON items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_members_wishlist ON wishlist_members(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_invites_to_user  ON invites(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_item    ON comments(item_id);
`;


function migrateLegacyDatabases(db: Database.Database): void {
  const userColumns = (db.pragma('table_info(users)') as Array<{ name: string }>).map(
    (column) => column.name,
  );
  if (!userColumns.includes('avatar_image')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_image TEXT`);
  }

  const itemColumns = (db.pragma('table_info(items)') as Array<{ name: string }>).map(
    (column) => column.name,
  );
  if (!itemColumns.includes('reserved_by')) {
    db.exec(`ALTER TABLE items ADD COLUMN reserved_by TEXT`);
  }

  if (!itemColumns.includes('position')) {
    db.exec(`
      ALTER TABLE items ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
      UPDATE items
      SET position = (
        SELECT COUNT(*) FROM items AS older
        WHERE older.wishlist_id = items.wishlist_id
          AND (older.created_at < items.created_at
               OR (older.created_at = items.created_at AND older.id <= items.id))
      );
    `);
  }

  const wishlistColumns = (db.pragma('table_info(wishlists)') as Array<{ name: string }>).map(
    (column) => column.name,
  );
  if (!wishlistColumns.includes('invite_code')) {
    db.exec(`
      ALTER TABLE wishlists ADD COLUMN invite_code TEXT;
      UPDATE wishlists SET invite_code = LOWER(HEX(RANDOMBLOB(8))) WHERE invite_code IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS wishlists_invite_code_idx ON wishlists(invite_code);
    `);
  }
  if (!wishlistColumns.includes('workspace_id')) {
    db.exec(`ALTER TABLE wishlists ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL`);
  }
  if (!wishlistColumns.includes('deadline')) {
    db.exec(`ALTER TABLE wishlists ADD COLUMN deadline TEXT`);
  }

  const tables = (db.pragma('table_list') as Array<{ name: string }>).map((table) => table.name);
  if (!tables.includes('comments')) {
    db.exec(`
      CREATE TABLE comments (
        id               TEXT PRIMARY KEY,
        item_id          TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        author_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text             TEXT NOT NULL,
        hide_from_author INTEGER NOT NULL DEFAULT 0,
        created_at       TEXT NOT NULL
      );
      CREATE INDEX idx_comments_item ON comments(item_id);
    `);
  }
}

export function createSqliteDriver(): DbDriver {
  const db = createConnection();

  return {
    async init(): Promise<void> {
      db.exec(SCHEMA);
      migrateLegacyDatabases(db);
    },

    async getRow<Row>(sql: string, params: readonly BindValue[] = []): Promise<Row | null> {
      const row = db.prepare(sql).get(...(params as never[])) as Row | undefined;
      return row ?? null;
    },

    async getRows<Row>(sql: string, params: readonly BindValue[] = []): Promise<Row[]> {
      return db.prepare(sql).all(...(params as never[])) as Row[];
    },

    async execRun(sql: string, params: readonly BindValue[] = []): Promise<void> {
      db.prepare(sql).run(...(params as never[]));
    },
  };
}
