import PostalMime from 'postal-mime';

import type { AttachmentMeta, ParsedEmail } from '../types';

export interface ParseOutcome {
  parsed: ParsedEmail | null;
  /** Raw message text (decoded leniently), kept so nothing is lost when parsing fails. */
  rawText: string;
}

/** Reads the one-shot raw stream fully. Never throws. */
export async function readRaw(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  try {
    return await new Response(stream).arrayBuffer();
  } catch {
    return new ArrayBuffer(0);
  }
}

/**
 * Parses a raw RFC 822 message with postal-mime. Never throws:
 * on failure `parsed` is null and `rawText` still holds the original message.
 *
 * Attachment and header extraction are best-effort and isolated, so a problem
 * there can never discard an otherwise readable text/html body.
 */
export async function parseEmail(raw: ArrayBuffer): Promise<ParseOutcome> {
  const rawText = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(raw);
  try {
    const mail = await PostalMime.parse(raw);

    let attachments: AttachmentMeta[] = [];
    try {
      attachments = (mail.attachments ?? []).map((a) => ({
        filename: a.filename ?? null,
        mimeType: a.mimeType,
        size: typeof a.content === 'string' ? a.content.length : a.content.byteLength,
      }));
    } catch (err) {
      console.error('attachment metadata failed', err instanceof Error ? err.message : err);
    }

    let headers = '';
    try {
      headers = (mail.headers ?? []).map((h) => `${h.key}: ${h.value}`).join('\n');
    } catch (err) {
      console.error('header extraction failed', err instanceof Error ? err.message : err);
    }

    const parsed: ParsedEmail = {
      from: { name: mail.from?.name ?? '', address: (mail.from?.address ?? '').toLowerCase() },
      to: (mail.to ?? []).map((t) => (t.address ?? '').toLowerCase()).filter(Boolean),
      subject: mail.subject ?? '',
      text: mail.text ?? '',
      html: mail.html ?? '',
      headers,
      messageId: mail.messageId ?? null,
      attachments,
    };
    return { parsed, rawText };
  } catch (err) {
    // Visible with `npx wrangler tail`.
    console.error('postal-mime failed', err instanceof Error ? err.message : err);
    return { parsed: null, rawText };
  }
}
