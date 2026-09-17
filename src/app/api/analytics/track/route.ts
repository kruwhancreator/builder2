import { NextRequest, NextResponse } from 'next/server';
import { trackBookScan, trackUnitView } from '@/lib/analytics-store';
import { readJson, validSlug, positiveInteger } from '@/lib/api-validation';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJson(req, 2000);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const rawBook = typeof body.bookName === 'string' ? body.bookName.trim().toLowerCase() : 'sentence-builder-vol-2';
  const bookName = validSlug(rawBook) ? rawBook : 'sentence-builder-vol-2';
  const type = String(body.type || '');
  const unitNumber = Number(body.unitNumber);

  if (!['book', 'unit'].includes(type) || (type === 'unit' && !positiveInteger(unitNumber))) {
    return NextResponse.json({ error: 'Invalid visit parameters' }, { status: 400 });
  }

  try {
    const result = type === 'book'
      ? await trackBookScan(bookName)
      : await trackUnitView(bookName, unitNumber);

    return NextResponse.json({ ...result, success: Boolean(result?.success ?? true) });
  } catch (err) {
    console.error('[Analytics Track API] Failed to record visit:', err);
    return NextResponse.json({ success: true, method: 'fallback_handled' });
  }
}
