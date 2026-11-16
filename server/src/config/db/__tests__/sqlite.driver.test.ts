/// <reference types="vitest/globals" />
import Database from 'better-sqlite3';
import { applyMigrations } from '../sqlite.driver';

let db: Database.Database | null = null;

function open(): Database.Database {
  db = new Database(':memory:');
  return db;
}

function tableNames(connection: Database.Database): string[] {
  return (
    connection.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{
      name: string;
    }>
  ).map((row) => row.name);
}

function columnNames(connection: Database.Database, table: string): string[] {
  return (connection.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (row) => row.name,
  );
}

afterEach(() => {
  db?.close();
  db = null;
});

describe('SQLite migrations', () => {
  it('создаёт все таблицы на пустой базе', () => {
    const connection = open();
    applyMigrations(connection);

    expect(tableNames(connection)).toEqual(
      expect.arrayContaining([
        'users',
        'wishlists',
        'items',
        'categories',
        'wishlist_members',
        'refresh_tokens',
        'price_history',
        'events',
        'oauth_accounts',
        'schema_migrations',
      ]),
    );
  });

  it('добавляет поля, появившиеся в поздних миграциях', () => {
    const connection = open();
    applyMigrations(connection);

    expect(columnNames(connection, 'items')).toContain('reserved_until');
    expect(columnNames(connection, 'items')).toContain('deleted_at');
    expect(columnNames(connection, 'wishlists')).toContain('surprise_mode');
    expect(columnNames(connection, 'users')).toContain('has_password');
    expect(columnNames(connection, 'users')).toContain('display_name');
    expect(columnNames(connection, 'refresh_tokens')).toContain('revoked_at');
  });

  it('фиксирует все версии и не применяет их повторно', () => {
    const connection = open();
    applyMigrations(connection);
    applyMigrations(connection);

    const applied = (
      connection.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{
        id: number;
      }>
    ).map((row) => row.id);

    expect(applied).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14]);
  });

  it('сохраняет данные при повторном запуске миграций', () => {
    const connection = open();
    applyMigrations(connection);
    connection
      .prepare(
        'INSERT INTO users (id, username, email, password_hash, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('u1', 'tester', 'a@b.co', 'hash', '#fff', '2026-01-01T00:00:00.000Z');

    applyMigrations(connection);

    const count = connection.prepare('SELECT COUNT(*) AS total FROM users').get() as {
      total: number;
    };
    expect(count.total).toBe(1);
  });
});
