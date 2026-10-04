import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

import { tooManyRequests } from './responses';
import type { AppEnv } from '../types';

// In-memory sliding window. State is per Worker isolate, so this is a best-effort
// brake against bursts, not a global limit. Use Cloudflare's rate limiting rules
// for hard guarantees.
const buckets = new Map<string, number[]>();
let lastSweep = 0;

function sweep(now: number, windowMs: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    const recent = hits.filter((t) => now - t < windowMs);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}

/**
 * `keyFn` chooses what is limited. By default that is the client IP; pass e.g.
 * `(c) => String(c.get('userId'))` (after requireAuth) to limit per user instead.
 */
export function rateLimit(
  name: string,
  max: number,
  windowMs = 60_000,
  keyFn?: (c: Context<AppEnv>) => string,
) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
    const key = `${name}:${keyFn ? keyFn(c) : ip}`;
    const now = Date.now();
    sweep(now, windowMs);

    const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      buckets.set(key, hits);
      return tooManyRequests('rate_limited');
    }
    hits.push(now);
    buckets.set(key, hits);
    await next();
  });
}
