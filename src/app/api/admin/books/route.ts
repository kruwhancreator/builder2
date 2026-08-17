import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const INITIAL_BOOKS = [
  { 
    id: 'sentence-builder-vol-1', 
    title: 'Sentence Builder Vol. 1', 
    subtitle: 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ Vol. 1 (เทคนิคปูพื้นฐาน)', 
    total_units: 30,
    created_at: '2026-07-22T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-2', 
    title: 'Sentence Builder Vol. 2', 
    subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2 (Core + Context + Connect)', 
    total_units: 30,
    created_at: '2026-07-20T00:00:00.000Z'
  },
  { 
    id: 'sentence-builder-vol-3', 
    title: 'Sentence Builder Vol. 3', 
    subtitle: 'แบบฝึกหัดแต่งประโยคขั้นสูง Vol. 3 (Advanced Business & Writing)', 
    total_units: 30,
    created_at: '2026-07-01T00:00:00.000Z'
  },
];

export async function GET() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: booksData, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

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
    const { 
      id, 
      title, 
      subtitle, 
      totalUnits = 30 
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อหนังสือ' }, { status: 400 });
    }

    const generatedSlug = id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (isSupabaseConfigured() && supabase) {
      // 1. Insert/Upsert book into 'books' table
      const { error: bookErr } = await supabase
        .from('books')
        .upsert({
          id: generatedSlug,
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
          book_name: generatedSlug,
          unit_number: uNum,
          title: uNum === 1 ? 'Present Continuous & Sentence Expansion' : `Unit ${uNum}`,
          subtitle: `บทที่ ${uNum} : แบบฝึกหัดแต่งประโยคชุดที่ ${uNum}`
        }, { onConflict: 'book_name,unit_number' });
      }

      return NextResponse.json({ 
        success: true, 
        message: `บันทึกหนังสือ "${title}" ลง Supabase เรียบร้อยแล้ว!` 
      });
    }

    return NextResponse.json({ success: true, message: 'เพิ่มหนังสือในระบบเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error('Add book API error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกหนังสือ' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('id');

    if (!bookId) {
      return NextResponse.json({ error: 'กรุณาระบุ ID หนังสือที่ต้องการลบ' }, { status: 400 });
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) {
        console.error('Supabase book delete error:', error);
        return NextResponse.json({ error: `Supabase Error: ${error.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: `ลบหนังสือ ${bookId} เรียบร้อยแล้ว!` });
  } catch (err: any) {
    console.error('Delete book API error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบหนังสือ' }, { status: 500 });
  }
}
