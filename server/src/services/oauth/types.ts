import type { OAuthProvider } from '../../types/domain';

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  displayName: string;
  username?: string;
  email: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
}

export interface AuthUrlInput {
  state: string;
  codeChallenge: string;
  nonce: string;
}

export interface ExchangeInput {
  code: string;
  codeVerifier: string;
  nonce: string;
}

export interface OAuthProviderAdapter {
  readonly id: OAuthProvider;
  isConfigured(): boolean;
  buildAuthUrl(input: AuthUrlInput): string;
  exchange(input: ExchangeInput): Promise<OAuthProfile>;
}
