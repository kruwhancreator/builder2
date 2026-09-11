import { NextRequest, NextResponse } from 'next/server';
import { getBookDataFromDb } from '@/lib/data-manager';
export async function GET(req: NextRequest) {
  try {
    const book = await getBookDataFromDb(req.nextUrl.searchParams.get('book') || '');
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    return NextResponse.json({ bookInfo: { title: book.title, subtitle: book.subtitle }, units: book.units }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Unable to load navigation' }, { status: 503 }); }
}
