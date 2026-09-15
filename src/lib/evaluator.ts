import { checkOfflineGrammarAndSpelling, checkGuidedSentenceExercise } from './offline-checker';
import { evaluatePictureLocally } from './picture-evaluator';
import { evaluateWithGemini } from './ai-evaluator';
import type { ExerciseItem, ExerciseType, Category, Word } from './types';

export interface EvaluationRequest {
  exerciseType: ExerciseType;
  item: ExerciseItem;
  studentAnswer: string;
  categories?: Category[];
  wordBank?: Record<string, (Word | string)[]>;
  templates?: string[];
  useAiCheck?: boolean;
}
export interface EvaluationResult {
  isCorrect: boolean;
  verdict?: 'correct' | 'incorrect' | 'needs_review';
  statusText: string;
  correctedSentence: string;
  feedbackPoints: string[];
  studentTranslation?: string;
  breakdown?: Record<string, boolean>;
  isLiveGemini?: boolean;
  modelUsed?: string;
}
export async function evaluateAnswer(req: EvaluationRequest): Promise<EvaluationResult> {
  const trimmed = req.studentAnswer?.trim() || '';
  if (!trimmed) {
    return {
      isCorrect: false,
      verdict: 'incorrect',
      isLiveGemini: false,
      modelUsed: 'validation',
      statusText: 'กรุณาพิมพ์คำตอบก่อนส่งตรวจค่ะ',
      correctedSentence: '',
      feedbackPoints: ['กรุณาพิมพ์คำตอบก่อนส่งตรวจค่ะ'],
      breakdown: { grammar: false, structure: false, meaning: false },
    };
  }

  // 1. If AI check is enabled and API key is present, ALWAYS evaluate with Gemini AI!
  const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)?.trim();
  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && req.useAiCheck !== false) {
    try {
      const aiResult = await evaluateWithGemini(req, apiKey);
      return aiResult;
    } catch (error) {
      console.warn('Live Gemini AI evaluation failed, falling back to local evaluator:', error instanceof Error ? error.message : error);
    }
  }

  // 2. Pure offline / deterministic fallback engine
  if (req.exerciseType === 'picture_description') {
    return evaluatePictureLocally(req);
  }

  const result = req.exerciseType === 'guided_sentence'
    ? checkGuidedSentenceExercise(req.item, req.studentAnswer, req.categories || [])
    : checkOfflineGrammarAndSpelling(req.item, req.studentAnswer);

  return {
    isCorrect: result.isCorrect,
    verdict: result.isCorrect ? 'correct' : 'incorrect',
    statusText: result.message,
    correctedSentence: '',
    feedbackPoints: result.points,
    studentTranslation: result.translation,
    isLiveGemini: false,
    modelUsed: 'workbook-rules',
  };
}
