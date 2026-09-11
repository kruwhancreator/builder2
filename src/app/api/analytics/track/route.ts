import { NextRequest, NextResponse } from 'next/server';
import { trackBookScan, trackUnitView } from '@/lib/analytics-store';
import { getBookDataFromDb } from '@/lib/data-manager';
import { allowRequest } from '@/lib/rate-limit';
import { readJson, validSlug, positiveInteger } from '@/lib/api-validation';
export async function POST(req: NextRequest) {
  let body: Record<string,unknown>;
  try { body = await readJson(req, 2000); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (!validSlug(body.bookName) || !['book','unit'].includes(String(body.type)) || (body.type === 'unit' && !positiveInteger(body.unitNumber))) return NextResponse.json({ error: 'Invalid visit' }, { status: 400 });
  if (!(await allowRequest(req,'visits',120))) return NextResponse.json({ error: 'Too many visits' }, { status: 429 });
  try {
    const book = await getBookDataFromDb(body.bookName);
    if (!book || (body.type==='unit' && !book.units.some(u=>u.unit_number===body.unitNumber))) return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    const result = body.type==='book' ? await trackBookScan(book.id) : await trackUnitView(book.id, body.unitNumber as number);
    return NextResponse.json(result, { status: result.success ? 200 : 503 });
  } catch { return NextResponse.json({ error: 'Tracking unavailable' }, { status: 503 }); }
}
