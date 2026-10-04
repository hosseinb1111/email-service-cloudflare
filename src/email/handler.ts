import { findAddressByAddress, insertEmail } from '../db';
import type { Env } from '../types';
import { parseEmail, readRaw } from './parser';

// D1 rows are limited to ~2 MB, so oversized bodies are truncated to stay under it.
const MAX_BODY_CHARS = 700_000;
const MAX_HEADER_CHARS = 60_000;

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** Cloudflare Email Routing entry point. Must never throw. */
export async function handleEmail(
  message: ForwardableEmailMessage,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  try {
    const recipient = message.to.trim().toLowerCase();

    // Unclaimed address: drop silently, no bounce (avoids backscatter and address probing).
    const owner = await findAddressByAddress(env.DB, recipient);
    if (!owner) return;

    // The raw stream can only be consumed once, so read it up front.
    const raw = await readRaw(message.raw);

    const store = (async (): Promise<void> => {
      try {
        const { parsed, rawText } = await parseEmail(raw);

        if (parsed) {
          // If parsing "succeeded" but produced no readable body, keep the raw source
          // (in raw_headers) so the viewer can still show the message.
          const readable = parsed.text.trim() !== '' || parsed.html.trim() !== '';
          if (!readable) console.error('parsed message has no text or html body', recipient);
          await insertEmail(env.DB, {
            recipient_address: recipient,
            from_address: parsed.from.address || message.from.toLowerCase(),
            from_name: parsed.from.name || null,
            subject: parsed.subject || null,
            text_body: clip(parsed.text, MAX_BODY_CHARS),
            html_body: clip(parsed.html, MAX_BODY_CHARS),
            raw_headers: readable ? clip(parsed.headers, MAX_HEADER_CHARS) : clip(rawText, MAX_BODY_CHARS),
            attachments: JSON.stringify(parsed.attachments),
            message_id: parsed.messageId ?? message.headers.get('message-id'),
          });
          return;
        }

        // Parse failed: keep the raw message so nothing is lost, with empty bodies.
        await insertEmail(env.DB, {
          recipient_address: recipient,
          from_address: message.from.toLowerCase(),
          from_name: null,
          subject: message.headers.get('subject'),
          text_body: '',
          html_body: '',
          raw_headers: clip(rawText, MAX_BODY_CHARS),
          attachments: '[]',
          message_id: message.headers.get('message-id'),
        });
      } catch (err) {
        console.error('email store failed', err instanceof Error ? err.message : err);
      }
    })();

    // Non-blocking: acknowledge the SMTP transaction while D1 finishes writing.
    ctx.waitUntil(store);
  } catch (err) {
    console.error('email handler failed', err instanceof Error ? err.message : err);
  }
}
