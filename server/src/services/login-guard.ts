import { HttpError } from '../utils/errors';

interface Attempt {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
}

const attempts = new Map<string, Attempt>();
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const BLOCK_MS = 15 * 60_000;

function disabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === '1';
}

export function loginKey(ip: string | undefined, login: string): string {
  return `${ip ?? 'unknown'}|${login.trim().toLowerCase()}`;
}

export function assertLoginAllowed(key: string): void {
  if (disabled()) return;
  const now = Date.now();
  const attempt = attempts.get(key);
  if (!attempt) return;

  if (attempt.blockedUntil > now) {
    const seconds = Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1000));
    throw new HttpError(
      429,
      `Слишком много неудачных попыток входа. Повторите через ${seconds} с`,
      undefined,
      'RATE_LIMITED',
    );
  }

  if (now - attempt.windowStartedAt > WINDOW_MS) attempts.delete(key);
}

export function registerLoginFailure(key: string): void {
  if (disabled()) return;
  const now = Date.now();
  const attempt = attempts.get(key);

  if (!attempt || now - attempt.windowStartedAt > WINDOW_MS) {
    attempts.set(key, { failures: 1, windowStartedAt: now, blockedUntil: 0 });
    return;
  }

  attempt.failures += 1;
  if (attempt.failures >= MAX_FAILURES) {
    attempt.blockedUntil = now + BLOCK_MS;
    attempt.failures = 0;
    attempt.windowStartedAt = now;
  }
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
