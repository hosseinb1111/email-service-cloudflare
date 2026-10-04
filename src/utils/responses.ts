import type { ApiResponse } from '../types';

function json<T>(body: ApiResponse<T>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const ok = <T>(data: T, status = 200): Response => json<T>({ success: true, data }, status);
export const created = <T>(data: T): Response => ok(data, 201);
export const badRequest = (msg: string): Response => json({ success: false, error: msg }, 400);
export const unauthorized = (msg: string): Response => json({ success: false, error: msg }, 401);
export const forbidden = (msg: string): Response => json({ success: false, error: msg }, 403);
export const notFound = (msg: string): Response => json({ success: false, error: msg }, 404);
export const conflict = (msg: string): Response => json({ success: false, error: msg }, 409);
export const tooManyRequests = (msg: string): Response => json({ success: false, error: msg }, 429);
export const serverError = (msg: string): Response => json({ success: false, error: msg }, 500);
