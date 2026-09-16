import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import routes from './routes.js';
import { startNightlyJob, runSnapshots } from './cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

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
const distDir =
  process.env.STATIC_DIR ||
  path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`wheel server listening on :${port}`);
  if (process.env.RUN_SNAPSHOT_NOW === '1') runSnapshots();
  startNightlyJob();
});
