export type Lang = 'en' | 'fa';
export type Theme = 'dark' | 'light';

/** Minimal shape of the Cloudflare Email Service `send_email` binding that this app uses. */
export interface OutgoingEmail {
  to: string;
  from: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface EmailSender {
  send(message: OutgoingEmail): Promise<{ messageId: string }>;
}

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Optional at runtime: missing when the send_email binding isn't configured. */
  EMAIL?: EmailSender;
  JWT_SECRET: string;
  DOMAIN: string;
  ENVIRONMENT: string;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  language: Lang;
  theme: Theme;
  created_at: number;
}

/** User shape that is safe to send to the browser (no password hash). */
export type PublicUser = Omit<User, 'password_hash'>;

export interface Address {
  id: number;
  user_id: number;
  address: string;
  local_part: string;
  is_primary: number;
  created_at: number;
  message_count?: number;
  unread_count?: number;
}

export interface EmailRow {
  id: number;
  recipient_address: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  raw_headers: string | null;
  attachments: string | null;
  message_id: string | null;
  is_read: number;
  is_deleted: number;
  received_at: number;
}

/** Lightweight row used for the inbox list (no full bodies). */
export interface EmailListItem {
  id: number;
  recipient_address: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
  is_read: number;
  received_at: number;
}

export interface JWTPayload {
  sub: string; // user id
  iat: number;
  exp: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AttachmentMeta {
  filename: string | null;
  mimeType: string;
  size: number;
}

export interface ParsedEmail {
  from: { name: string; address: string };
  to: string[];
  subject: string;
  text: string;
  html: string;
  headers: string;
  messageId: string | null;
  attachments: AttachmentMeta[];
}

export type AppEnv = {
  Bindings: Env;
  Variables: { user: User; userId: number };
};
