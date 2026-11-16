import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { badRequest } from './errors';


function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) return isPrivateIpv4(normalized.slice(7));
  if (normalized.startsWith('2001:db8')) return true;
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home', '.lan'];

interface SafeTarget {
  url: URL;
  address: string;
  family: number;
}

export interface SafeFetchOptions {
  allowHttp?: boolean;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  url: string;
}

async function resolveSafe(rawUrl: string, allowHttp: boolean): Promise<SafeTarget> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw badRequest('Некорректная ссылка');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw badRequest('Разрешены только http(s)-ссылки');
  }
  if (url.protocol === 'http:' && !allowHttp) {
    throw badRequest('Разрешены только https-ссылки');
  }
  if (url.username || url.password) {
    throw badRequest('Ссылка не должна содержать учётные данные');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === 'metadata.google.internal' ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw badRequest('Адрес запрещён');
  }

  const literalVersion = isIP(hostname);
  if (literalVersion !== 0) {
    if (isPrivateIp(hostname)) throw badRequest('Приватные адреса запрещены');
    return { url, address: hostname, family: literalVersion };
  }

  const addresses = await import('node:dns').then(({ promises }) =>
    promises.lookup(hostname, { all: true, verbatim: true }),
  );
  if (addresses.length === 0 || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw badRequest('Адрес недоступен или ведёт в приватную сеть');
  }
  return { url, address: addresses[0].address, family: addresses[0].family };
}

function requestOnce(target: SafeTarget, options: SafeFetchOptions): Promise<SafeFetchResult> {
  return new Promise((resolve, reject) => {
    const transport = target.url.protocol === 'https:' ? https : http;
    const request = transport.request(
      {
        protocol: target.url.protocol,
        hostname: target.url.hostname,
        port: target.url.port || undefined,
        path: `${target.url.pathname}${target.url.search}`,
        method: 'GET',
        headers: {
          'User-Agent': 'WishlistBot/1.0 (+https://wishlist.app)',
          Accept: '*/*',
          ...options.headers,
          Host: target.url.host,
        },
        lookup: (_hostname, lookupOptions, callback) => {
          const done = callback as unknown as (
            error: NodeJS.ErrnoException | null,
            address: string | Array<{ address: string; family: number }>,
            family?: number,
          ) => void;
          if (lookupOptions && (lookupOptions as { all?: boolean }).all) {
            done(null, [{ address: target.address, family: target.family }]);
            return;
          }
          done(null, target.address, target.family);
        },
        servername: target.url.hostname,
        timeout: options.timeoutMs ?? 10_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        const limit = options.maxBytes ?? 2 * 1024 * 1024;
        let total = 0;

        response.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > limit) {
            request.destroy(new Error('RESPONSE_TOO_LARGE'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
            url: target.url.toString(),
          });
        });
        response.on('error', reject);
      },
    );

    request.on('timeout', () => request.destroy(new Error('TIMEOUT')));
    request.on('error', reject);
    request.end();
  });
}

export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const allowHttp = options.allowHttp ?? false;
  const maxRedirects = options.maxRedirects ?? 3;
  let current = rawUrl;

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const target = await resolveSafe(current, allowHttp);
    const result = await requestOnce(target, options);
    const location = result.headers.location;
    const isRedirect = [301, 302, 303, 307, 308].includes(result.status);
    if (isRedirect && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return result;
  }

  throw badRequest('Слишком много перенаправлений');
}
