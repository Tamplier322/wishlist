import 'dotenv/config';

function readString(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw !== undefined && raw.trim() !== '' ? raw.trim() : fallback;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readOptional(name: string): string {
  return readString(name, '');
}

function projectIdFromClientEmail(email: string): string {
  const match = email.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
  return match ? match[1] : '';
}

const firebaseClientEmail = readOptional('FIREBASE_CLIENT_EMAIL');
const firebaseProjectId =
  readOptional('FIREBASE_PROJECT_ID') || projectIdFromClientEmail(firebaseClientEmail);
const firebasePrivateKey = readOptional('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
const firebaseServiceAccount = readOptional('FIREBASE_SERVICE_ACCOUNT');
const firebaseServiceAccountFile = readOptional('FIREBASE_SERVICE_ACCOUNT_FILE');

const firebaseEnabled =
  firebaseServiceAccount !== '' ||
  firebaseServiceAccountFile !== '' ||
  (firebaseProjectId !== '' && firebaseClientEmail !== '' && firebasePrivateKey !== '');

export type DbDriverName = 'firestore' | 'sqlite';

function resolveDriver(): DbDriverName {
  return firebaseEnabled ? 'firestore' : 'sqlite';
}

export const env = {
  nodeEnv: readString('NODE_ENV', 'development'),
  port: readNumber('PORT', 4000),
  jwtSecret: readString('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: readString('JWT_EXPIRES_IN', '7d'),
  corsOrigins: readString('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),

  dbDriver: resolveDriver(),

  firebase: {
    serviceAccountJson: firebaseServiceAccount,
    serviceAccountFile: firebaseServiceAccountFile,
    projectId: firebaseProjectId,
    clientEmail: firebaseClientEmail,
    privateKey: firebasePrivateKey,
  },

  sqliteFile: readString('DB_FILE', 'data/wishlist.db'),

  uploadsDir: readString('UPLOADS_DIR', 'data/uploads'),

  vapidPublicKey: readString(
    'VAPID_PUBLIC_KEY',
    'BD3Eb15yYRl9aWs_8fPKxNj99C23OrziKWm0XzgcgHIjhpcLC-vafXy-EWgnK46WL-lTg-jHM1UpYFk3C9wQg_I',
  ),
  vapidPrivateKey: readString(
    'VAPID_PRIVATE_KEY',
    'cKTzfmVgsbdnH6YMBm9jElVUcpPfj60N0d5pJPLHl58',
  ),

  uploadsUrlTtlHours: readNumber('UPLOADS_URL_TTL_HOURS', 168),
} as const;

export const isProduction = env.nodeEnv === 'production';
