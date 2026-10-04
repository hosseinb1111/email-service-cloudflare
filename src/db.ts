// Typed D1 helpers. Every query is a prepared statement with bound parameters.

import type { Address, EmailListItem, EmailRow, Lang, Theme, User } from './types';

// ---------- users ----------

export async function createUser(
  db: D1Database,
  email: string,
  passwordHash: string,
  language: Lang = 'en',
  theme: Theme = 'dark',
): Promise<User | null> {
  const row = await db
    .prepare(
      'INSERT INTO users (email, password_hash, language, theme) VALUES (?, ?, ?, ?) RETURNING *',
    )
    .bind(email, passwordHash, language, theme)
    .first<User>();
  return row ?? null;
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
}

export async function findUserById(db: D1Database, id: number): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function updateUserPrefs(
  db: D1Database,
  userId: number,
  prefs: { language?: Lang; theme?: Theme },
): Promise<void> {
  // COALESCE keeps the existing value when a field is omitted.
  await db
    .prepare('UPDATE users SET language = COALESCE(?, language), theme = COALESCE(?, theme) WHERE id = ?')
    .bind(prefs.language ?? null, prefs.theme ?? null, userId)
    .run();
}

// ---------- addresses ----------

export type ClaimResult = { ok: true; address: Address } | { ok: false; reason: 'taken' };

export async function countAddressesForUser(db: D1Database, userId: number): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?')
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function claimAddress(
  db: D1Database,
  userId: number,
  localPart: string,
  domain: string,
): Promise<ClaimResult> {
  const address = `${localPart}@${domain}`.toLowerCase();
  const isPrimary = (await countAddressesForUser(db, userId)) === 0 ? 1 : 0;
  try {
    const row = await db
      .prepare(
        'INSERT INTO addresses (user_id, address, local_part, is_primary) VALUES (?, ?, ?, ?) RETURNING *',
      )
      .bind(userId, address, localPart.toLowerCase(), isPrimary)
      .first<Address>();
    if (!row) return { ok: false, reason: 'taken' };
    return { ok: true, address: row };
  } catch (err) {
    // The UNIQUE index is the source of truth; this catches the race between
    // the availability check and the insert.
    if (isUniqueViolation(err)) return { ok: false, reason: 'taken' };
    throw err;
  }
}

export async function listAddressesForUser(db: D1Database, userId: number): Promise<Address[]> {
  const { results } = await db
    .prepare(
      `SELECT a.*,
         (SELECT COUNT(*) FROM emails e WHERE e.recipient_address = a.address AND e.is_deleted = 0) AS message_count,
         (SELECT COUNT(*) FROM emails e WHERE e.recipient_address = a.address AND e.is_deleted = 0 AND e.is_read = 0) AS unread_count
       FROM addresses a
       WHERE a.user_id = ?
       ORDER BY a.is_primary DESC, a.created_at ASC, a.id ASC`,
    )
    .bind(userId)
    .all<Address>();
  return results;
}

export async function findAddressByAddress(db: D1Database, address: string): Promise<Address | null> {
  return db
    .prepare('SELECT * FROM addresses WHERE address = ? COLLATE NOCASE')
    .bind(address.toLowerCase())
    .first<Address>();
}

/**
 * Releases an address owned by userId. Stored mail for the address is deleted too,
 * otherwise whoever claims the name next would be able to read the previous owner's mail.
 */
export async function releaseAddress(db: D1Database, userId: number, addressId: number): Promise<boolean> {
  const addr = await db
    .prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?')
    .bind(addressId, userId)
    .first<Address>();
  if (!addr) return false;

  await db.batch([
    db.prepare('DELETE FROM emails WHERE recipient_address = ? COLLATE NOCASE').bind(addr.address),
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').bind(addressId, userId),
  ]);

  // If the primary address was released, promote the oldest remaining one.
  if (addr.is_primary) {
    await db
      .prepare(
        `UPDATE addresses SET is_primary = 1
         WHERE id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at ASC, id ASC LIMIT 1)`,
      )
      .bind(userId)
      .run();
  }
  return true;
}

// ---------- sent log ----------

export async function countSentSince(db: D1Database, userId: number, sinceUnix: number): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM sent_log WHERE user_id = ? AND created_at >= ?')
    .bind(userId, sinceUnix)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function logSent(
  db: D1Database,
  entry: { userId: number; from: string; to: string; subject: string; messageId: string | null },
): Promise<void> {
  await db
    .prepare('INSERT INTO sent_log (user_id, from_address, to_address, subject, message_id) VALUES (?, ?, ?, ?, ?)')
    .bind(entry.userId, entry.from, entry.to, entry.subject, entry.messageId)
    .run();
}

// ---------- emails ----------

export interface NewEmail {
  recipient_address: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  raw_headers: string | null;
  attachments: string | null;
  message_id: string | null;
}

export async function insertEmail(db: D1Database, e: NewEmail): Promise<void> {
  await db
    .prepare(
      `INSERT INTO emails
        (recipient_address, from_address, from_name, subject, text_body, html_body, raw_headers, attachments, message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      e.recipient_address.toLowerCase(),
      e.from_address,
      e.from_name,
      e.subject,
      e.text_body,
      e.html_body,
      e.raw_headers,
      e.attachments,
      e.message_id,
    )
    .run();
}

export interface ListEmailsOptions {
  limit: number;
  offset: number;
  unreadOnly: boolean;
  address?: string;
}

export async function listEmails(
  db: D1Database,
  userId: number,
  opts: ListEmailsOptions,
): Promise<{ emails: EmailListItem[]; total: number }> {
  // Only fixed SQL fragments are concatenated; every user-supplied value is bound.
  let where = 'a.user_id = ? AND e.is_deleted = 0';
  const params: (string | number)[] = [userId];
  if (opts.unreadOnly) where += ' AND e.is_read = 0';
  if (opts.address) {
    where += ' AND e.recipient_address = ? COLLATE NOCASE';
    params.push(opts.address.toLowerCase());
  }

  const { results } = await db
    .prepare(
      `SELECT e.id, e.recipient_address, e.from_address, e.from_name, e.subject,
              substr(e.text_body, 1, 200) AS snippet, e.is_read, e.received_at
       FROM emails e
       JOIN addresses a ON a.address = e.recipient_address
       WHERE ${where}
       ORDER BY e.received_at DESC, e.id DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...params, opts.limit, opts.offset)
    .all<EmailListItem>();

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM emails e JOIN addresses a ON a.address = e.recipient_address WHERE ${where}`,
    )
    .bind(...params)
    .first<{ n: number }>();

  return { emails: results, total: countRow?.n ?? 0 };
}

/** Ownership is enforced by the JOIN on addresses.user_id. */
export async function getEmailById(db: D1Database, id: number, userId: number): Promise<EmailRow | null> {
  return db
    .prepare(
      `SELECT e.* FROM emails e
       JOIN addresses a ON a.address = e.recipient_address
       WHERE e.id = ? AND a.user_id = ? AND e.is_deleted = 0`,
    )
    .bind(id, userId)
    .first<EmailRow>();
}

export async function markEmailRead(
  db: D1Database,
  id: number,
  userId: number,
  read: boolean,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE emails SET is_read = ?
       WHERE id = ? AND is_deleted = 0
         AND recipient_address IN (SELECT address FROM addresses WHERE user_id = ?)`,
    )
    .bind(read ? 1 : 0, id, userId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

/** Soft delete, with the same ownership check as above. */
export async function deleteEmail(db: D1Database, id: number, userId: number): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE emails SET is_deleted = 1
       WHERE id = ? AND is_deleted = 0
         AND recipient_address IN (SELECT address FROM addresses WHERE user_id = ?)`,
    )
    .bind(id, userId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}
