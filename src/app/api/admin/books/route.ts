import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const INITIAL_BOOKS = [
  { id: 'sentence-builder-vol-1', title: 'Sentence Builder Vol. 1', subtitle: 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ Vol. 1', total_units: 30 },
  { id: 'sentence-builder-vol-2', title: 'Sentence Builder Vol. 2', subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2', total_units: 30 },
  { id: 'sentence-builder-vol-3', title: 'Sentence Builder Vol. 3', subtitle: 'แบบฝึกหัดแต่งประโยคขั้นสูง Vol. 3', total_units: 30 },
];

export async function GET() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: booksData, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && booksData && booksData.length > 0) {
        return NextResponse.json(booksData);
      }
    } catch (err) {
      console.warn('Could not fetch books from Supabase DB:', err);
    }
  }

  return NextResponse.json(INITIAL_BOOKS);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, subtitle, totalUnits = 30 } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'ชื่อหนังสือและ ID ห้ามเป็นค่าว่าง' }, { status: 400 });
    }

    if (isSupabaseConfigured() && supabase) {
      // 1. Insert/Upsert book into 'books' table
      const { error: bookErr } = await supabase
        .from('books')
        .upsert({
          id,
          title,
          subtitle: subtitle || 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ',
          total_units: totalUnits
        });

      if (bookErr) {
        console.error('Supabase book insert error:', bookErr);
        return NextResponse.json({ error: `Supabase Error: ${bookErr.message}` }, { status: 500 });
      }

      // 2. Initialize 30 unit rows for this book in 'units' table
      for (let uNum = 1; uNum <= totalUnits; uNum++) {
        await supabase.from('units').upsert({
          book_name: id,
          unit_number: uNum,
          title: uNum === 1 ? 'Present Continuous & Sentence Expansion' : `Unit ${uNum}`,
          subtitle: `บทที่ ${uNum} : แบบฝึกหัดแต่งประโยคชุดที่ ${uNum}`
        }, { onConflict: 'book_name,unit_number' });
      }

      return NextResponse.json({ success: true, message: `เพิ่มหนังสือ "${title}" ลง Supabase เรียบร้อยแล้ว!` });
    }

    return NextResponse.json({ success: true, message: 'เพิ่มหนังสือในระบบเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error('Add book API error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเพิ่มหนังสือ' }, { status: 500 });
  }
}
