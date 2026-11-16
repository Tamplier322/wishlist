import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { env } from './env';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let app: App | null = null;
let db: Firestore | null = null;

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, '\n').replace(/\r\n?/g, '\n').trim();

  if (!key.includes('BEGIN PRIVATE KEY')) {
    const body = key.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]{100,}$/.test(body)) {
      const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
      key = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
      console.warn('FIREBASE_PRIVATE_KEY: заголовки PEM отсутствовали — ключ восстановлен из тела');
    }
  }

  if (!key.includes('BEGIN PRIVATE KEY') || !key.includes('END PRIVATE KEY')) {
    throw new Error(
      `FIREBASE_PRIVATE_KEY повреждён (длина значения: ${raw.length}, BEGIN: ${key.includes('BEGIN')}, END: ${key.includes('END')}). ` +
        'Скопируйте ключ целиком — от "-----BEGIN PRIVATE KEY-----" до "-----END PRIVATE KEY-----". ' +
        'Надёжнее: используйте Secret File в Render (Settings → Secret Files → firebase-service-account.json) и переменную FIREBASE_SERVICE_ACCOUNT_FILE=/etc/secrets/firebase-service-account.json',
    );
  }
  return key;
}

function extractFirstJsonObject(text: string): string {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(0, index + 1);
    }
  }
  return text;
}

function parseServiceAccount(raw: string): ServiceAccount {
  const text = raw.trim();
  const looksLikeJson = text.startsWith('{') || text.includes('"project_id"') || text.includes('"private_key"');

  let source = text;
  if (!looksLikeJson) {
    const decoded = Buffer.from(text, 'base64').toString('utf8').trim();
    if (decoded.startsWith('{') || decoded.includes('"project_id"')) {
      source = decoded;
    }
  }

  const withBraces = source.startsWith('{') ? source : `{${source}}`;
  const parsed = JSON.parse(extractFirstJsonObject(withBraces)) as ServiceAccount;

  if (
    typeof parsed.project_id !== 'string' ||
    typeof parsed.client_email !== 'string' ||
    typeof parsed.private_key !== 'string'
  ) {
    throw new Error('В сервис-аккаунте Firebase нет project_id / client_email / private_key');
  }
  return parsed;
}

function fromEnvParts(): ServiceAccount | null {
  const { projectId, clientEmail, privateKey } = env.firebase;
  if (projectId !== '' && clientEmail !== '' && privateKey !== '') {
    return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
  }
  return null;
}

function readServiceAccount(): ServiceAccount {
  if (env.firebase.serviceAccountJson !== '') {
    try {
      return parseServiceAccount(env.firebase.serviceAccountJson);
    } catch (error) {
      const fallback = fromEnvParts();
      if (fallback !== null) {
        console.warn(
          'FIREBASE_SERVICE_ACCOUNT не удалось разобрать как JSON — использую FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY',
        );
        return fallback;
      }
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT содержит некорректный JSON (${(error as Error).message}). ` +
          'Скопируйте JSON целиком, вместе с фигурными скобками { }, одной строкой и без дублирования.',
      );
    }
  }

  if (env.firebase.serviceAccountFile !== '') {
    const raw = readFileSync(resolve(env.firebase.serviceAccountFile), 'utf8');
    return parseServiceAccount(raw);
  }

  const parts = fromEnvParts();
  if (parts !== null) return parts;

  throw new Error(
    'Firebase не настроен: задайте FIREBASE_SERVICE_ACCOUNT (JSON) либо FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY',
  );
}

export function initFirebase(): void {
  if (db !== null) return;

  const account = readServiceAccount();
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: normalizePrivateKey(account.private_key),
      }),
    });

  db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
}

export function firestore(): Firestore {
  if (db === null) {
    throw new Error('Firestore не инициализирован: сначала вызовите initFirebase()');
  }
  return db;
}

export const COLLECTIONS = {
  users: 'users',
  wishlists: 'wishlists',
  items: 'items',
  members: 'members',
  categories: 'categories',
  comments: 'comments',
  invites: 'invites',
  workspaces: 'workspaces',
  pushSubscriptions: 'push_subscriptions',
} as const;
