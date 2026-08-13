import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// In-memory fallback tracking when Supabase is not connected
const localAnalyticsMemory = {
  books: {
    'sentence-builder-vol-2': 0
  } as Record<string, number>,
  units: {} as Record<string, Record<number, number>>
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, bookName = 'sentence-builder-vol-2', unitNumber } = body;

    if (type === 'book') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.rpc('increment_book_scan', { target_book: bookName });
      } else {
        localAnalyticsMemory.books[bookName] = (localAnalyticsMemory.books[bookName] || 0) + 1;
      }
      return NextResponse.json({ success: true, tracked: 'book', bookName });
    }

    if (type === 'unit' && typeof unitNumber === 'number') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.rpc('increment_unit_view', { 
          target_book: bookName, 
          target_unit: unitNumber 
        });
      } else {
        if (!localAnalyticsMemory.units[bookName]) {
          localAnalyticsMemory.units[bookName] = {};
        }
        localAnalyticsMemory.units[bookName][unitNumber] = (localAnalyticsMemory.units[bookName][unitNumber] || 0) + 1;
      }
      return NextResponse.json({ success: true, tracked: 'unit', bookName, unitNumber });
    }

    return NextResponse.json({ error: 'Invalid tracking request' }, { status: 400 });
  } catch (err) {
    console.error('Analytics tracking error:', err);
    return NextResponse.json({ error: 'Internal tracking error' }, { status: 500 });
  }
}
