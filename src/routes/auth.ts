import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';

import { hashPassword, verifyPassword } from '../auth/password';
import { signJWT } from '../auth/jwt';
import { requireAuth } from '../auth/middleware';
import { createUser, findUserByEmail, isUniqueViolation, listAddressesForUser, updateUserPrefs } from '../db';
import { rateLimit } from '../utils/rateLimit';
import { badRequest, conflict, ok, unauthorized, serverError } from '../utils/responses';
import { loginSchema, preferencesSchema, signupSchema } from '../utils/validation';
import type { AppEnv, PublicUser, User } from '../types';

const SESSION_SECONDS = 60 * 60 * 24 * 7;

const auth = new Hono<AppEnv>();

function publicUser(u: User): PublicUser {
  const { password_hash: _omit, ...rest } = u;
  return rest;
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// Verifying against a throwaway hash when the email is unknown keeps response time
// similar, so timing doesn't reveal which emails are registered.
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('not-a-real-password');
  return dummyHash;
}

async function startSession(c: import('hono').Context<AppEnv>, user: User): Promise<void> {
  const token = await signJWT({ sub: String(user.id) }, c.env.JWT_SECRET, SESSION_SECONDS);
  c.header('Cache-Control', 'no-store');
  setCookie(c, 'session', token, {
    httpOnly: true,
    // Browsers treat localhost as a secure context, but plain-http dev setups (e.g. a LAN IP) need this off.
    secure: c.env.ENVIRONMENT !== 'development',
    sameSite: 'Strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

auth.post('/signup', rateLimit('signup', 10), async (c) => {
  const parsed = signupSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return badRequest(field === 'password' ? 'weak_password' : 'invalid_input');
  }
  const { email, password, language, theme } = parsed.data;

  if (await findUserByEmail(c.env.DB, email)) return conflict('email_exists');

  try {
    const user = await createUser(c.env.DB, email, await hashPassword(password), language ?? 'en', theme ?? 'dark');
    if (!user) return serverError('create_failed');
    await startSession(c, user);
    // c.json (not a hand-built Response) so the Set-Cookie header queued by startSession is included.
    return c.json({ success: true, data: { user: publicUser(user) } }, 201);
  } catch (err) {
    if (isUniqueViolation(err)) return conflict('email_exists');
    throw err;
  }
});

auth.post('/login', rateLimit('login', 10), async (c) => {
  const parsed = loginSchema.safeParse(await readJson(c.req.raw));
  // Same generic message for malformed input, unknown email and wrong password.
  if (!parsed.success) return unauthorized('invalid_credentials');
  const { email, password } = parsed.data;

  const user = await findUserByEmail(c.env.DB, email);
  const valid = await verifyPassword(password, user ? user.password_hash : await getDummyHash());
  if (!user || !valid) return unauthorized('invalid_credentials');

  await startSession(c, user);
  return c.json({ success: true, data: { user: publicUser(user) } });
});

auth.post('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' });
  return c.json({ success: true, data: { loggedOut: true } });
});

auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const addresses = await listAddressesForUser(c.env.DB, user.id);
  return ok({ user: publicUser(user), addresses, domain: c.env.DOMAIN });
});

auth.patch('/preferences', requireAuth, async (c) => {
  const parsed = preferencesSchema.safeParse(await readJson(c.req.raw));
  if (!parsed.success) return badRequest('invalid_input');
  await updateUserPrefs(c.env.DB, c.get('userId'), parsed.data);
  return ok({ updated: true });
});

export default auth;
