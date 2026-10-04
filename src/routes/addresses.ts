import { Hono } from 'hono';

import { requireAuth } from '../auth/middleware';
import {
  claimAddress,
  countAddressesForUser,
  findAddressByAddress,
  listAddressesForUser,
  releaseAddress,
} from '../db';
import { rateLimit } from '../utils/rateLimit';
import { badRequest, conflict, created, notFound, ok } from '../utils/responses';
import {
  claimAddressSchema,
  isReserved,
  localPartSchema,
  MAX_ADDRESSES_PER_USER,
} from '../utils/validation';
import type { AppEnv } from '../types';

const addresses = new Hono<AppEnv>();

// Public availability check. Registered BEFORE the requireAuth middleware below,
// so it stays unauthenticated but rate limited.
addresses.get('/check', rateLimit('check', 30), async (c) => {
  const parsed = localPartSchema.safeParse(c.req.query('localPart') ?? '');
  if (!parsed.success) return ok({ available: false, reason: 'invalid' });
  if (isReserved(parsed.data)) return ok({ available: false, reason: 'reserved' });

  const existing = await findAddressByAddress(c.env.DB, `${parsed.data}@${c.env.DOMAIN}`);
  return existing ? ok({ available: false, reason: 'taken' }) : ok({ available: true });
});

addresses.use('*', requireAuth);

addresses.get('/', async (c) => ok({ addresses: await listAddressesForUser(c.env.DB, c.get('userId')) }));

addresses.post('/', async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = claimAddressSchema.safeParse(body);
  if (!parsed.success) return badRequest('invalid_local_part');

  const userId = c.get('userId');
  const { localPart } = parsed.data;

  if (isReserved(localPart)) return badRequest('reserved');
  if ((await countAddressesForUser(c.env.DB, userId)) >= MAX_ADDRESSES_PER_USER) {
    return badRequest('max_addresses');
  }
  if (await findAddressByAddress(c.env.DB, `${localPart}@${c.env.DOMAIN}`)) return conflict('taken');

  const result = await claimAddress(c.env.DB, userId, localPart, c.env.DOMAIN);
  if (!result.ok) return conflict('taken');
  return created({ address: result.address });
});

addresses.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return badRequest('invalid_id');
  // releaseAddress only matches rows owned by this user (ownership check).
  const released = await releaseAddress(c.env.DB, c.get('userId'), id);
  return released ? ok({ released: true }) : notFound('not_found');
});

export default addresses;
