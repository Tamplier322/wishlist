import { env } from '../env';
import { initFirebase } from '../firebase';
import { createSqliteDriver } from '../db/sqlite.driver';
import type { DbDriver } from '../db/types';

let driver: DbDriver | null = null;

export function initDatabase(): Promise<void> {
  if (env.dbDriver === 'firestore') {
    console.log('Database: Firebase Firestore');
    initFirebase();
    return Promise.resolve();
  }

  console.log('Database: SQLite (local file)');
  driver = createSqliteDriver();
  return driver.init();
}

function requireDriver(): DbDriver {
  if (driver === null) {
    throw new Error('SQL-драйвер не инициализирован: активен режим Firestore');
  }
  return driver;
}

export function getRow<Row>(sql: string, params: readonly unknown[] = []): Promise<Row | null> {
  return requireDriver().getRow<Row>(sql, params);
}

export function getRows<Row>(sql: string, params: readonly unknown[] = []): Promise<Row[]> {
  return requireDriver().getRows<Row>(sql, params);
}

export function execRun(sql: string, params: readonly unknown[] = []): Promise<void> {
  return requireDriver().execRun(sql, params);
}
