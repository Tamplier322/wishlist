import type { NextFunction, Request, Response } from 'express';
import client from 'prom-client';
import { env } from './env';

export const metricsRegistry = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegistry, prefix: 'wishlist_' });

export const httpRequestsTotal = new client.Counter({
  name: 'wishlist_http_requests_total',
  help: 'Всего HTTP-запросов',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [metricsRegistry],
});

export const httpRequestDuration = new client.Histogram({
  name: 'wishlist_http_request_duration_seconds',
  help: 'Длительность HTTP-запросов',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

export const offersProviderErrors = new client.Counter({
  name: 'wishlist_offers_provider_errors_total',
  help: 'Ошибки провайдеров предложений',
  labelNames: ['provider'] as const,
  registers: [metricsRegistry],
});

export const offlineQueueDepth = new client.Gauge({
  name: 'wishlist_offline_queue_depth',
  help: 'Количество отложенных мутаций клиента (сообщается клиентом)',
  registers: [metricsRegistry],
});

function routeLabel(req: Request): string {
  const route = (req as Request & { route?: { path?: string } }).route;
  if (route?.path) return `${req.baseUrl ?? ''}${route.path}`;
  return req.path;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const stopTimer = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = { method: req.method, route: routeLabel(req), status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    stopTimer(labels);
  });
  next();
}

export async function metricsHandler(req: Request, res: Response): Promise<void> {
  if (env.metricsToken && req.query.token !== env.metricsToken) {
    res.status(401).json({ message: 'Требуется токен метрик', code: 'UNAUTHORIZED' });
    return;
  }
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  } catch (error) {
    res.status(500).json({ message: 'Не удалось собрать метрики', error: String(error) });
  }
}
