import { env, isProduction } from './env';
import { logger } from './logger';
import { providerAvailability } from '../services/oauth';

const DEV_SECRET = 'dev-secret-change-me';

export function assertSecureConfig(): void {
  if (!isProduction) {
    if (env.jwtSecret === DEV_SECRET) {
      logger.warn('JWT_SECRET не задан — используется dev-значение, не для продакшена');
    }
    return;
  }

  const critical: string[] = [];
  const warnings: string[] = [];

  if (env.jwtSecret === DEV_SECRET || env.jwtSecret.length < 32) {
    critical.push('JWT_SECRET должен быть случайной строкой длиной не менее 32 символов');
  }
  if (env.corsOrigins.length === 0) {
    critical.push('CORS_ORIGINS должен содержать хотя бы один origin');
  }
  if (!env.appUrl.startsWith('https://')) {
    warnings.push(`APP_URL должен начинаться с https:// (сейчас ${env.appUrl})`);
  }
  if (!env.apiPublicUrl.startsWith('https://')) {
    warnings.push(`PUBLIC_API_URL должен начинаться с https:// (сейчас ${env.apiPublicUrl})`);
  }
  if (env.oauth.google.clientId && !env.oauth.google.clientSecret) {
    warnings.push('GOOGLE_CLIENT_SECRET не задан — Google-вход отключён');
  }
  if (env.oauth.google.clientSecret && !env.oauth.google.clientId) {
    warnings.push('GOOGLE_CLIENT_ID не задан — Google-вход отключён');
  }
  if (env.oauth.telegram.botToken && !env.oauth.telegram.botUsername) {
    warnings.push('TELEGRAM_BOT_USERNAME не задан — Telegram-вход отключён');
  }

  if (critical.length > 0) {
    logger.error(
      { problems: critical },
      'Критично для безопасности: задайте переменные окружения как можно скорее',
    );
  }
  if (warnings.length > 0) {
    logger.warn({ problems: warnings }, 'Небезопасная или неполная конфигурация');
  }

  const providers = providerAvailability();
  logger.info(
    {
      oauth: {
        google: providers.google,
        telegram: providers.telegram.enabled,
      },
      appUrl: env.appUrl,
      apiPublicUrl: env.apiPublicUrl,
    },
    'OAuth providers availability',
  );
}
