import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

import { findUserById } from '../db';
import { unauthorized } from '../utils/responses';
import { verifyJWT } from './jwt';
import type { AppEnv } from '../types';

/**
 * Authenticates a request via `Authorization: Bearer <jwt>` or the `session` cookie.
 * The user is re-loaded from D1 on every request so deleted accounts lose access immediately.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const bearer = header && header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const token = bearer ?? getCookie(c, 'session') ?? null;
  if (!token) return unauthorized('unauthorized');

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return unauthorized('unauthorized');

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) return unauthorized('unauthorized');

  const user = await findUserById(c.env.DB, userId);
  if (!user) return unauthorized('unauthorized');

  c.set('user', user);
  c.set('userId', user.id);
  await next();
});
