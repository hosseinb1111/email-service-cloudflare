import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { handleEmail } from './email/handler';
import addressRoutes from './routes/addresses';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import sendRoutes from './routes/send';
import { notFound, serverError } from './utils/responses';
import type { AppEnv, Env } from './types';

const app = new Hono<AppEnv>();

// CORS: the UI is served from the same origin in production, so no CORS headers are needed.
// In development the wrangler dev origin is explicitly allowed.
app.use('/api/*', async (c, next) => {
  if (c.env.ENVIRONMENT === 'development') {
    return cors({ origin: 'http://localhost:8787', credentials: true })(c, next);
  }
  await next();
});

// Security headers for API responses. (The CSP for the HTML pages lives in public/_headers.)
app.use('/api/*', async (c, next) => {
  await next();
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
});

app.get('/api/health', (c) => c.json({ success: true, data: { status: 'ok' } }));

app.route('/api/auth', authRoutes);
app.route('/api/addresses', addressRoutes);
app.route('/api/emails', emailRoutes);
app.route('/api/send', sendRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return notFound('not_found');
  // Anything else belongs to the static site (single-page-application fallback).
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((err) => {
  console.error('unhandled error', err instanceof Error ? err.message : err);
  return serverError('server_error');
});

export default {
  fetch: app.fetch,
  email: handleEmail,
} satisfies ExportedHandler<Env>;
