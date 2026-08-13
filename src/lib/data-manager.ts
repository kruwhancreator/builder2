import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import chapter1Fallback from '@/data/sentence-builder-vol-2/chapter-1.json';

// Fetch Chapter Exercise Data directly from Supabase SQL Database
export async function getChapterDataFromDb(bookName: string = 'sentence-builder-vol-2', unitNumber: number = 1): Promise<any> {
  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Fetch Unit from SQL 'units' table
      const { data: unitData, error: unitErr } = await supabase
        .from('units')
        .select('*')
        .eq('book_name', bookName)
        .eq('unit_number', unitNumber)
        .single();

      if (!unitErr && unitData) {
        // 2. Fetch Exercise Items from SQL 'exercise_items' table
        const { data: itemsData } = await supabase
          .from('exercise_items')
          .select('*')
          .eq('unit_id', unitData.id)
          .order('item_number', { ascending: true });

        if (itemsData && itemsData.length > 0) {
          const ex1Items = itemsData.filter(i => i.exercise_code === 'ex-1');
          const ex2Items = itemsData.filter(i => i.exercise_code === 'ex-2');
          const ex3Items = itemsData.filter(i => i.exercise_code === 'ex-3');

          return {
            book: bookName,
            chapter: unitNumber,
            title: unitData.title,
            subtitle: unitData.subtitle,
            exercises: {
              'ex-1': {
                id: 'ex-1',
                title: 'Exercise 1: แปลประโยคภาษาอังกฤษ',
                type: 'translation',
                items: ex1Items.map(i => ({
                  id: i.item_number,
                  thai: i.thai_prompt,
                  model_answer: i.model_answer,
                  acceptable_answers: i.acceptable_answers || [i.model_answer]
                }))
              },
              'ex-2': {
                id: 'ex-2',
                title: 'Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค',
                type: 'guided_sentence',
                word_bank: chapter1Fallback.exercises['ex-2'].word_bank,
                items: ex2Items.map(i => ({
                  id: i.item_number,
                  prompt: i.prompt,
                  model_answer: i.model_answer,
                  acceptable_answers: i.acceptable_answers || [i.model_answer]
                }))
              },
              'ex-3': {
                id: 'ex-3',
                title: 'Exercise 3: ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect',
                type: 'picture_description',
                items: ex3Items.map(i => ({
                  id: i.item_number,
                  image_description: i.image_description,
                  context_hint: i.context_hint,
                  model_answer: i.model_answer,
                  image_url: i.image_url
                }))
              }
            }
          };
        }
      }
    } catch (err) {
      console.warn('Supabase DB fetch fallback to local JSON:', err);
    }
  }

  // Fallback to local initial dataset if Supabase is not configured yet
  return chapter1Fallback;
}

// Save/Update Exercise Item into Supabase SQL Database
export async function saveChapterDataToDb(newData: any): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: 'ยังไม่ได้เชื่อมต่อ Supabase! กรุณากรอก NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ในไฟล์ .env.local'
    };
  }

  try {
    const bookName = newData.book || 'sentence-builder-vol-2';
    const unitNumber = Number(newData.chapter || 1);

    // Upsert Unit row into SQL 'units' table
    const { data: unitRow, error: unitErr } = await supabase
      .from('units')
      .upsert({
        book_name: bookName,
        unit_number: unitNumber,
        title: newData.title || 'Present Continuous & Sentence Expansion',
        subtitle: newData.subtitle || `บทที่ ${unitNumber} : ฉันกำลัง…`
      }, { onConflict: 'book_name,unit_number' })
      .select('id')
      .single();

    if (unitErr || !unitRow) {
      console.error('Failed to upsert unit row:', unitErr);
      return {
        success: false,
        error: `Supabase Error (units table): ${unitErr?.message || 'Failed to update units table'}`
      };
    }

    const unitId = unitRow.id;

    // Upsert Exercise Items into SQL 'exercise_items' table
    for (const exKey of ['ex-1', 'ex-2', 'ex-3']) {
      const exGroup = newData.exercises[exKey];
      if (exGroup && exGroup.items) {
        for (let idx = 0; idx < exGroup.items.length; idx++) {
          const item = exGroup.items[idx];
          const { error: itemErr } = await supabase.from('exercise_items').upsert({
            unit_id: unitId,
            exercise_code: exKey,
            item_number: idx + 1,
            thai_prompt: item.thai || null,
            prompt: item.prompt || null,
            model_answer: item.model_answer,
            acceptable_answers: item.acceptable_answers || [item.model_answer],
            image_description: item.image_description || null,
            context_hint: item.context_hint || null,
            image_url: item.image_url || null
          }, { onConflict: 'unit_id,exercise_code,item_number' });

          if (itemErr) {
            console.error('Failed to upsert exercise item:', itemErr);
            return {
              success: false,
              error: `Supabase Error (exercise_items table): ${itemErr.message}`
            };
          }
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Supabase DB save error:', err);
    return {
      success: false,
      error: `เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase: ${err?.message || String(err)}`
    };
  }
}
