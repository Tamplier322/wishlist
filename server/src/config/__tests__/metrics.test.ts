/// <reference types="vitest/globals" />
import { httpRequestDuration, httpRequestsTotal, metricsRegistry } from '../metrics';

describe('Prometheus metrics', () => {
  it('отдают HTTP-метрики в формате Prometheus', async () => {
    httpRequestsTotal.inc({ method: 'GET', route: '/api/test', status: '200' });
    httpRequestDuration.observe({ method: 'GET', route: '/api/test', status: '200' }, 0.2);

    const text = await metricsRegistry.metrics();

    expect(text).toContain('wishlist_http_requests_total');
    expect(text).toContain('wishlist_http_request_duration_seconds');
    expect(text).toContain('route="/api/test"');
  });

  it('собирает системные метрики процесса', async () => {
    const text = await metricsRegistry.metrics();
    expect(text).toContain('wishlist_process_cpu_user_seconds_total');
  });
});
