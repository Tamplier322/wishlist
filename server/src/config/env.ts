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

const port = readNumber('PORT', 4000);
const renderExternalUrl = readOptional('RENDER_EXTERNAL_URL').replace(/\/+$/, '');
const localClientUrl = 'http://localhost:5173';
const localApiUrl = `http://localhost:${port}`;
const publicUrlFallback = renderExternalUrl || localClientUrl;
const corsOriginsRaw = readOptional('CORS_ORIGINS') || renderExternalUrl || localClientUrl;

export const env = {
  nodeEnv: readString('NODE_ENV', 'development'),
  port,
  jwtSecret: readString('JWT_SECRET', 'dev-secret-change-me'),
  jwtAccessExpiresIn: readString('JWT_ACCESS_EXPIRES_IN', readString('JWT_EXPIRES_IN', '15m')),
  jwtRefreshExpiresIn: readString('JWT_REFRESH_EXPIRES_IN', '30d'),
  jwtRefreshDays: readNumber('JWT_REFRESH_DAYS', 30),
  corsOrigins: corsOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),

  appUrl: readString('APP_URL', readString('PUBLIC_URL', publicUrlFallback)).replace(
    /\/+$/,
    '',
  ),
  apiPublicUrl: readString(
    'PUBLIC_API_URL',
    readString('PUBLIC_URL', renderExternalUrl || localApiUrl),
  ).replace(/\/+$/, ''),

  oauth: {
    google: {
      clientId: readOptional('GOOGLE_CLIENT_ID'),
      clientSecret: readOptional('GOOGLE_CLIENT_SECRET'),
    },
    telegram: {
      botToken: readOptional('TELEGRAM_BOT_TOKEN'),
      botUsername: readOptional('TELEGRAM_BOT_USERNAME').replace(/^@/, ''),
      maxAgeSec: readNumber('TELEGRAM_AUTH_MAX_AGE_SEC', 3600),
    },
    stateTtlMs: readNumber('OAUTH_STATE_TTL_MS', 10 * 60 * 1000),
    exchangeTtlMs: readNumber('OAUTH_EXCHANGE_TTL_MS', 2 * 60 * 1000),
  },

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

  redisRestUrl: readOptional('REDIS_REST_URL'),
  redisRestToken: readOptional('REDIS_REST_TOKEN'),
  offersCacheTtlMs: readNumber('OFFERS_CACHE_TTL_MS', 5 * 60 * 1000),

  vapidPublicKey: readString(
    'VAPID_PUBLIC_KEY',
    'BD3Eb15yYRl9aWs_8fPKxNj99C23OrziKWm0XzgcgHIjhpcLC-vafXy-EWgnK46WL-lTg-jHM1UpYFk3C9wQg_I',
  ),
  vapidPrivateKey: readString(
    'VAPID_PRIVATE_KEY',
    'cKTzfmVgsbdnH6YMBm9jElVUcpPfj60N0d5pJPLHl58',
  ),

  uploadsUrlTtlHours: readNumber('UPLOADS_URL_TTL_HOURS', 168),

  metricsToken: readOptional('METRICS_TOKEN'),

  enableTestSeed: readString('ENABLE_TEST_SEED', '') === '1',
} as const;

export const isProduction = env.nodeEnv === 'production';
