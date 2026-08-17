import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import chapter1Fallback from '@/data/sentence-builder-vol-2/chapter-1.json';

// Fetch Book Information by Slug or ID
export async function getBookDataFromDb(slugOrId: string): Promise<any> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: bookRow } = await supabase
        .from('books')
        .select('*')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();

      if (bookRow) {
        // Fetch all units for this book
        const { data: unitsData } = await supabase
          .from('units')
          .select('*, exercises(count)')
          .eq('book_name', bookRow.id)
          .order('unit_number', { ascending: true });

        return {
          ...bookRow,
          units: unitsData || []
        };
      }
    } catch (err) {
      console.warn('Could not fetch book by slug:', err);
    }
  }

  return {
    id: slugOrId,
    slug: slugOrId,
    title: slugOrId === 'sentence-builder-vol-2' ? 'Sentence Builder Vol. 2' : slugOrId,
    subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยคภาษาอังกฤษ',
    units: []
  };
}

// Save Chapter Data directly into Supabase SQL Database
export async function saveChapterDataToDb(data: any): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase is not configured; skipping save to DB');
    return false;
  }

  try {
    const bookName = data.book || 'sentence-builder-vol-2';
    const unitNumber = Number(data.chapter) || 1;

    // 1. Ensure Unit exists in 'units' table
    const { data: unitData, error: unitErr } = await supabase
      .from('units')
      .upsert({
        book_name: bookName,
        unit_number: unitNumber,
        title: data.title || `Unit ${unitNumber}`,
        subtitle: data.subtitle || `บทที่ ${unitNumber}`
      }, { onConflict: 'book_name,unit_number' })
      .select('id')
      .single();

    if (unitErr || !unitData) {
      console.error('Error upserting unit:', unitErr);
      return false;
    }

    const unitId = unitData.id;

    // 2. Iterate through exercises and save question items
    if (data.exercises) {
      for (const [exCode, exObj] of Object.entries<any>(data.exercises)) {
        // Upsert exercise configuration
        await supabase.from('exercises').upsert({
          unit_id: unitId,
          exercise_code: exCode,
          title: exObj.title || `Exercise: ${exCode}`,
          exercise_type: exObj.type || 'translation',
          use_ai_check: exObj.use_ai_check !== false,
          instruction: exObj.instruction,
          guidance: exObj.guidance,
          word_bank: exObj.word_bank || null
        }, { onConflict: 'unit_id,exercise_code' });

        // Upsert items if present
        if (Array.isArray(exObj.items)) {
          for (let i = 0; i < exObj.items.length; i++) {
            const item = exObj.items[i];
            const itemNumber = item.id || (i + 1);

            await supabase.from('exercise_items').upsert({
              unit_id: unitId,
              exercise_code: exCode,
              item_number: itemNumber,
              thai_prompt: item.thai || null,
              prompt: item.prompt || null,
              model_answer: item.model_answer || '',
              acceptable_answers: item.acceptable_answers || [item.model_answer],
              image_description: item.image_description || null,
              context_hint: item.context_hint || null,
              teacher_guidance: item.teacher_guidance || null
            }, { onConflict: 'unit_id,exercise_code,item_number' });
          }
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Error saving chapter data to Supabase:', err);
    return false;
  }
}

// Fetch Chapter/Unit Exercise Data directly from Supabase SQL Database
export async function getChapterDataFromDb(slugOrId: string = 'sentence-builder-vol-2', unitNumber: number = 1): Promise<any> {
  if (isSupabaseConfigured() && supabase) {
    try {
      // 0. Resolve actual book ID from slug or id
      let targetBookId = slugOrId;
      const { data: bookRow } = await supabase
        .from('books')
        .select('id, slug, title')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();
      
      if (bookRow) {
        targetBookId = bookRow.id;
      }

      // 1. Fetch Unit from SQL 'units' table
      const { data: unitData, error: unitErr } = await supabase
        .from('units')
        .select('*')
        .eq('book_name', targetBookId)
        .eq('unit_number', unitNumber)
        .maybeSingle();

      if (!unitErr && unitData) {
        // 2. Fetch Exercises configurations from 'exercises' table
        const { data: exercisesConfig } = await supabase
          .from('exercises')
          .select('*')
          .eq('unit_id', unitData.id)
          .order('created_at', { ascending: true });

        // 3. Fetch Exercise Items from SQL 'exercise_items' table
        const { data: itemsData } = await supabase
          .from('exercise_items')
          .select('*')
          .eq('unit_id', unitData.id)
          .order('item_number', { ascending: true });

        const exercisesObj: Record<string, any> = {};

        if (exercisesConfig && exercisesConfig.length > 0) {
          exercisesConfig.forEach(ex => {
            const exItems = (itemsData || []).filter(i => i.exercise_code === ex.exercise_code);
            exercisesObj[ex.exercise_code] = {
              id: ex.exercise_code,
              title: ex.title,
              type: ex.exercise_type || 'translation',
              use_ai_check: ex.use_ai_check !== false,
              instruction: ex.instruction,
              guidance: ex.guidance,
              word_bank: ex.word_bank || chapter1Fallback.exercises['ex-2']?.word_bank,
              items: exItems.map(i => ({
                id: i.item_number,
                thai: i.thai_prompt,
                prompt: i.prompt,
                model_answer: i.model_answer,
                acceptable_answers: i.acceptable_answers || [i.model_answer],
                image_url: i.image_url,
                image_description: i.image_description,
                context_hint: i.context_hint,
                teacher_guidance: i.teacher_guidance || ex.guidance
              }))
            };
          });
        } else if (itemsData && itemsData.length > 0) {
          const ex1Items = itemsData.filter(i => i.exercise_code === 'ex-1');
          const ex2Items = itemsData.filter(i => i.exercise_code === 'ex-2');
          const ex3Items = itemsData.filter(i => i.exercise_code === 'ex-3');

          exercisesObj['ex-1'] = {
            id: 'ex-1',
            title: 'Exercise 1: แปลประโยคภาษาอังกฤษ',
            type: 'translation',
            use_ai_check: true,
            items: ex1Items.map(i => ({
              id: i.item_number,
              thai: i.thai_prompt,
              model_answer: i.model_answer,
              acceptable_answers: i.acceptable_answers || [i.model_answer]
            }))
          };

          exercisesObj['ex-2'] = {
            id: 'ex-2',
            title: 'Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค',
            type: 'guided_sentence',
            use_ai_check: true,
            word_bank: chapter1Fallback.exercises['ex-2'].word_bank,
            items: ex2Items.map(i => ({
              id: i.item_number,
              prompt: i.prompt,
              model_answer: i.model_answer,
              acceptable_answers: i.acceptable_answers || [i.model_answer]
            }))
          };

          exercisesObj['ex-3'] = {
            id: 'ex-3',
            title: 'Exercise 3: ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect',
            type: 'picture_description',
            use_ai_check: true,
            items: ex3Items.map(i => ({
              id: i.item_number,
              image_description: i.image_description,
              context_hint: i.context_hint,
              model_answer: i.model_answer
            }))
          };
        }

        return {
          book: targetBookId,
          slug: bookRow?.slug || targetBookId,
          chapter: unitNumber,
          title: unitData.title,
          subtitle: unitData.subtitle,
          exercises: exercisesObj
        };
      }
    } catch (err) {
      console.warn('Error fetching chapter data from Supabase:', err);
    }
  }

  // Local JSON fallback
  return {
    book: slugOrId,
    chapter: unitNumber,
    title: chapter1Fallback.title,
    subtitle: chapter1Fallback.subtitle,
    exercises: chapter1Fallback.exercises
  };
}
