import { createHash } from 'node:crypto';
import { adminDb } from './server-db';
import { BoundedCache } from './bounded-cache';

const local = new BoundedCache<number>(5000, 60_000);

export async function allowRequest(req: Request, scope: string, limit: number) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  const fingerprint = createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  const bucket = Math.floor(Date.now() / 60_000);

  if (adminDb) {
    try {
      const { data, error } = await adminDb.rpc('consume_request_limit', { p_key: fingerprint, p_limit: limit });
      if (!error && typeof data === 'boolean') {
        return data;
      }
      if (error) {
        console.warn('consume_request_limit RPC unavailable, falling back to local rate limiter:', error.message);
      }
    } catch (err) {
      console.warn('Rate limit RPC threw error, falling back to local rate limiter:', err);
    }
  }

  const key = `${fingerprint}:${bucket}`;
  const count = local.get(key) || 0;
  if (count >= limit) return false;
  local.set(key, count + 1);
  return true;
}

