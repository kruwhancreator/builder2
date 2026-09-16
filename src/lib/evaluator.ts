import { checkOfflineGrammarAndSpelling, checkGuidedSentenceExercise } from './offline-checker';
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

  // Pure deterministic rules engine
  if (req.exerciseType === 'picture_description') {
    const norm = (s: string) => s.trim().toLowerCase().replace(/[.!?]/g, '').replace(/\s+/g, ' ');
    const ans = norm(req.studentAnswer);
    const acceptable = [req.item.model_answer, ...(req.item.acceptable_answers || []), ...(req.item.possible_answers?.map(p => p.en) || [])]
      .filter(Boolean)
      .map(norm);
    const isCorrect = acceptable.includes(ans);
    return {
      isCorrect,
      verdict: isCorrect ? 'correct' : 'incorrect',
      statusText: isCorrect ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏' : 'คำตอบยังไม่ตรงกับตัวอย่างเฉลยค่ะ',
      correctedSentence: req.item.model_answer,
      feedbackPoints: isCorrect ? [] : ['ลองดูตัวอย่างเฉลยที่เป็นไปได้ด้านล่างเพื่อเปรียบเทียบนะคะ'],
      isLiveGemini: false,
      modelUsed: 'workbook-rules',
    };
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

