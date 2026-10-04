import { Hono } from 'hono';

import { requireAuth } from '../auth/middleware';
import { countSentSince, findAddressByAddress, logSent } from '../db';
import { rateLimit } from '../utils/rateLimit';
import { badRequest, forbidden, ok, tooManyRequests } from '../utils/responses';
import { MAX_SENT_PER_DAY, sendSchema } from '../utils/validation';
import type { AppEnv } from '../types';

type SendErrorStatus = 400 | 403 | 413 | 422 | 429 | 502 | 503;

/**
 * Cloudflare Email Service error codes -> HTTP status + UI error key.
 * Only real upstream failures stay 502; setup problems and rejected input get their own status
 * and message so the cause is obvious. Codes: developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */
const SEND_ERROR_MAP: Record<string, { status: SendErrorStatus; error: string }> = {
  // The sending domain isn't ready (not onboarded / DNS not verified yet).
  E_SENDER_NOT_VERIFIED: { status: 503, error: 'sender_not_verified' },
  E_SENDER_DOMAIN_NOT_AVAILABLE: { status: 503, error: 'sender_not_verified' },
  // Before the domain is onboarded, Email Service only delivers to verified account addresses.
  E_RECIPIENT_NOT_ALLOWED: { status: 403, error: 'recipient_not_allowed' },
  E_RECIPIENT_SUPPRESSED: { status: 422, error: 'recipient_suppressed' },
  // The provider rejected the message itself.
  E_VALIDATION_ERROR: { status: 422, error: 'send_rejected' },
  E_FIELD_MISSING: { status: 422, error: 'send_rejected' },
  E_TOO_MANY_RECIPIENTS: { status: 422, error: 'send_rejected' },
  E_HEADER_NOT_ALLOWED: { status: 422, error: 'send_rejected' },
  E_HEADER_USE_API_FIELD: { status: 422, error: 'send_rejected' },
  E_HEADER_VALUE_INVALID: { status: 422, error: 'send_rejected' },
  E_HEADER_VALUE_TOO_LONG: { status: 422, error: 'send_rejected' },
  E_HEADER_NAME_INVALID: { status: 422, error: 'send_rejected' },
  E_HEADERS_TOO_LARGE: { status: 422, error: 'send_rejected' },
  E_HEADERS_TOO_MANY: { status: 422, error: 'send_rejected' },
  E_CONTENT_TOO_LARGE: { status: 413, error: 'content_too_large' },
  // Limits.
  E_RATE_LIMIT_EXCEEDED: { status: 429, error: 'provider_rate_limited' },
  E_DAILY_LIMIT_EXCEEDED: { status: 429, error: 'provider_daily_limit' },
  // Genuine upstream problems.
  E_DELIVERY_FAILED: { status: 502, error: 'delivery_failed' },
  E_INTERNAL_SERVER_ERROR: { status: 502, error: 'send_failed' },
};

const send = new Hono<AppEnv>();

// Limited per user (not per IP): 10 messages a minute, plus a daily cap below.
send.post(
  '/',
  requireAuth,
  rateLimit('send', 10, 60_000, (c) => String(c.get('userId'))),
  async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return badRequest('invalid_input');
    const { from, to, subject, text } = parsed.data;
    const userId = c.get('userId');

    // Ownership check: you can only send from an address you have claimed.
    const owned = await findAddressByAddress(c.env.DB, from);
    if (!owned || owned.user_id !== userId) return forbidden('not_your_address');

    const since = Math.floor(Date.now() / 1000) - 86_400;
    if ((await countSentSince(c.env.DB, userId, since)) >= MAX_SENT_PER_DAY) {
      return tooManyRequests('daily_limit');
    }

    if (!c.env.EMAIL) return c.json({ success: false, error: 'sending_unavailable' }, 503);

    try {
      const result = await c.env.EMAIL.send({ from, to, subject, text, replyTo: from });
      const messageId = result?.messageId ?? null;
      // The mail is already sent at this point: a logging failure must not be reported as a send
      // failure (the user would retry and send a duplicate).
      try {
        await logSent(c.env.DB, { userId, from, to, subject, messageId });
      } catch (logErr) {
        console.error('sent_log write failed', logErr instanceof Error ? logErr.message : logErr);
      }
      return ok({ messageId });
    } catch (err) {
      const code = (err as { code?: string } | null)?.code ?? '';
      // The real provider code + message always go to the Worker logs (`npx wrangler tail`).
      console.error('send failed', code || '(no code)', err instanceof Error ? err.message : err);
      const mapped = SEND_ERROR_MAP[code] ?? { status: 502, error: 'send_failed' };
      // `code` is included so the cause is visible in the browser's Network tab as well.
      return c.json({ success: false, error: mapped.error, code: code || undefined }, mapped.status);
    }
  },
);

export default send;
