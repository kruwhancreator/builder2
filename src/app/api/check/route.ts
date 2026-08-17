import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/evaluator';
import { getChapterDataFromDb } from '@/lib/data-manager';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exerciseType, itemIndex, exerciseId, studentAnswer, chapter, bookName = 'sentence-builder-vol-2' } = body;

    let useAiCheck = true;
    let teacherGuidance = '';
    let currentItem = body.item;
    let wordBank = body.wordBank;
    let templates = body.templates;

    // 1. Check if exercise in Supabase has 'use_ai_check' configured
    if (isSupabaseConfigured() && supabase && exerciseId) {
      try {
        const { data: exRow } = await supabase
          .from('exercises')
          .select('use_ai_check, guidance, instruction, word_bank')
          .eq('exercise_code', exerciseId)
          .maybeSingle();

        if (exRow) {
          useAiCheck = exRow.use_ai_check !== false;
          if (exRow.guidance) teacherGuidance = exRow.guidance;
          if (exRow.word_bank) wordBank = exRow.word_bank;
        }
      } catch (err) {
        console.warn('Could not load exercise config from DB:', err);
      }
    }

    // 2. Load item data from DB if not provided in body
    if (!currentItem) {
      const chapterData = await getChapterDataFromDb(bookName, Number(chapter) || 1);
      const exercise = chapterData?.exercises?.[exerciseId];
      currentItem = exercise?.items?.[itemIndex];
      if (exercise && typeof exercise.use_ai_check !== 'undefined') {
        useAiCheck = exercise.use_ai_check;
      }
    }

    if (!exerciseType || !currentItem || typeof studentAnswer !== 'string') {
      return NextResponse.json(
        { error: 'Missing required evaluation fields' },
        { status: 400 }
      );
    }

    // 3. Inject teacher guidance into item if available
    if (teacherGuidance && !currentItem.teacher_guidance) {
      currentItem.teacher_guidance = teacherGuidance;
    }

    // 4. Evaluate answer with explicit useAiCheck parameter
    const evaluation = await evaluateAnswer({
      exerciseType,
      item: currentItem,
      studentAnswer,
      wordBank,
      templates,
      useAiCheck: body.useAiCheck !== undefined ? body.useAiCheck : useAiCheck,
    });

    return NextResponse.json(evaluation);
  } catch (error: any) {
    console.error('Error in /api/check:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during evaluation' },
      { status: 500 }
    );
  }
}
