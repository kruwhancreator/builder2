import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/evaluator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exerciseType, item, studentAnswer, wordBank, templates } = body;

    if (!exerciseType || !item || typeof studentAnswer !== 'string') {
      return NextResponse.json(
        { error: 'Missing required evaluation fields' },
        { status: 400 }
      );
    }

    const evaluation = await evaluateAnswer({
      exerciseType,
      item,
      studentAnswer,
      wordBank,
      templates,
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
