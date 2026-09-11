import { checkOfflineGrammarAndSpelling, checkGuidedSentenceExercise } from './offline-checker';
import { evaluatePictureAnswer } from './picture-evaluator';
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
  if (req.exerciseType === 'picture_description') return evaluatePictureAnswer(req);
  const result = req.exerciseType === 'guided_sentence'
    ? checkGuidedSentenceExercise(req.item, req.studentAnswer, req.categories || [])
    : checkOfflineGrammarAndSpelling(req.item, req.studentAnswer);
  return {
    isCorrect: result.isCorrect, verdict: result.isCorrect ? 'correct' : 'incorrect',
    statusText: result.message, correctedSentence: '', feedbackPoints: result.points,
    studentTranslation: result.translation, isLiveGemini: false, modelUsed: 'workbook-rules',
  };
}
