import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/evaluator';
import { getChapterDataFromDb } from '@/lib/data-manager';
import { trackExerciseCheck } from '@/lib/analytics-store';
import { positiveInteger, readJson, validSlug } from '@/lib/api-validation';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await readJson(req, 8000); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { bookName, chapter, exerciseId, itemId, studentAnswer } = body;
  if (!validSlug(bookName) || !positiveInteger(chapter) || !validSlug(exerciseId) || !positiveInteger(itemId) ||
      typeof studentAnswer !== 'string' || !studentAnswer.trim() || studentAnswer.length > 1500) {
    return NextResponse.json({ error: 'Provide a valid question and an answer of 1–1500 characters' }, { status: 400 });
  }
  try {
    const data = await getChapterDataFromDb(bookName, chapter);
    const exercise = data?.exercises[exerciseId];
    const sourceItem = exercise?.items.find(i => i.id === itemId);
    if (!data || !exercise || !sourceItem) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    const item = { ...sourceItem, teacher_guidance: sourceItem.teacher_guidance || exercise.guidance || '',
      unit_title: data.title, unit_subtitle: data.subtitle, exercise_instruction: exercise.instruction,
      exercise_guidance: exercise.guidance, grammar_focus: exercise.grammar_focus, structure_required: exercise.structure_required };
    
    const result = await evaluateAnswer({
      exerciseType: exercise.type,
      item,
      studentAnswer,
      categories: exercise.categories,
      wordBank: exercise.word_bank,
      useAiCheck: false
    });

    if (result.verdict !== 'needs_review') await trackExerciseCheck(data.book, chapter, result.isCorrect);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Answer evaluation failed:', error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({ error: 'ระบบยังตรวจคำตอบไม่ได้ค่ะ กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}

