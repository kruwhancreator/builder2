import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAnalyticsSummary } from '@/lib/analytics-store';
import { getBookDataFromDb } from '@/lib/data-manager';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const bookParam = (req.nextUrl.searchParams.get('book') || 'sentence-builder-vol-2').trim();

  try {
    const book = await getBookDataFromDb(bookParam);
    const bookId = book?.id || bookParam;
    const unitNumbers = (book?.units || []).map(u => u.unit_number);

    const summary = await getAnalyticsSummary(bookId, unitNumbers);
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (err) {
    console.error('[Analytics Summary API] Error generating summary, using resilient fallback:', err);
    const fallbackSummary = await getAnalyticsSummary(bookParam, []);
    return NextResponse.json(fallbackSummary, {
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
