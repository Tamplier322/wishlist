import { isProduction } from '../../config/env';

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}

export function buildCookie(name: string, value: string, maxAgeSec: number): string {
  const flags = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/api/auth/oauth',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isProduction) flags.push('Secure');
  return flags.join('; ');
}

export function clearCookie(name: string): string {
  const flags = [`${name}=`, 'Path=/api/auth/oauth', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProduction) flags.push('Secure');
  return flags.join('; ');
}
