import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAnalyticsSummary } from '@/lib/analytics-store';
import { getBookDataFromDb } from '@/lib/data-manager';
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  try {
    const book = await getBookDataFromDb(req.nextUrl.searchParams.get('book') || '');
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    return NextResponse.json(await getAnalyticsSummary(book.id, book.units.map(u => u.unit_number)), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Analytics unavailable' }, { status: 503 }); }
}
