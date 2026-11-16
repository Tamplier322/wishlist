import { createServer as createHttpServer } from 'node:http';
import { initDatabase } from './config/database';
import { env } from './config/env';
import { startKeepAlive } from './config/keep-alive';
import { createServer } from './app';

async function main(): Promise<void> {
  await initDatabase();

  const httpServer = createHttpServer();
  const app = createServer(httpServer);

  httpServer.on('request', app);
  httpServer.listen(env.port, () => {
    console.log(`🎁 Wishlist server: http://localhost:${env.port} [${env.nodeEnv}] (+ Socket.IO)`);
  });


  process.on('uncaughtException', (error) => {
    console.error('uncaughtException:', error);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection:', reason);
  });

  startKeepAlive();
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
