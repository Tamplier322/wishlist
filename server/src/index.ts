import './instrumentation';
import { createServer as createHttpServer } from 'node:http';
import { initDatabase } from './config/database';
import { env } from './config/env';
import { startKeepAlive } from './config/keep-alive';
import { logger } from './config/logger';
import { assertSecureConfig } from './config/security';
import { cleanupExpiredTokens } from './services/refresh-token.service';
import { createServer } from './app';

const TOKEN_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

function startTokenCleanup(): void {
  void cleanupExpiredTokens();
  const timer = setInterval(() => {
    void cleanupExpiredTokens();
  }, TOKEN_CLEANUP_INTERVAL_MS);
  timer.unref();
}

async function main(): Promise<void> {
  assertSecureConfig();
  await initDatabase();

  const httpServer = createHttpServer();
  const app = createServer(httpServer);

  httpServer.on('request', app);
  httpServer.listen(env.port, () => {
    logger.info(
      { port: env.port, env: env.nodeEnv, db: env.dbDriver },
      'Wishlist server started (+ Socket.IO)',
    );
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandledRejection');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  startKeepAlive();
  startTokenCleanup();
}

main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
