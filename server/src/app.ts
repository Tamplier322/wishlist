import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env';
import { uploadsStaticPath } from './config/uploads';
import { verifyUploadRequest } from './utils/signed-url';
import { badRequest } from './utils/errors';
import { errorMiddleware } from './middlewares/error.middleware';
import routes from './routes';
import { initSocket } from './socket/index';


function serveClient(app: Express): void {

  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  if (!fs.existsSync(clientDist)) return;

  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export function createApp(): Express {
  const app = express();


  app.use((req, _res, next) => {
    if (req.url.startsWith('/socket.io')) return;
    next();
  });

  app.use(cors({ origin: env.corsOrigins.length > 0 ? env.corsOrigins : true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));


  const imageCacheDir = path.join(uploadsStaticPath(), 'proxy-cache');
  fs.mkdirSync(imageCacheDir, { recursive: true });
  app.get('/image-proxy', async (req, res, next) => {
    try {
      const target = String(req.query.url ?? '');
      if (!/^https:\/\//.test(target)) {
        res.status(400).json({ message: 'Только https-ссылки' });
        return;
      }
      const key = createHash('sha1').update(target).digest('hex');
      const cachedPath = path.join(imageCacheDir, `${key}`);
      if (fs.existsSync(cachedPath)) {
        res.sendFile(cachedPath);
        return;
      }
      const response = await fetch(target);
      if (!response.ok) {
        res.status(404).json({ message: 'Картинка не найдена' });
        return;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(cachedPath, buffer);
      res.set('Content-Type', response.headers.get('content-type') ?? 'image/jpeg');
      res.send(buffer);
    } catch {
      next(badRequest('Не удалось загрузить картинку'));
    }
  });


  app.get('/uploads/:file', (req, res, next) => {
    const file = req.params.file;
    const exp = req.query.exp as string | undefined;
    const sig = req.query.sig as string | undefined;
    if (!verifyUploadRequest(file, exp, sig)) {
      res.status(403).json({ message: 'Ссылка недействительна или устарела' });
      return;
    }
    res.sendFile(path.join(uploadsStaticPath(), path.basename(file)), (error) => {
      if (error) next(badRequest('Файл не найден'));
    });
  });

  app.use('/api', routes);
  serveClient(app);

  app.use(errorMiddleware);
  return app;
}


export function createServer(httpServer: import('node:http').Server): Express {
  initSocket(httpServer);
  return createApp();
}
