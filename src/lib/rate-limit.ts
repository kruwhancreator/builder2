import 'server-only';
import { createHash } from 'node:crypto';
import { adminDb } from './server-db';
import { BoundedCache } from './bounded-cache';

const local = new BoundedCache<number>(5000, 60_000);
export async function allowRequest(req: Request, scope: string, limit: number) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  const fingerprint = createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  const bucket = Math.floor(Date.now() / 60_000);
  if (adminDb) {
    const { data, error } = await adminDb.rpc('consume_request_limit', { p_key: fingerprint, p_limit: limit });
    if (error) { console.error('Rate limit storage unavailable'); return false; }
    return data === true;
  }
  // Development only; deployed instances share the atomic database limiter.
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  const key = `${fingerprint}:${bucket}`;
  const count = local.get(key) || 0;
  if (count >= limit) return false;
  local.set(key, count + 1);
  return true;
}
