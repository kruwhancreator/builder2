import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import chapter1Fallback from '@/data/sentence-builder-vol-2/chapter-1.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookName = searchParams.get('book') || 'sentence-builder-vol-2';

  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Fetch all units for this book
      const { data: unitsData, error: unitErr } = await supabase
        .from('units')
        .select('*')
        .eq('book_name', bookName)
        .order('unit_number', { ascending: true });

      if (!unitErr && unitsData && unitsData.length > 0) {
        // Fetch all exercise items for these units
        const unitIds = unitsData.map(u => u.id);
        const { data: itemsData } = await supabase
          .from('exercise_items')
          .select('*')
          .in('unit_id', unitIds)
          .order('item_number', { ascending: true });

        const formattedUnits = unitsData.map(unit => {
          const unitItems = (itemsData || []).filter(item => item.unit_id === unit.id);
          
          // Group items by exercise_code
          const ex1Items = unitItems.filter(i => i.exercise_code === 'ex-1');
          const ex2Items = unitItems.filter(i => i.exercise_code === 'ex-2');
          const ex3Items = unitItems.filter(i => i.exercise_code === 'ex-3');

          const exercises = [
            {
              id: 'ex-1',
              code: 'ex-1',
              title: 'Exercise 1: แปลประโยคภาษาอังกฤษ',
              type: 'translation',
              itemCount: ex1Items.length,
              items: ex1Items
            },
            {
              id: 'ex-2',
              code: 'ex-2',
              title: 'Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค',
              type: 'guided_sentence',
              itemCount: ex2Items.length,
              items: ex2Items
            },
            {
              id: 'ex-3',
              code: 'ex-3',
              title: 'Exercise 3: ดูภาพแล้วแต่งประโยค (Core + Context + Connect)',
              type: 'picture_description',
              itemCount: ex3Items.length,
              items: ex3Items
            }
          ];

          return {
            id: unit.id,
            unit_number: unit.unit_number,
            title: unit.title,
            subtitle: unit.subtitle,
            exercises
          };
        });

        return NextResponse.json({ book: bookName, units: formattedUnits });
      }
    } catch (err) {
      console.warn('Error fetching curriculum from Supabase:', err);
    }
  }

  // Fallback initial dataset (3 chapters with exercises)
  const defaultUnits = Array.from({ length: 5 }, (_, idx) => {
    const uNum = idx + 1;
    const isCh1 = uNum === 1;
    return {
      id: `unit-${uNum}`,
      unit_number: uNum,
      title: isCh1 ? 'Present Continuous & Sentence Expansion' : `Unit ${uNum}: Sentence Practice`,
      subtitle: `บทที่ ${uNum} : แบบฝึกหัดแต่งประโยคภาษาอังกฤษชุดที่ ${uNum}`,
      exercises: [
        {
          id: 'ex-1',
          code: 'ex-1',
          title: 'Exercise 1: แปลประโยคภาษาอังกฤษ',
          type: 'translation',
          itemCount: isCh1 ? 4 : 4,
          items: isCh1 ? chapter1Fallback.exercises['ex-1'].items : []
        },
        {
          id: 'ex-2',
          code: 'ex-2',
          title: 'Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค',
          type: 'guided_sentence',
          itemCount: isCh1 ? 4 : 4,
          items: isCh1 ? chapter1Fallback.exercises['ex-2'].items : []
        },
        {
          id: 'ex-3',
          code: 'ex-3',
          title: 'Exercise 3: ดูภาพแล้วแต่งประโยค (Core + Context + Connect)',
          type: 'picture_description',
          itemCount: isCh1 ? 3 : 3,
          items: isCh1 ? chapter1Fallback.exercises['ex-3'].items : []
        }
      ]
    };
  });

  return NextResponse.json({ book: bookName, units: defaultUnits });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, bookName, unitData, exerciseData, quizItems } = body;

    if (action === 'save_unit') {
      const { unit_number, title, subtitle } = unitData;
      if (!title) {
        return NextResponse.json({ error: 'กรุณากรอกชื่อ Unit' }, { status: 400 });
      }

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.from('units').upsert({
          book_name: bookName,
          unit_number: Number(unit_number),
          title,
          subtitle: subtitle || `บทที่ ${unit_number}`
        }, { onConflict: 'book_name,unit_number' });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, message: `บันทึก Unit ${unit_number} เรียบร้อยแล้ว!` });
    }

    if (action === 'save_quiz_items') {
      const { unit_id, unit_number, exercise_code, items } = body;

      if (isSupabaseConfigured() && supabase) {
        // Resolve unit_id if needed
        let resolvedUnitId = unit_id;
        if (!resolvedUnitId || resolvedUnitId.startsWith('unit-')) {
          const { data: uRow } = await supabase
            .from('units')
            .select('id')
            .eq('book_name', bookName)
            .eq('unit_number', Number(unit_number))
            .single();
          if (uRow) resolvedUnitId = uRow.id;
        }

        if (resolvedUnitId) {
          // Delete existing items for this exercise to cleanly re-insert
          await supabase
            .from('exercise_items')
            .delete()
            .eq('unit_id', resolvedUnitId)
            .eq('exercise_code', exercise_code);

          // Insert updated items
          if (Array.isArray(items) && items.length > 0) {
            const rowsToInsert = items.map((item: any, idx: number) => ({
              unit_id: resolvedUnitId,
              exercise_code,
              item_number: idx + 1,
              thai_prompt: item.thai || item.thai_prompt || null,
              prompt: item.prompt || null,
              model_answer: item.model_answer || '',
              acceptable_answers: item.acceptable_answers || [item.model_answer],
              image_description: item.image_description || null,
              context_hint: item.context_hint || null,
              image_url: item.image_url || null
            }));

            const { error: insertErr } = await supabase.from('exercise_items').insert(rowsToInsert);
            if (insertErr) {
              return NextResponse.json({ error: insertErr.message }, { status: 500 });
            }
          }
        }
      }

      return NextResponse.json({ success: true, message: 'บันทึกรายการคำถาม/เฉลยเรียบร้อยแล้ว!' });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Curriculum POST error:', err);
    return NextResponse.json({ error: err.message || 'เกิดข้อผิดพลาดในการบันทึก' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const bookName = searchParams.get('book');
    const unitNumber = searchParams.get('unit');

    if (action === 'delete_unit' && bookName && unitNumber) {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('units')
          .delete()
          .eq('book_name', bookName)
          .eq('unit_number', Number(unitNumber));

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      return NextResponse.json({ success: true, message: `ลบ Unit ${unitNumber} เรียบร้อยแล้ว!` });
    }

    return NextResponse.json({ error: 'Invalid delete action' }, { status: 400 });
  } catch (err: any) {
    console.error('Curriculum DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
