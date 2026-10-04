# Edge Mail — bilingual email service on Cloudflare Workers

Users sign up, claim an address on your domain (e.g. `alice@yourdomain.com`) and read the mail
sent to it. Everything runs on Cloudflare: Workers (Hono + TypeScript), D1 (SQLite), Email Routing.
The UI is glassmorphism, with dark/light themes and English/Persian (full RTL).

## Prerequisites

- A Cloudflare account and a domain whose DNS is managed by Cloudflare
- Node.js 18+ and npm
- Wrangler (installed locally by `npm install`; log in with `npx wrangler login`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create the D1 database, then paste the printed database_id into wrangler.toml
npx wrangler d1 create email-service-db

# 3. Apply migrations (local first, then remote)
npm run db:migrate:local
npm run db:migrate:remote

# 4. Local secrets
cp .dev.vars.example .dev.vars        # then edit JWT_SECRET and DOMAIN

# 5. Run locally (http://localhost:8787)
npm run dev

# 6. Production secret (use a long random value, e.g. `openssl rand -base64 48`)
npx wrangler secret put JWT_SECRET

# 7. Set DOMAIN in wrangler.toml [vars], then deploy
npm run deploy
```

## Cloudflare dashboard (required for receiving mail)

1. Your domain → **Email** → **Email Routing** → **Enable**. Cloudflare adds the MX and SPF (TXT) records.
2. **Routing rules** → **Catch-all address** → Action **Send to a Worker** → choose `email-service` → Save and enable.

Mail to addresses nobody has claimed is dropped silently (no bounce).

## Sending mail (Compose / Reply)

Sending uses [Cloudflare Email Service](https://developers.cloudflare.com/email-service/) through the `[[send_email]]`
binding named `EMAIL` in `wrangler.toml`. It is separate from Email Routing (which only receives mail).

1. Requires the **Workers Paid** plan (Email Sending is a paid-plan feature) and a domain using Cloudflare DNS.
2. Dashboard -> **Compute -> Email Service -> Email Sending -> Onboard Domain**, pick your domain, and accept the
   DNS records it adds (SPF, DKIM, DMARC, MX for bounces). Propagation usually takes 5-15 minutes.
3. Apply the new migration: `npm run db:migrate:remote` (creates the `sent_log` table), then `npm run deploy`.

Users can only send **from addresses they have claimed**. Limits: 10 messages/minute and 50/day per user
(`MAX_SENT_PER_DAY` in `src/utils/validation.ts`); the daily count comes from the `sent_log` table, which stores
metadata only (no bodies). Sent mail is not stored in a Sent folder, and messages are plain text.
The Reply button in the message view opens the composer pre-filled with the sender, a `Re:` subject and a quoted copy.

If sending fails with "Sending is not set up for this domain yet", the domain has not been onboarded (step 2).

## Testing with a real email

1. Open the deployed site, sign up, and claim `test@yourdomain.com`.
2. From any mail account, send a message to that address.
3. It appears in the inbox within moments (the list also auto-refreshes every 30 seconds).

Email Routing delivers to Workers only for addresses on your domain once routing is enabled and the catch-all rule is active.
Local `wrangler dev` cannot receive real mail; for a local smoke test use
`curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' --url-query 'from=a@example.com' --url-query 'to=test@yourdomain.com' --header 'Content-Type: application/octet-stream' --data-binary $'From: a@example.com\r\nTo: test@yourdomain.com\r\nSubject: Hello\r\n\r\nHi there'`.

## Privacy Policy and Terms of Service

`public/privacy.html` and `public/terms.html` are served at `/privacy` and `/terms` and linked from the footer. Each file
contains both languages (English and Persian); the active language, direction and theme follow the site toggles.

- They describe what the code actually does (what is stored, the 7-day session cookie, limits, soft-deleted messages, no
  account-deletion button). **If you change that behaviour, update the pages.**
- The contact section points to the project's GitHub issues page. Replace it with your own contact address, and review
  both documents with a lawyer if you run the service for the public.
- The pages use the same inline theme script as `index.html`, so the CSP hash in `public/_headers` covers all of them.

## Theming

- Both palettes live at the top of `public/css/style.css` (`html[data-theme="dark"]` and `html[data-theme="light"]`).
- To change the accent colour, edit `--ac`, `--ac1` and `--ac0` (and optionally `--ac2` for hover) in **both** palettes.
- The choice is stored in `localStorage` under `es_theme` and in the user's D1 row. After login the stored
  server value wins; a new account starts with the browser's current choice.

## Languages (i18n)

- All strings live in the `I18N` object in `public/js/i18n.js`. Mark text with `data-i18n="key"` and attributes with
  `data-i18n-attr="placeholder:key"` (or `data-i18n-title="key"`).
- To add a language: add a new key to `I18N` with every string, extend `getLang()` / `setLang()` to accept it, make
  sure `applyDirection()` sets `dir="rtl"` if it is right-to-left, and allow it in `langSchema` in `src/utils/validation.ts`.
- The choice is stored in `localStorage` under `es_lang` and in the user's D1 row.
- Persian mode sets `<html lang="fa" dir="rtl">`, and numbers go through `toFaDigits()`; dates use `Intl.DateTimeFormat('fa-IR')`.
- The stylesheet uses logical properties (`margin-inline-*`, `inset-inline-*`, …) so both directions render correctly.

## Security notes

- Passwords: PBKDF2-SHA256, 100,000 iterations (the Workers maximum), 16-byte random salt, constant-time compare.
- Sessions: HS256 JWT in an `HttpOnly; Secure; SameSite=Strict` cookie (7 days). `Secure` is dropped only when `ENVIRONMENT=development`.
- Login returns the same 401 for unknown emails and wrong passwords.
- Every mail query joins `addresses` on `user_id`, so users can only read their own mail.
- Releasing an address also deletes its stored mail, so the next person to claim the name cannot read it.
- Email HTML is cleaned and rendered in `<iframe sandbox="" srcdoc>` (no scripts, no same-origin access).
- CSP for the pages is in `public/_headers`. It pins the inline theme bootstrap script by hash: if you edit that
  script, recompute the SHA-256 and update `_headers`.
- Rate limiting (10/min for signup and login, 30/min for availability checks) is in memory per Worker isolate. For
  hard limits, add Cloudflare rate limiting rules.

## Limitations

- Outgoing mail is plain text only, one recipient per message, no attachments, and there is no Sent folder.
- No spam filtering; add rules in Email Routing or Cloudflare's email security products if you need them.
- Attachments are listed (name and type) but not stored.
- D1 rows are limited to about 2 MB, so oversized message bodies are truncated, and D1 storage limits apply to the whole database.
- Remote images in emails load from the sender's server, which can reveal that a message was opened.

## Troubleshooting

- **`D1_ERROR: no such table`**: run the migrations for the right target (`--local` for `wrangler dev`, `--remote` for production).
- **Mail never arrives**: confirm Email Routing is enabled, the catch-all rule points at the Worker, and the address was claimed
  (unclaimed addresses are dropped). Check `npx wrangler tail`.
- **Logged out immediately on plain http**: set `ENVIRONMENT=development` in `.dev.vars` (drops the `Secure` flag).
- **401 on every request in production**: `JWT_SECRET` was not set with `wrangler secret put`.
- **Fonts or styles blocked**: if you change CDNs, update the CSP in `public/_headers`.
- **Typecheck errors**: run `npm run typecheck`.
- **A message opens blank**: check what was stored for recent mail:
  `npx wrangler d1 execute DB --remote --command "SELECT id, length(text_body) t, length(html_body) h, length(raw_headers) r FROM emails ORDER BY id DESC LIMIT 5"`.
  If `t` and `h` are both 0, the body was not parsed; run `npx wrangler tail` and send another message to see the reason.
  When no readable body is stored the viewer now shows the raw source instead of a blank page.
- **Sending fails with a 502 (or another error) in the browser console**: the response body contains a `code` field with
  Cloudflare's error code, and the same code is printed by `npx wrangler tail` (look for `send failed`). Most common:
  - `E_SENDER_DOMAIN_NOT_AVAILABLE` / `E_SENDER_NOT_VERIFIED` (HTTP 503): the domain is not onboarded yet, or its DNS records
    have not propagated. Dashboard -> Compute -> Email Service -> Email Sending -> Onboard Domain. `DOMAIN` in `wrangler.toml`
    must be the same domain you onboarded (it still says `yourdomain.com` until you change it).
  - `E_RECIPIENT_NOT_ALLOWED` (HTTP 403): before the domain is onboarded, Email Service only delivers to verified
    destination addresses in your Cloudflare account.
  - `E_DELIVERY_FAILED` (HTTP 502): the recipient's mail server refused the message. Anything else mapped to 502 is a
    genuine problem on Cloudflare's side.
  The full list of codes is in the [Workers API docs](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/#error-codes).
- **Compose says sending is not enabled**: the `[[send_email]]` binding is missing from `wrangler.toml`, or the Worker was not redeployed.
