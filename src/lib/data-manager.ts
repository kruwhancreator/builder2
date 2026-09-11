import 'server-only';
import { supabase } from './supabase';
import chapter1Fallback from '@/data/sentence-builder-vol-2/chapter-1.json';
import { validSlug, positiveInteger } from './api-validation';
import type { Book, Chapter, Exercise, ExerciseItem, ExerciseType } from './types';

import { clearEvaluationsCache } from './evaluations-cache';

// Clear evaluation and curriculum cache when data is modified
export function clearDataManagerCache(): void {
  clearEvaluationsCache();
}

export async function getBookDataFromDb(slugOrId: string): Promise<Book | null> {
  if (!validSlug(slugOrId)) return null;
  if (!supabase) {
    if (slugOrId !== 'sentence-builder-vol-2') return null;
    return { id: slugOrId, slug: slugOrId, title: 'Sentence Builder Vol. 2',
      subtitle: 'แบบฝึกหัดแต่งประโยคและขยายประโยค (Core + Context + Connect)',
      units: [{ id: 'unit-1', unit_number: 1, title: chapter1Fallback.title, subtitle: chapter1Fallback.subtitle, exerciseCount: 3 }] };
  }
  const { data: book, error } = await supabase.from('books').select('*').or(`slug.eq.${slugOrId},id.eq.${slugOrId}`).maybeSingle();
  if (error) throw new Error('Unable to load book');
  if (!book) return null;
  const { data: units, error: unitError } = await supabase.from('units').select('id, unit_number, title, subtitle, exercises(count)').eq('book_name', book.id).order('unit_number');
  if (unitError) throw new Error('Unable to load units');
  return { ...book, slug: book.slug || book.id, units: (units || []).map(u => ({ ...u, exerciseCount: u.exercises?.[0]?.count || 0 })) };
}

export async function getChapterDataFromDb(slugOrId = 'sentence-builder-vol-2', unitNumber = 1): Promise<Chapter | null> {
  if (!validSlug(slugOrId) || !positiveInteger(unitNumber)) return null;
  if (!supabase) {
    if (slugOrId !== 'sentence-builder-vol-2' || unitNumber !== 1) return null;
    return { ...chapter1Fallback, book: slugOrId, slug: slugOrId, book_title: 'Sentence Builder Vol. 2',
      exercises: Object.fromEntries(Object.entries(chapter1Fallback.exercises).map(([code, ex]) => [code, { ...ex, id: code, code }])) as Record<string, Exercise> };
  }
  const { data: book, error: bookError } = await supabase.from('books').select('id,slug,title').or(`slug.eq.${slugOrId},id.eq.${slugOrId}`).maybeSingle();
  if (bookError) throw new Error('Unable to load book');
  if (!book) return null;
  const { data: unit, error: unitError } = await supabase.from('units').select('*').eq('book_name', book.id).eq('unit_number', unitNumber).maybeSingle();
  if (unitError) throw new Error('Unable to load chapter');
  if (!unit) return null;
  const [config, questions] = await Promise.all([
    supabase.from('exercises').select('*').eq('unit_id', unit.id).order('order_index'),
    supabase.from('exercise_items').select('*').eq('unit_id', unit.id).order('item_number'),
  ]);
  if (config.error || questions.error) throw new Error('Unable to load exercises');
  const exercises: Record<string, Exercise> = {};
  for (const ex of config.data || []) {
    const type = (ex.exercise_type || (ex.exercise_code === 'ex-3' ? 'picture_description' : ex.exercise_code === 'ex-2' ? 'guided_sentence' : 'translation')) as ExerciseType;
    exercises[ex.exercise_code] = {
      ...ex, id: ex.id, code: ex.exercise_code, type,
      items: (questions.data || []).filter(i => i.exercise_code === ex.exercise_code).map(i => ({
        ...i, id: i.item_number, thai: i.thai_prompt || '',
        teacher_guidance: i.teacher_guidance || ex.guidance || '',
      }) as ExerciseItem),
    };
  }
  return { book: book.id, slug: book.slug || book.id, book_title: book.title, chapter: unitNumber,
    title: unit.title, subtitle: unit.subtitle, exercises };
}
