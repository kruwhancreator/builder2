import { NextRequest, NextResponse } from 'next/server';
import {
  createSession,
  equalSecret,
  getExpectedPasscode,
  getSessionCookieOptions,
  isAllowedOrigin,
  requireAdmin,
  SESSION_COOKIE,
} from '@/lib/admin-auth';
import { allowRequest } from '@/lib/rate-limit';
import { readJson } from '@/lib/api-validation';

export async function GET(req: NextRequest) {
  return requireAdmin(req) || NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const expected = getExpectedPasscode();
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  if (!(await allowRequest(req, 'admin-login', 15))) {
    return NextResponse.json({ error: 'Please wait before trying again' }, { status: 429 });
  }

  let passcode: unknown;
  try {
    const body = await readJson(req, 2048);
    passcode = body.passcode;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (typeof passcode !== 'string' || !equalSecret(passcode.trim(), expected.trim())) {
    return NextResponse.json({ error: 'Passcode ไม่ถูกต้อง' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ' });
  response.cookies.set(SESSION_COOKIE, createSession(), getSessionCookieOptions(req));
  return response;
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...getSessionCookieOptions(req), maxAge: 0 });
  return response;
}

