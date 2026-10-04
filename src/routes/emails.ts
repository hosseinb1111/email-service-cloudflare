import { Hono } from 'hono';
import { z } from 'zod';

import { requireAuth } from '../auth/middleware';
import { deleteEmail, getEmailById, listEmails, markEmailRead } from '../db';
import { badRequest, notFound, ok } from '../utils/responses';
import type { AppEnv, AttachmentMeta } from '../types';

const emails = new Hono<AppEnv>();
emails.use('*', requireAuth);

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.enum(['true', 'false']).default('false'),
  address: z.string().trim().toLowerCase().max(254).optional(),
});

emails.get('/', async (c) => {
  const parsed = listQuery.safeParse(c.req.query());
  if (!parsed.success) return badRequest('invalid_query');
  const { limit, offset, unreadOnly, address } = parsed.data;
  const result = await listEmails(c.env.DB, c.get('userId'), {
    limit,
    offset,
    unreadOnly: unreadOnly === 'true',
    address,
  });
  return ok(result);
});

emails.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return badRequest('invalid_id');

  // The query JOINs addresses filtered by user_id, so other users' mail is a 404.
  const row = await getEmailById(c.env.DB, id, c.get('userId'));
  if (!row) return notFound('not_found');

  let attachments: AttachmentMeta[] = [];
  try {
    attachments = row.attachments ? (JSON.parse(row.attachments) as AttachmentMeta[]) : [];
  } catch {
    attachments = [];
  }
  const { raw_headers: rawSource, attachments: _att, ...rest } = row;
  // When no readable body was stored, expose the raw source so the viewer is never blank.
  const hasBody = (row.text_body ?? '').trim() !== '' || (row.html_body ?? '').trim() !== '';
  const raw = !hasBody && rawSource ? rawSource.slice(0, 200_000) : null;
  return ok({ email: { ...rest, attachments, raw } });
});

emails.patch('/:id/read', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return badRequest('invalid_id');
  const body = (await c.req.json().catch(() => ({}))) as { read?: unknown };
  const read = body.read === false ? false : true; // default: mark as read
  const changed = await markEmailRead(c.env.DB, id, c.get('userId'), read);
  return changed ? ok({ read }) : notFound('not_found');
});

emails.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return badRequest('invalid_id');
  const deleted = await deleteEmail(c.env.DB, id, c.get('userId'));
  return deleted ? ok({ deleted: true }) : notFound('not_found');
});

export default emails;
