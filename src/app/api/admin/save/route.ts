import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getChapterDataFromDb } from '@/lib/data-manager';
export async function POST(req: NextRequest) {
  return requireAdmin(req) || NextResponse.json({ error: 'Use the curriculum editor to save questions atomically.' }, { status: 410 });
}
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  try {
    const data = await getChapterDataFromDb(req.nextUrl.searchParams.get('book') || '', Number(req.nextUrl.searchParams.get('unit')));
    return data ? NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  } catch { return NextResponse.json({ error: 'Unable to load chapter' }, { status: 503 }); }
}
