import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Mounts every handler under /api directly, mirroring Vercel's file-based routing,
// without going through `vercel dev`'s framework auto-detection (which recurses /
// breaks on Windows for this hybrid Vite + functions layout). Production deploys
// on Vercel still use the real @vercel/node runtime for these same files unchanged.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, '..', 'api');

function listApiFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    if (entry.name === 'lib') continue; // helpers only, never routes
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files = files.concat(listApiFiles(full, rel));
    } else if (entry.name.endsWith('.js')) {
      files.push({ file: full, route: `/api/${rel.replace(/\.js$/, '')}` });
    }
  }
  return files;
}

async function main() {
  const requiredEnvVars = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SESSION_SECRET', 'ADMIN_TOKEN'];
  const missing = requiredEnvVars.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`Warning: missing env vars: ${missing.join(', ')} (check your .env file)`);
  }

  const app = express();
  app.use(express.json());

  const files = listApiFiles(apiDir);
  for (const { file, route } of files) {
    const mod = await import(pathToFileURL(file).href);
    const handler = mod.default;
    if (typeof handler !== 'function') {
      console.warn(`Skipping ${route}: no default export function`);
      continue;
    }
    app.all(route, (req, res) => {
      Promise.resolve(handler(req, res)).catch((err) => {
        console.error(`Unhandled error in ${route}:`, err);
        if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
      });
    });
    console.log(`Mounted ${route}`);
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`\nLocal API dev server running at http://localhost:${port}`);
    console.log('Run `npm run dev:web` in another terminal for the frontend (proxies /api here).\n');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
