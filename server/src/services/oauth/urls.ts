import { env } from '../../config/env';
import type { OAuthProvider } from '../../types/domain';

export function callbackUrl(provider: OAuthProvider): string {
  return `${env.apiPublicUrl}/api/auth/oauth/${provider}/callback`;
}
