import { randomUUID } from 'node:crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './env';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (env.nodeEnv === 'production' ? 'info' : 'debug'),
  base: { service: 'wishlist-api', env: env.nodeEnv },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'refreshToken',
    ],
    censor: '[redacted]',
  },
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req) => {
      const url = req.url ?? '';
      return (
        url.startsWith('/metrics') ||
        url.startsWith('/socket.io') ||
        url.startsWith('/assets/') ||
        url.startsWith('/api/health')
      );
    },
  },
});
