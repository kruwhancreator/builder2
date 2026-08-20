import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import chapter1Fallback from '@/data/sentence-builder-vol-2/chapter-1.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookName = searchParams.get('book') || 'sentence-builder-vol-2';

  if (isSupabaseConfigured() && supabase) {
    try {
      const client = supabase;
      // 1. Fetch all units for this book
      const { data: unitsData, error: unitErr } = await client
        .from('units')
        .select('*')
        .eq('book_name', bookName)
        .order('unit_number', { ascending: true });

      if (!unitErr && unitsData && unitsData.length > 0) {
        const unitIds = unitsData.map(u => u.id);

        // 2. Fetch exercises configuration from 'exercises' table
        const { data: exercisesData } = await client
          .from('exercises')
          .select('*')
          .in('unit_id', unitIds)
          .order('created_at', { ascending: true });

        // 3. Fetch exercise items from 'exercise_items' table
        const { data: itemsData } = await client
          .from('exercise_items')
          .select('*')
          .in('unit_id', unitIds)
          .order('item_number', { ascending: true });

        const formattedUnits = unitsData.map(unit => {
          const unitExercises = (exercisesData || []).filter(ex => ex.unit_id === unit.id);
          const unitItems = (itemsData || []).filter(item => item.unit_id === unit.id);

          let exercises = unitExercises.map(ex => {
            const exItems = unitItems.filter(i => i.exercise_code === ex.exercise_code);
            return {
              id: ex.id,
              code: ex.exercise_code,
              title: ex.title,
              type: ex.exercise_type || 'translation',
              use_ai_check: ex.use_ai_check !== false,
              instruction: ex.instruction || '',
              guidance: ex.guidance || '',
              categories: ex.categories || (ex.exercise_code === 'ex-2' ? (chapter1Fallback.exercises['ex-2'] as any)?.categories : null),
              word_bank: ex.word_bank || null,
              itemCount: exItems.length,
              items: exItems.map(i => ({
                id: i.item_number,
                item_number: i.item_number,
                thai_prompt: i.thai_prompt,
                thai: i.thai_prompt,
                prompt: i.prompt,
                thai_template: i.thai_template,
                required_orders: i.required_orders || [1],
                model_answer: i.model_answer,
                acceptable_answers: i.acceptable_answers || [i.model_answer],
                translations: i.translations || null,
                image_description: i.image_description,
                context_hint: i.context_hint,
                image_url: i.image_url
              }))
            };
          });

          // Fallback to default 3 exercises if none configured yet for this unit
          if (exercises.length === 0) {
            const ex1Items = unitItems.filter(i => i.exercise_code === 'ex-1');
            const ex2Items = unitItems.filter(i => i.exercise_code === 'ex-2');
            const ex3Items = unitItems.filter(i => i.exercise_code === 'ex-3');

            exercises = [
              {
                id: 'ex-1',
                code: 'ex-1',
                title: 'Exercise 1: แปลประโยคภาษาอังกฤษ',
                type: 'translation',
                use_ai_check: true,
                instruction: 'แปลประโยคภาษาไทยเป็นภาษาอังกฤษ',
                guidance: 'ตรวจสอบ Subject-Verb Agreement และการเติม -ing',
                categories: null,
                word_bank: null,
                itemCount: ex1Items.length,
                items: ex1Items.length > 0 ? ex1Items : chapter1Fallback.exercises['ex-1'].items
              },
              {
                id: 'ex-2',
                code: 'ex-2',
                title: 'Exercise 2: เลือกคำจากตารางมาแต่งประโยค',
                type: 'guided_sentence',
                use_ai_check: true,
                instruction: 'เลือกคำที่กำหนดให้มาเติมลงในประโยค',
                guidance: 'ตรวจคำศัพท์ที่เลือกและการวางตำแหน่งในประโยค',
                categories: (chapter1Fallback.exercises['ex-2'] as any)?.categories,
                word_bank: null,
                itemCount: ex2Items.length,
                items: ex2Items.length > 0 ? ex2Items : chapter1Fallback.exercises['ex-2'].items
              },
              {
                id: 'ex-3',
                code: 'ex-3',
                title: 'Exercise 3: ดูภาพแล้วแต่งประโยค (Core + Context + Connect)',
                type: 'picture_description',
                use_ai_check: true,
                instruction: 'ดูภาพแล้วแต่งประโยคตามโครงสร้างที่กำหนด',
                guidance: 'ตรวจ 3 องค์ประกอบ: Core + Context + Connect',
                categories: null,
                word_bank: null,
                itemCount: ex3Items.length,
                items: ex3Items.length > 0 ? ex3Items : chapter1Fallback.exercises['ex-3'].items
              }
            ];
          }

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

  // Fallback initial dataset (1 unit with 3 exercises)
  const defaultUnits = [
    {
      id: 'unit-1',
      unit_number: 1,
      title: 'Present Continuous & Sentence Expansion',
      subtitle: 'บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]',
      exercises: [
        {
          id: 'ex-1',
          code: 'ex-1',
          title: 'Exercise 1: แปลประโยคภาษาอังกฤษ',
          type: 'translation',
          use_ai_check: true,
          instruction: 'แปลประโยคภาษาไทยเป็นภาษาอังกฤษ',
          guidance: 'ตรวจสอบ Subject-Verb Agreement และการเติม -ing',
          itemCount: 4,
          items: chapter1Fallback.exercises['ex-1'].items
        },
        {
          id: 'ex-2',
          code: 'ex-2',
          title: 'Exercise 2: เลือกคำจากตารางมาแต่งประโยค',
          type: 'guided_sentence',
          use_ai_check: true,
          instruction: 'เลือกคำที่กำหนดให้มาเติมลงในประโยค',
          guidance: 'ตรวจคำศัพท์ที่เลือกและการวางตำแหน่งในประโยค',
          categories: (chapter1Fallback.exercises['ex-2'] as any)?.categories,
          itemCount: 4,
          items: chapter1Fallback.exercises['ex-2'].items
        },
        {
          id: 'ex-3',
          code: 'ex-3',
          title: 'Exercise 3: ดูภาพแล้วแต่งประโยค (Core + Context + Connect)',
          type: 'picture_description',
          use_ai_check: true,
          instruction: 'ดูภาพแล้วแต่งประโยคตามโครงสร้างที่กำหนด',
          guidance: 'ตรวจ 3 องค์ประกอบ: Core + Context + Connect',
          itemCount: 3,
          items: chapter1Fallback.exercises['ex-3'].items
        }
      ]
    }
  ];

  return NextResponse.json({ book: bookName, units: defaultUnits });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, bookName, unitData, exerciseData, items, categories } = body;

    // 1. SAVE UNIT
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

    // 2. SAVE EXERCISE (CREATE / EDIT EXERCISE CONFIGURATION)
    if (action === 'save_exercise') {
      const { unit_id, unit_number, exercise_code, title, exercise_type, use_ai_check, instruction, guidance, categories: exCats } = exerciseData;

      if (!title) {
        return NextResponse.json({ error: 'กรุณากรอกชื่อแบบฝึกหัด (Exercise Title)' }, { status: 400 });
      }

      const generatedCode = exercise_code || `ex-${Date.now().toString().slice(-4)}`;

      if (isSupabaseConfigured() && supabase) {
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
          const { error: exErr } = await supabase.from('exercises').upsert({
            unit_id: resolvedUnitId,
            exercise_code: generatedCode,
            title,
            exercise_type: exercise_type || 'translation',
            use_ai_check: use_ai_check !== false,
            instruction: instruction || null,
            guidance: guidance || null,
            categories: exCats || null
          }, { onConflict: 'unit_id,exercise_code' });

          if (exErr) {
            return NextResponse.json({ error: exErr.message }, { status: 500 });
          }
        }
      }

      return NextResponse.json({ success: true, message: `บันทึกแบบฝึกหัด "${title}" เรียบร้อยแล้ว!` });
    }

    // 3. SAVE QUIZ ITEMS & CATEGORIES
    if (action === 'save_quiz_items') {
      const { unit_id, unit_number, exercise_code } = body;

      if (isSupabaseConfigured() && supabase) {
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
          // If categories are passed (for guided_sentence), update exercises.categories
          if (Array.isArray(categories)) {
            await supabase
              .from('exercises')
              .update({ categories })
              .eq('unit_id', resolvedUnitId)
              .eq('exercise_code', exercise_code);
          }

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
              thai_template: item.thai_template || null,
              required_orders: item.required_orders || [1],
              model_answer: item.model_answer || '',
              acceptable_answers: item.acceptable_answers || [item.model_answer],
              translations: item.translations || null,
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

      return NextResponse.json({ success: true, message: 'บันทึกรายการคำถามและเฉลยเรียบร้อยแล้ว!' });
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
    const unitId = searchParams.get('unit_id');
    const exerciseCode = searchParams.get('exercise_code');

    // 1. DELETE UNIT
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

    // 2. DELETE EXERCISE
    if (action === 'delete_exercise' && exerciseCode) {
      if (isSupabaseConfigured() && supabase) {
        if (unitId) {
          await supabase
            .from('exercises')
            .delete()
            .eq('unit_id', unitId)
            .eq('exercise_code', exerciseCode);

          await supabase
            .from('exercise_items')
            .delete()
            .eq('unit_id', unitId)
            .eq('exercise_code', exerciseCode);
        }
      }
      return NextResponse.json({ success: true, message: `ลบแบบฝึกหัด ${exerciseCode} เรียบร้อยแล้ว!` });
    }

    return NextResponse.json({ error: 'Invalid delete action' }, { status: 400 });
  } catch (err: any) {
    console.error('Curriculum DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
