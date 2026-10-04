import { z } from 'zod';

export const RESERVED_LOCAL_PARTS: ReadonlySet<string> = new Set([
  'admin', 'postmaster', 'abuse', 'root', 'noreply', 'no-reply', 'webmaster', 'hostmaster',
  'mailer-daemon', 'support', 'help', 'info', 'contact', 'security', 'dmarc', 'spf', 'dkim', 'bounce',
]);

export const MAX_ADDRESSES_PER_USER = 5;

const LOCAL_PART_RE = /^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/;

export const localPartSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(LOCAL_PART_RE)
  .refine((v) => !v.includes('..'), { message: 'consecutive_dots' });

export function isReserved(localPart: string): boolean {
  return RESERVED_LOCAL_PARTS.has(localPart.toLowerCase());
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(8).max(128);
const langSchema = z.enum(['en', 'fa']);
const themeSchema = z.enum(['dark', 'light']);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // Optional: the browser's current choices, saved with the new account.
  language: langSchema.optional(),
  theme: themeSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const MAX_SENT_PER_DAY = 50;

export const sendSchema = z.object({
  from: emailSchema,
  to: emailSchema,
  // No CR/LF: a newline in the subject would allow header injection.
  subject: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((v) => !/[\r\n]/.test(v), { message: 'newline' }),
  text: z.string().min(1).max(100_000),
});

export const claimAddressSchema =z.object({ localPart: localPartSchema });

export const preferencesSchema = z
  .object({ language: langSchema.optional(), theme: themeSchema.optional() })
  .refine((v) => v.language !== undefined || v.theme !== undefined, { message: 'empty' });
