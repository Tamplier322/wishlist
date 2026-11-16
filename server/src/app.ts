import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import sharp from 'sharp';
import { env, isProduction } from './config/env';
import { httpLogger } from './config/logger';
import { metricsHandler, metricsMiddleware } from './config/metrics';
import { isSupportedImage, uploadsStaticPath } from './config/uploads';
import { verifyUploadRequest } from './utils/signed-url';
import { badRequest } from './utils/errors';
import { safeFetch } from './utils/ssrf';
import { errorMiddleware } from './middlewares/error.middleware';
import { createRateLimiter } from './middlewares/rate-limit.middleware';
import { findWishlistBySlug } from './repositories/wishlist.repository';
import routes from './routes';
import { initSocket } from './socket/index';


function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '\u0026amp;',
    '<': '\u0026lt;',
    '>': '\u0026gt;',
    '"': '\u0026quot;',
    "'": '\u0026#39;',
  };
  return value.replace(/[&<>"']/g, (character) => map[character] ?? character);
}

async function renderSharedPage(slug: string, indexPath: string): Promise<string | null> {
  const wishlist = await findWishlistBySlug(slug);
  if (!wishlist || !wishlist.isShared) return null;

  const title = `${wishlist.name} — Wishlist`;
  const description = wishlist.description?.trim() || 'Публичный список желаний';
  let html = fs.readFileSync(indexPath, 'utf8');

  const replaceMeta = (key: string, content: string): void => {
    const pattern = new RegExp(`<meta (?:property|name)="${key}" content="[^"]*"\\s*/?>`);
    html = html.replace(pattern, `<meta property="${key}" content="${escapeHtml(content)}" />`);
  };

  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  replaceMeta('og:title', title);
  replaceMeta('og:description', description);
  replaceMeta('twitter:title', title);
  replaceMeta('twitter:description', description);
  return html;
}

function serveClient(app: Express): void {

  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  if (!fs.existsSync(clientDist)) return;
  const indexPath = path.join(clientDist, 'index.html');

  app.use(express.static(clientDist));

  app.get('/s/:slug', async (req, res, next) => {
    try {
      const html = await renderSharedPage(req.params.slug, indexPath);
      if (html === null) {
        next();
        return;
      }
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=300');
      res.send(html);
    } catch (error) {
      next(error);
    }
  });

  app.get('*', (_req, res) => {
    res.sendFile(indexPath);
  });
}

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  if (isProduction) app.set('trust proxy', 1);

  const allowedOrigins = new Set(env.corsOrigins);

  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    connectSrc: ["'self'", 'https://open.er-api.com', 'wss:', 'ws:'],
    frameSrc: ["'self'", 'https://oauth.telegram.org', 'https://t.me'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
    ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
  };

  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? { directives: cspDirectives, useDefaults: false }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProduction
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      maxAge: 86_400,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));

  app.use('/api/auth', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  app.use(httpLogger);
  app.use(metricsMiddleware);
  app.get('/metrics', metricsHandler);


  const imageCacheDir = path.join(uploadsStaticPath(), 'proxy-cache');
  fs.mkdirSync(imageCacheDir, { recursive: true });
  const imageProxyLimiter = createRateLimiter(60, 60_000, 'image-proxy');
  const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

  app.get('/image-proxy', imageProxyLimiter, async (req, res, next) => {
    try {
      const target = String(req.query.url ?? '');
      if (!/^https:\/\//.test(target)) {
        res.status(400).json({ message: 'Только https-ссылки' });
        return;
      }

      const widthRaw = Number(req.query.w ?? 0);
      const width = Number.isFinite(widthRaw) ? Math.min(1600, Math.max(0, Math.round(widthRaw))) : 0;
      const wantWebp = req.query.format === 'webp';

      const key = createHash('sha1')
        .update(`${target}|${width}|${wantWebp ? 'webp' : 'orig'}`)
        .digest('hex');
      const cachedPath = path.join(imageCacheDir, `${key}.img`);
      const metaPath = path.join(imageCacheDir, `${key}.type`);

      if (fs.existsSync(cachedPath)) {
        const type = fs.existsSync(metaPath) ? fs.readFileSync(metaPath, 'utf8') : 'image/jpeg';
        res.set('Content-Type', type);
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'public, max-age=86400, immutable');
        res.sendFile(cachedPath);
        return;
      }

      const response = await safeFetch(target, { maxBytes: 8 * 1024 * 1024, timeoutMs: 10_000 });
      if (response.status < 200 || response.status >= 300) {
        res.status(404).json({ message: 'Картинка не найдена' });
        return;
      }

      const declaredType = String(response.headers['content-type'] ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(declaredType) || !isSupportedImage(response.body.subarray(0, 16))) {
        res.status(415).json({ message: 'Ссылка ведёт не на изображение' });
        return;
      }

      let buffer = response.body;
      let contentType = declaredType;

      if (width > 0 || wantWebp) {
        try {
          let pipeline = sharp(buffer).rotate();
          if (width > 0) pipeline = pipeline.resize({ width, withoutEnlargement: true });
          buffer = wantWebp ? await pipeline.webp({ quality: 78 }).toBuffer() : await pipeline.toBuffer();
          if (wantWebp) contentType = 'image/webp';
        } catch {
        }
      }

      fs.writeFileSync(cachedPath, buffer);
      fs.writeFileSync(metaPath, contentType);
      res.set('Content-Type', contentType);
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Disposition', 'inline');
      res.set('Cache-Control', 'public, max-age=86400, immutable');
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
    const safeName = path.basename(file);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.set('Content-Disposition', `inline; filename="${safeName}"`);
    res.sendFile(path.join(uploadsStaticPath(), safeName), (error) => {
      if (error) next(badRequest('Файл не найден'));
    });
  });

  app.use('/api', createRateLimiter(600, 60_000, 'api'));
  app.use('/api', routes);
  serveClient(app);

  app.use(errorMiddleware);
  return app;
}


export function createServer(httpServer: import('node:http').Server): Express {
  initSocket(httpServer);
  return createApp();
}
