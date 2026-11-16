import { logger } from './config/logger';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
  void (async () => {
    try {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { getNodeAutoInstrumentations } =
        await import('@opentelemetry/auto-instrumentations-node');
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

      const sdk = new NodeSDK({
        serviceName: process.env.OTEL_SERVICE_NAME ?? 'wishlist-api',
        traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }),
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ],
      });

      sdk.start();
      logger.info({ endpoint }, 'OpenTelemetry tracing enabled');

      const shutdown = (): void => {
        void sdk.shutdown().finally(() => process.exit(0));
      };
      process.once('SIGTERM', shutdown);
      process.once('SIGINT', shutdown);
    } catch (error) {
      logger.warn({ err: error }, 'OpenTelemetry failed to start');
    }
  })();
}
