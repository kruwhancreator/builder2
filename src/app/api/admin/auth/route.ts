import { NextRequest, NextResponse } from 'next/server';
import { createSession, equalSecret, requireAdmin, SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin-auth';
import { allowRequest } from '@/lib/rate-limit';
import { readJson } from '@/lib/api-validation';

export async function GET(req: NextRequest) {
  return requireAdmin(req) || NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return NextResponse.json({ error: 'Administrator login is not configured' }, { status: 503 });
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  if (!(await allowRequest(req, 'admin-login', 5))) return NextResponse.json({ error: 'Please wait before trying again' }, { status: 429 });
  let passcode: unknown;
  try { ({ passcode } = await readJson(req, 2048)); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (typeof passcode !== 'string' || !equalSecret(passcode, expected)) return NextResponse.json({ error: 'Passcode ไม่ถูกต้อง' }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, createSession(), sessionCookieOptions);
  return response;
}
export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
