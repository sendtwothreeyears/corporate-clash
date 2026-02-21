import { serveStatic } from 'hono/bun';
import app from './index.js';

// Serve Vite-built static files for any route not matched by the API
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback: serve index.html for client-side routes
app.get('*', serveStatic({ root: './dist', path: 'index.html' }));

const port = Number(process.env.PORT) || 3000;

const hostname = process.env.HOST || '0.0.0.0';

Bun.serve({
  port,
  hostname,
  fetch: app.fetch,
});

console.log(`Server running at http://${hostname}:${port}`);
