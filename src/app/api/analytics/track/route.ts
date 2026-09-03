import { NextResponse } from 'next/server';
import { trackBookScan, trackUnitView, trackExerciseCheck } from '@/lib/analytics-store';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, bookName = 'sentence-builder-vol-2', unitNumber, isCorrect } = body;

    if (type === 'book') {
      const res = await trackBookScan(bookName);
      return NextResponse.json({ success: true, tracked: 'book', bookName, scans: res.qrScans });
    }

    if (type === 'unit') {
      const uNum = typeof unitNumber === 'number' ? unitNumber : parseInt(String(unitNumber || 1), 10);
      const res = await trackUnitView(bookName, uNum);
      return NextResponse.json({ success: true, tracked: 'unit', bookName, unitNumber: uNum, views: res.views });
    }

    if (type === 'check') {
      const uNum = typeof unitNumber === 'number' ? unitNumber : parseInt(String(unitNumber || 1), 10);
      await trackExerciseCheck(bookName, uNum, Boolean(isCorrect));
      return NextResponse.json({ success: true, tracked: 'check', bookName, unitNumber: uNum, isCorrect: Boolean(isCorrect) });
    }

    return NextResponse.json({ error: 'Invalid tracking type' }, { status: 400 });
  } catch (err) {
    console.error('Analytics tracking error:', err);
    return NextResponse.json({ error: 'Internal tracking error' }, { status: 500 });
  }
}
