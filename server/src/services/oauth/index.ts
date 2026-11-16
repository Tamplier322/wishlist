import { env } from '../../config/env';
import type { OAuthProvider } from '../../types/domain';
import { googleProvider } from './google.provider';
import { telegramConfigured } from './telegram.provider';
import type { OAuthProviderAdapter } from './types';

export const redirectProviders: Record<'google', OAuthProviderAdapter> = {
  google: googleProvider,
};

export function isProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === 'telegram') return telegramConfigured();
  return redirectProviders[provider].isConfigured();
}

function telegramBotId(): string | null {
  const token = env.oauth.telegram.botToken;
  if (!token) return null;
  const [id] = token.split(':');
  return id && /^\d+$/.test(id) ? id : null;
}

export function providerAvailability(): {
  google: boolean;
  telegram: { enabled: boolean; botUsername: string | null; botId: string | null };
} {
  return {
    google: googleProvider.isConfigured(),
    telegram: {
      enabled: telegramConfigured(),
      botUsername: env.oauth.telegram.botUsername || null,
      botId: telegramBotId(),
    },
  };
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === 'google' || value === 'telegram';
}
