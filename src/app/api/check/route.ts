import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/evaluator';
import { getChapterDataFromDb } from '@/lib/data-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exerciseType, itemIndex, exerciseId, studentAnswer, chapter } = body;

    // Load dynamic chapter data from Supabase SQL Database
    const chapterData = await getChapterDataFromDb('sentence-builder-vol-2', 1);
    const exercise = chapterData?.exercises?.[exerciseId];
    const currentItem = exercise?.items?.[itemIndex] || body.item;

    if (!exerciseType || !currentItem || typeof studentAnswer !== 'string') {
      return NextResponse.json(
        { error: 'Missing required evaluation fields' },
        { status: 400 }
      );
    }

    const evaluation = await evaluateAnswer({
      exerciseType,
      item: currentItem,
      studentAnswer,
      wordBank: exercise?.word_bank || body.wordBank,
      templates: exercise?.templates || body.templates,
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
