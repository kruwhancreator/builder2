import { NextResponse } from 'next/server';
import { getAnalyticsSummary } from '@/lib/analytics-store';
import { getBookDataFromDb } from '@/lib/data-manager';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookName = searchParams.get('book') || 'sentence-builder-vol-2';

    // Get total units count dynamically from book if available
    let totalUnits = 30;
    try {
      const bookData = await getBookDataFromDb(bookName);
      if (Array.isArray(bookData?.units) && bookData.units.length > 0) {
        totalUnits = Math.max(30, bookData.units.length);
      }
    } catch {
      // fallback to 30
    }

    const summary = await getAnalyticsSummary(bookName, totalUnits);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('Analytics summary error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics summary' }, { status: 500 });
  }
}
