import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Dev-only save endpoint for the slide deck's edit mode (public/slides/index.html,
// press Shift+E). The deck POSTs its full edited source here and we write it back to
// disk, so edits land in the file and can be committed. `apply: 'serve'` keeps this
// out of the Vercel build entirely.
function slidesEditor() {
  const file = fileURLToPath(new URL('./public/slides/index.html', import.meta.url));
  return {
    name: 'slides-editor',
    apply: 'serve',
    configureServer(server) {
      // /slides and /slides/ would otherwise hit the SPA fallback and show the app.
      server.middlewares.use((req, res, next) => {
        const [path, query] = req.url.split('?');
        if (path !== '/slides' && path !== '/slides/') return next();
        res.writeHead(302, { Location: '/slides/index.html' + (query ? '?' + query : '') });
        res.end();
      });
      server.middlewares.use('/__slides/save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        let body = '';
        req.setEncoding('utf8');
        req.on('data', (c) => { body += c; if (body.length > 5e6) req.destroy(); });
        req.on('end', () => {
          if (!body.includes('id="pw-deck"')) { res.statusCode = 400; return res.end('not the slide deck'); }
          fs.writeFileSync(file, body);
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), slidesEditor()],
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
