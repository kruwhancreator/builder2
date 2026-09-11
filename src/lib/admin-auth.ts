import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'sb_admin_session';
export const SESSION_SECONDS = 8 * 60 * 60;
const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSCODE || '';
export const equalSecret = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
export function createSession() {
  if (!secret()) throw new Error('Admin authentication is not configured');
  const payload = `${Date.now() + SESSION_SECONDS * 1000}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('hex')}`;
}
export function validSession(token: string) {
  if (!secret() || token.length > 256) return false;
  const [expiry, nonce, signature, extra] = token.split('.');
  if (extra || !expiry || !nonce || !signature || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now() || Number(expiry) > Date.now() + SESSION_SECONDS * 1000) return false;
  return equalSecret(signature, createHmac('sha256', secret()).update(`${expiry}.${nonce}`).digest('hex'));
}
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!validSession(req.cookies.get(SESSION_COOKIE)?.value || '')) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบผู้ดูแลอีกครั้งค่ะ' }, { status: 401 });
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  return null;
}
export const sessionCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: SESSION_SECONDS };
