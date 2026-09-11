import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'sb_admin_session';
export const SESSION_SECONDS = 8 * 60 * 60;
export const DEFAULT_ADMIN_PASSCODE = 'KruWhanLearnerResultTeam#2026';

const secret = () =>
  process.env.ADMIN_SESSION_SECRET ||
  process.env.ADMIN_PASSCODE ||
  'kruwhan-admin-session-secret-team-2026';

export const getExpectedPasscode = () =>
  process.env.ADMIN_PASSCODE || DEFAULT_ADMIN_PASSCODE;

export const equalSecret = (a: string, b: string) => {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest()
  );
};

export function createSession() {
  const sec = secret();
  const payload = `${Date.now() + SESSION_SECONDS * 1000}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${createHmac('sha256', sec).update(payload).digest('hex')}`;
}

export function validSession(token: string) {
  const sec = secret();
  if (!token || typeof token !== 'string' || token.length > 256) return false;
  const [expiry, nonce, signature, extra] = token.split('.');
  if (extra || !expiry || !nonce || !signature || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now() || Number(expiry) > Date.now() + SESSION_SECONDS * 1000) return false;
  return equalSecret(signature, createHmac('sha256', sec).update(`${expiry}.${nonce}`).digest('hex'));
}

export function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const reqOriginUrl = new URL(req.nextUrl.origin);
    if (originUrl.host === reqOriginUrl.host) return true;
    const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (hostHeader) {
      const hostWithoutPort = hostHeader.split(':')[0];
      if (originUrl.host === hostHeader || originUrl.hostname === hostWithoutPort) return true;
    }
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (localHosts.has(originUrl.hostname) && (localHosts.has(reqOriginUrl.hostname) || (hostHeader && localHosts.has(hostHeader.split(':')[0])))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getSessionCookieOptions(req?: NextRequest) {
  const isHttps = req
    ? (req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https')
    : false;
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_SECONDS,
  };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_SECONDS,
};

export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!validSession(req.cookies.get(SESSION_COOKIE)?.value || '')) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบผู้ดูแลอีกครั้งค่ะ' }, { status: 401 });
  }
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  return null;
}

