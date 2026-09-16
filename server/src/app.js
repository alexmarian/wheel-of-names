import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import routes from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Caddy is the single reverse proxy in front of the container; trusting one
  // hop makes req.ip the real client, which the brute-force throttle keys on.
  app.set('trust proxy', 1);

  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins.includes('*')
        ? true
        : (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
    })
  );
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', routes);

  // Static SPA (client/dist) — served by the same Node process in prod.
  const distDir = process.env.STATIC_DIR || path.resolve(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  return app;
}
