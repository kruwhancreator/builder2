import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import chapter1Fallback from '@/data/sentence-builder-vol-2/chapter-1.json';

// High-Performance In-Memory Cache (TTL: 5 minutes)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const bookCache = new Map<string, CacheEntry<any>>();
const chapterCache = new Map<string, CacheEntry<any>>();

export function clearDataManagerCache(): void {
  bookCache.clear();
  chapterCache.clear();
}

// Fetch Book Information by Slug or ID with In-Memory Caching
export async function getBookDataFromDb(slugOrId: string): Promise<any> {
  const cacheKey = slugOrId.toLowerCase();
  const cached = bookCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: bookRow } = await supabase
        .from('books')
        .select('*')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();

      if (bookRow) {
        // Fetch all units for this book
        const bookIdentifier = bookRow.id;
        const bookSlugVal = bookRow.slug || bookRow.id;

        const { data: unitsData } = await supabase
          .from('units')
          .select('*, exercises(count)')
          .or(`book_name.eq.${bookIdentifier},book_name.eq.${bookSlugVal}`)
          .order('unit_number', { ascending: true });

        const formattedUnits = (unitsData || []).map(u => {
          const exCount = Array.isArray(u.exercises) && u.exercises[0] ? u.exercises[0].count : 0;
          return {
            ...u,
            exerciseCount: exCount
          };
        });

        const defaultUnit1 = {
          id: 'unit-1',
          unit_number: 1,
          title: chapter1Fallback.title || 'Present Continuous & Sentence Expansion',
          subtitle: chapter1Fallback.subtitle || 'บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]',
          exerciseCount: 3
        };

        const finalUnits = formattedUnits.length > 0 
          ? formattedUnits 
          : (bookSlugVal === 'sentence-builder-vol-2' || bookIdentifier === 'sentence-builder-vol-2' ? [defaultUnit1] : []);

        const result = {
          ...bookRow,
          title: bookRow.title || (bookSlugVal === 'sentence-builder-vol-2' ? 'Sentence Builder Vol. 2' : bookSlugVal),
          units: finalUnits
        };

        bookCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err) {
      console.warn('Could not fetch book by slug:', err);
    }
  }

  const defaultUnit1 = {
    id: 'unit-1',
    unit_number: 1,
    title: chapter1Fallback.title || 'Present Continuous & Sentence Expansion',
    subtitle: chapter1Fallback.subtitle || 'บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]',
    exerciseCount: 3
  };

  const isVol2 = slugOrId === 'sentence-builder-vol-2';
  const fallback = {
    id: slugOrId,
    slug: slugOrId,
    title: isVol2 ? 'Sentence Builder Vol. 2' : slugOrId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2 (Core + Context + Connect)',
    units: isVol2 ? [defaultUnit1] : []
  };

  bookCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
  return fallback;
}

// Save Chapter Data directly into Supabase SQL Database
export async function saveChapterDataToDb(data: any): Promise<boolean> {
  // Clear cache to ensure immediate fresh data
  clearDataManagerCache();

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
              thai_prompt: item.thai || item.thai_prompt || null,
              prompt: item.prompt || null,
              thai_template: item.thai_template || null,
              required_orders: item.required_orders || [1],
              translations: item.translations || null,
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

// Fetch Chapter/Unit Exercise Data directly from Supabase SQL Database with Parallel Queries & Cache
export async function getChapterDataFromDb(slugOrId: string = 'sentence-builder-vol-2', unitNumber: number = 1): Promise<any> {
  const cacheKey = `${slugOrId.toLowerCase()}_${unitNumber}`;
  const cached = chapterCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      // 0. Fetch Book & Unit in parallel if possible
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
        // 2. Fetch Exercises configurations AND Items in PARALLEL (Cut latency by 50%)
        const [exercisesConfigRes, itemsDataRes] = await Promise.all([
          supabase
            .from('exercises')
            .select('*')
            .eq('unit_id', unitData.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('exercise_items')
            .select('*')
            .eq('unit_id', unitData.id)
            .order('item_number', { ascending: true })
        ]);

        const exercisesConfig = (exercisesConfigRes.data || []).sort((a, b) => {
          if (typeof a.order_index === 'number' && typeof b.order_index === 'number') {
            if (a.order_index !== b.order_index) return a.order_index - b.order_index;
          }
          const numA = parseInt((a.exercise_code || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt((b.exercise_code || '').replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return (a.exercise_code || '').localeCompare(b.exercise_code || '');
        });
        const itemsData = itemsDataRes.data;
        const exercisesObj: Record<string, any> = {};

        if (exercisesConfig && exercisesConfig.length > 0) {
          exercisesConfig.forEach(ex => {
            const exItems = (itemsData || []).filter(i => i.exercise_code === ex.exercise_code);
            const inferredType = ex.exercise_type || (ex.exercise_code === 'ex-2' || ex.categories || ex.word_bank ? 'guided_sentence' : (ex.exercise_code === 'ex-3' ? 'picture_description' : 'translation'));
            exercisesObj[ex.exercise_code] = {
              id: ex.exercise_code,
              code: ex.exercise_code,
              order_index: typeof ex.order_index === 'number' ? ex.order_index : (parseInt((ex.exercise_code || '').replace(/\D/g, ''), 10) || 1),
              title: ex.title,
              type: inferredType,
              use_ai_check: ex.use_ai_check !== false,
              instruction: ex.instruction,
              guidance: ex.guidance,
              categories: ex.categories || (unitNumber === 1 && (inferredType === 'guided_sentence' || ex.exercise_code === 'ex-2') ? (chapter1Fallback.exercises['ex-2'] as any)?.categories : null),
              word_bank: ex.word_bank || (unitNumber === 1 && (inferredType === 'guided_sentence' || ex.exercise_code === 'ex-2') ? (chapter1Fallback.exercises['ex-2'] as any)?.word_bank : null),
              items: exItems.map(i => ({
                id: i.item_number,
                thai: i.thai_prompt,
                thai_prompt: i.thai_prompt,
                prompt: i.prompt,
                thai_template: i.thai_template || null,
                required_orders: i.required_orders || [1],
                translations: i.translations || null,
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
              thai_prompt: i.thai_prompt,
              model_answer: i.model_answer,
              acceptable_answers: i.acceptable_answers || [i.model_answer]
            }))
          };

          exercisesObj['ex-2'] = {
            id: 'ex-2',
            title: 'Exercise 2: เลือกคำจากตารางมาแต่งประโยค',
            type: 'guided_sentence',
            use_ai_check: true,
            categories: unitNumber === 1 ? (chapter1Fallback.exercises['ex-2'] as any)?.categories : null,
            word_bank: unitNumber === 1 ? (chapter1Fallback.exercises['ex-2'] as any)?.word_bank : null,
            items: ex2Items.map(i => ({
              id: i.item_number,
              prompt: i.prompt,
              thai_template: i.thai_template || null,
              required_orders: i.required_orders || [1],
              translations: i.translations || null,
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

        const result = {
          book: targetBookId,
          slug: bookRow?.slug || targetBookId,
          chapter: unitNumber,
          title: unitData.title,
          subtitle: unitData.subtitle,
          exercises: exercisesObj
        };

        // Cache the result for instant subsequent navigations
        chapterCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err) {
      console.warn('Error fetching chapter data from Supabase:', err);
    }
  }

  // Local JSON fallback
  const fallbackResult = {
    book: slugOrId,
    chapter: unitNumber,
    title: chapter1Fallback.title,
    subtitle: chapter1Fallback.subtitle,
    exercises: chapter1Fallback.exercises
  };

  chapterCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
  return fallbackResult;
}
