import type { EvaluationRequest, EvaluationResult } from './evaluator';
import type { ExerciseItem } from './types';
import { checkStructureCompliance, matchesModelOrAcceptable, normalizeContractions, normalizeTypography } from './offline-checker';
import { evaluateWithGemini } from './ai-evaluator';

export const PICTURE_RUBRIC_VERSION = 'meaning-v4';

export interface PictureAssessment {
  grammarValid: boolean;
  structureValid: boolean;
  imageRelevant: boolean;
  meaningValid: boolean;
  connectorValid: boolean;
  needsClarification: boolean;
  feedbackPoints: string[];
  correctedSentence: string;
  studentTranslation: string;
}

const checks = ['grammarValid', 'structureValid', 'imageRelevant', 'meaningValid', 'connectorValid', 'needsClarification'] as const;

export function parsePictureAssessment(value: unknown): PictureAssessment {
  if (!value || typeof value !== 'object') throw new Error('Invalid assessment');
  const obj = value as Record<string, unknown>;
  if (checks.some(key => typeof obj[key] !== 'boolean') ||
      !Array.isArray(obj.feedbackPoints) || !obj.feedbackPoints.every(p => typeof p === 'string') ||
      typeof obj.correctedSentence !== 'string' || typeof obj.studentTranslation !== 'string') {
    throw new Error('Incomplete assessment');
  }
  return obj as unknown as PictureAssessment;
}

/**
 * General semantic and pragmatic checks for Thai learners:
 * 1. Incomplete purposive infinitives (e.g. "to clean" without an object or resultative)
 * 2. Concessive contradiction with "even when" (where condition is the cause rather than an obstacle)
 * 3. Topic & action relevance against exercise context/image description
 */
export function checkPictureMeaning(answer: string, item?: ExerciseItem): string[] {
  // If the answer matches the teacher's model answer, it is logically and contextually valid
  if (item && matchesModelOrAcceptable(answer, item)) {
    return [];
  }

  const text = normalizeContractions(answer).toLowerCase().replace(/[.!?]+$/, '').trim();
  const points: string[] = [];

  // 1. Incomplete Transitive Purpose ("to + V")
  // Thai learners often translate "เพื่อทำความสะอาด" directly into "to clean" without specifying object/predicate.
  const bareTransitivePurpose = /\bto\s+(clean|fix|repair|tidy|solve)\s*(?:even when|although|because|but|so|when|while|[.!?]|$)/i;
  const bareMatch = text.match(bareTransitivePurpose);
  if (bareMatch) {
    const verb = bareMatch[1].toLowerCase();
    if (verb === 'clean') {
      points.push('คำว่า "to clean" ในส่วนบอกวัตถุประสงค์ยังไม่ชัดเจนในภาษาอังกฤษค่ะ แนะนำให้ระบุสิ่งที่ทำความสะอาดให้ชัดเจน เช่น "to keep them clean" (เพื่อรักษาความสะอาด) หรือ "to remove germs" นะคะ');
    } else {
      points.push(`คำว่า "to ${verb}" ในส่วนบอกวัตถุประสงค์จำเป็นต้องมีกรรมมารองรับด้วยนะคะ เช่น ระบุสิ่งของหรือผลลัพธ์ที่ต้องการให้ชัดเจนค่ะ`);
    }
  }

  // 2. Concessive Semantic Contradiction with "even when"
  // "even when" (แม้กระทั่งเมื่อ) requires an obstacle or contrary expectation, NOT the direct motivation/cause.
  // A) Washing / cleaning when dirty:
  if (/\b(?:wash|clean|brush|rinse)\b/i.test(text) && /\beven when\s+(?:i am|i'm|it is|it's|they are|they're)\s+(?:very\s+|really\s+|so\s+)?(?:dirty|messy|dusty|filthy|smelly)\b/i.test(text)) {
    points.push('"even when" ต้องเชื่อมกับเงื่อนไขที่เป็นอุปสรรคหรือขัดกับสิ่งที่คาดหมายค่ะ ในชีวิตประจำวันความสกปรกเป็นสาเหตุปกติที่ทำให้เราต้องล้างมือหรือทำความสะอาดอยู่แล้ว จึงไม่ขัดแย้งกัน ลองเปลี่ยนเงื่อนไขเป็นอุปสรรค เช่น "even when I\'m tired" (แม้จะเหนื่อย) หรือ "even when I\'m busy" (แม้จะยุ่ง) ให้ตรงกับโจทย์นะคะ');
  }

  // B) Eating / drinking when hungry / thirsty:
  if (/\b(?:eat|drink|snack|dine|have\s+(?:lunch|dinner|breakfast))\b/i.test(text) && /\beven when\s+(?:i am|i'm)\s+(?:very\s+|really\s+|so\s+)?(?:hungry|starving|famished|thirsty)\b/i.test(text)) {
    points.push('"even when" ควรเชื่อมกับเงื่อนไขที่ขัดแย้งกันค่ะ ความหิวหรือกระหายเป็นสาเหตุปกติในการรับประทาน/ดื่มอยู่แล้ว หากต้องการใช้ "even when" ลองใช้เงื่อนไขที่ขัดแย้ง เช่น "even when I\'m not hungry" หรือ "even when I\'m full" นะคะ');
  }

  // 3. Sport Defeat Collocation (e.g. "losing football" -> must be "losing football matches" or "losing at football")
  const invalidSportCollocation = /\b(lose|losing|lost)\s+(football|soccer|tennis|basketball|badminton|volleyball|baseball|rugby|golf|chess|cricket|table tennis|ping pong)(?!\s+(?:matches|match|games|game|tournaments|tournament|competitions|competition|series))\b/i;
  const sportMatch = text.match(invalidSportCollocation);
  if (sportMatch) {
    const verb = sportMatch[1].toLowerCase();
    const sport = sportMatch[2].toLowerCase();
    points.push(`คำว่า "${verb} ${sport}" ยังไม่ถูกต้องตามหลักภาษาอังกฤษค่ะ ในภาษาอังกฤษเมื่อพูดถึงการแพ้การแข่งขันกีฬา ไม่ใช้คำว่า "${verb} ${sport}" โดด ๆ แต่ควรใช้ "${verb} ${sport} matches" (เช่น "${verb} football matches") หรือ "${verb} at ${sport}" (เช่น "${verb} at football") นะคะ`);
  }

  // 4. Keyboard Typo Check (e.g. '|' instead of 'I')
  if (/[|]/.test(answer)) {
    points.push('ในประโยคมีเครื่องหมาย "|" แทนตัวอักษร "I" (ฉัน) แนะนำให้เปลี่ยนเป็นตัวอักษร "I" พิมพ์ใหญ่ เช่น "...but I still..." นะคะ');
  }

  // 5. Image & Context Relevance Heuristic (when item context is provided)
  if (item) {
    const desc = ((item.image_description || '') + ' ' + (item.context_hint || '')).toLowerCase();
    
    // Reading / study scene vs completely unrelated actions
    const isReadingScene = /(?:book|read|study|desk|library|yawn|sleepy|อ่านหนังสือ|เรียนรู้)/i.test(desc);
    const isLightSwitchScene = /(?:light switch|toggle switch|turn off|turn on|electricity|ปิดไฟ|ประหยัดไฟฟ้า)/i.test(desc);
    const isRunningScene = /(?:running|jogging|park|วิ่ง|สวนสาธารณะ|สุขภาพ)/i.test(desc);

    if (isReadingScene && /\b(?:wash|cook|bake|drive|swim|run|jog)\b/i.test(text)) {
      points.push('การกระทำในประโยคของนักเรียนยังไม่ตรงกับภาพที่กำหนดค่ะ ภาพนี้เป็นภาพคนกำลังอ่านหนังสือบนโต๊ะ (read books) ลองปรับการกระทำหลักให้ตรงกับภาพนะคะ');
    } else if (isLightSwitchScene && /\b(?:wash|cook|bake|drive|swim|run|jog|read)\b/i.test(text) && !/\b(?:turn off|turn on|switch|press|lights?)\b/i.test(text)) {
      points.push('การกระทำในประโยคของนักเรียนยังไม่ตรงกับภาพที่กำหนดค่ะ ภาพนี้เป็นการกดสวิตช์ปิดไฟ (turn off the lights) เพื่อประหยัดพลังงาน ลองปรับให้ตรงกับภาพนะคะ');
    } else if (isRunningScene && /\b(?:cook|bake|sleep|read|wash hands)\b/i.test(text)) {
      points.push('การกระทำในประโยคของนักเรียนยังไม่ตรงกับภาพที่กำหนดค่ะ ภาพนี้เป็นภาพการวิ่งออกกำลังกายในสวนสาธารณะ (running in the park) ลองปรับให้ตรงกับภาพนะคะ');
    }
  }

  // 6. Device & Appliance Collocation (e.g. "open/opening the air conditioning" -> must be "turn on/turning on")
  const invalidOpenApplianceRegex = /\b(open|opening|opened|opens|close|closing|closed|closes)\s+(?:the\s+)?(?:air\s+conditioning|air\s+conditioner|a[\/.]?c|ac\b|light|lights|lamp|lamps|tv|television|fan|computer|laptop|radio)\b/i;
  const applianceMatch = text.match(invalidOpenApplianceRegex);
  if (applianceMatch) {
    const matchedPhrase = applianceMatch[0];
    const isAC = /air|ac/i.test(matchedPhrase);
    const suggestion = isAC ? 'turning on the air conditioning' : 'turning on';
    points.push(`คำว่า "${matchedPhrase}" ยังไม่ถูกต้องตามหลักภาษาอังกฤษค่ะ ในภาษาอังกฤษเมื่อพูดถึงเครื่องใช้ไฟฟ้าหรือเครื่องปรับอากาศ จะไม่ใช้คำว่า "open/opening" หรือ "close/closing" (ซึ่งใช้กับการเปิดปิดประตูหรือหน้าต่าง) แต่ต้องใช้คำว่า "${suggestion}" หรือ "turning off" นะคะ`);
  }

  // 7. "listen to" requires preposition "to" before an object
  const listenMissingToRegex = /\b(listen|listening|listened|listens)\s+(music|songs?|podcasts?|radio)\b/i;
  const listenMatch = text.match(listenMissingToRegex);
  if (listenMatch) {
    const v = listenMatch[1];
    const n = listenMatch[2];
    points.push(`คำกริยา "${v}" เมื่อมีกรรมมารองรับ (เช่น ${n}) ต้องมีบุพบท "to" เสมอนะคะ เป็น "${v} to ${n}" ค่ะ`);
  }

  return points;
}

export function finalizePictureAssessment(assessment: PictureAssessment, answer: string, item?: ExerciseItem): EvaluationResult {
  const meaningPoints = checkPictureMeaning(answer, item);
  const hasFailure = checks.filter(k => k !== 'needsClarification').some(k => !assessment[k]) || meaningPoints.length > 0;
  const verdict = hasFailure ? 'incorrect' : assessment.needsClarification ? 'needs_review' : 'correct';
  return {
    isCorrect: verdict === 'correct',
    verdict,
    statusText: verdict === 'correct'
      ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏'
      : verdict === 'needs_review'
        ? 'ยังยืนยันความหมายไม่ได้ค่ะ ลองเพิ่มรายละเอียดหรือให้ครูช่วยตรวจนะคะ'
        : 'ใกล้แล้วค่ะ สู้ๆ นะคะ ลองปรับประโยคตามคำแนะนำค่ะ',
    correctedSentence: verdict === 'correct' ? '' : assessment.correctedSentence,
    studentTranslation: assessment.studentTranslation,
    feedbackPoints: Array.from(new Set([...meaningPoints, ...assessment.feedbackPoints])),
    breakdown: {
      grammar: assessment.grammarValid,
      structure: assessment.structureValid,
      image: assessment.imageRelevant,
      meaning: assessment.meaningValid && meaningPoints.length === 0,
      connector: assessment.connectorValid,
    },
  };
}

export function evaluatePictureLocally(req: EvaluationRequest): EvaluationResult {
  const trimmed = req.studentAnswer?.trim() || '';
  if (!trimmed) {
    return {
      isCorrect: false,
      verdict: 'incorrect',
      isLiveGemini: false,
      modelUsed: 'local-rules',
      statusText: 'กรุณาพิมพ์คำตอบก่อนส่งตรวจค่ะ',
      correctedSentence: '',
      feedbackPoints: ['กรุณาพิมพ์คำตอบก่อนส่งตรวจค่ะ'],
      breakdown: { grammar: false, structure: false, image: false, meaning: false, connector: false },
    };
  }

  // 1. Direct match with teacher's model answer or acceptable answers
  if (matchesModelOrAcceptable(trimmed, req.item)) {
    const raw = normalizeTypography(trimmed);
    const firstChar = raw.charAt(0);
    const isCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
    const hasFullStop = /[.!?]$/.test(raw);

    if (isCapital && hasFullStop) {
      return {
        isCorrect: true,
        verdict: 'correct',
        isLiveGemini: false,
        modelUsed: 'model-match',
        statusText: 'ถูกต้องเลยค่ะ เก่งมากเลย 👏',
        correctedSentence: '',
        feedbackPoints: ['ประโยคถูกต้องสมบูรณ์และตรงตามโครงสร้างที่กำหนดค่ะ'],
        studentTranslation: req.item.translation || '',
        breakdown: {
          grammar: true,
          structure: true,
          image: true,
          meaning: true,
          connector: true,
        },
      };
    } else {
      const points: string[] = [];
      if (!isCapital) points.push(`• ตัวแรกของประโยคต้องเป็นตัวพิมพ์ใหญ่ (Capital letter) เช่น "${raw.charAt(0).toUpperCase()}..." นะคะ`);
      if (!hasFullStop) points.push('• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ด้านหลังสุดของประโยคด้วยนะคะ');
      return {
        isCorrect: false,
        verdict: 'incorrect',
        isLiveGemini: false,
        modelUsed: 'model-match',
        statusText: 'ใกล้ถูกแล้วค่ะ! ปรับเครื่องหมายวรรคตอนอีกนิดเดียวนะคะ',
        correctedSentence: '',
        feedbackPoints: points,
        breakdown: {
          grammar: false,
          structure: true,
          image: true,
          meaning: true,
          connector: true,
        },
      };
    }
  }

  const guidance = req.item.teacher_guidance || req.item.exercise_guidance || req.item.grammar_focus || req.item.unit_subtitle || '';
  const structure = checkStructureCompliance(guidance, req.studentAnswer, req.item);
  const points = checkPictureMeaning(req.studentAnswer, req.item);

  if (!structure.isCompliant && structure.feedbackPoint) {
    if (!points.some(p => p.includes('|') && structure.feedbackPoint?.includes('|'))) {
      points.push(structure.feedbackPoint);
    }
  }

  if (points.length) {
    return {
      isCorrect: false,
      verdict: 'incorrect',
      isLiveGemini: false,
      modelUsed: 'local-rules',
      statusText: 'ใกล้แล้วค่ะ สู้ๆ นะคะ ลองปรับความหมายและโครงสร้างค่ะ',
      correctedSentence: '',
      feedbackPoints: points,
      breakdown: {
        grammar: true,
        structure: structure.isCompliant,
        image: !points.some(p => p.includes('ไม่ตรงกับภาพ')),
        meaning: !points.some(p => p.includes('วัตถุประสงค์') || p.includes('ความหมาย')),
        connector: !points.some(p => p.includes('even when') || p.includes('คำเชื่อม')),
      },
    };
  }

  const raw = normalizeTypography(trimmed);
  const firstChar = raw.charAt(0);
  const isCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
  const hasFullStop = /[.!?]$/.test(raw);

  if (structure.isCompliant && isCapital && hasFullStop) {
    return {
      isCorrect: true,
      verdict: 'correct',
      isLiveGemini: false,
      modelUsed: 'structure-match',
      statusText: 'ถูกต้องเลยค่ะ เก่งมากเลย 👏',
      correctedSentence: '',
      feedbackPoints: ['ประโยคถูกต้องสมบูรณ์และตรงตามโครงสร้างที่กำหนดค่ะ'],
      studentTranslation: req.item.translation || '',
      breakdown: {
        grammar: true,
        structure: true,
        image: true,
        meaning: true,
        connector: true,
      },
    };
  }

  return {
    isCorrect: false,
    verdict: 'needs_review',
    isLiveGemini: false,
    modelUsed: 'unavailable',
    statusText: 'ยังตรวจความหมายได้ไม่ครบค่ะ',
    correctedSentence: '',
    feedbackPoints: ['ระบบตรวจความหมายด้วย AI ยังไม่พร้อมใช้งานในขณะนี้ค่ะ ยังไม่ตัดสินว่าคำตอบถูกหรือผิด สามารถส่งคำตอบเดิมเพื่อลองตรวจอีกครั้งหรือให้ครูช่วยตรวจนะคะ'],
  };
}

export async function evaluatePictureAnswer(req: EvaluationRequest): Promise<EvaluationResult> {
  const trimmed = req.studentAnswer?.trim() || '';
  if (!trimmed) {
    return {
      isCorrect: false,
      verdict: 'incorrect',
      isLiveGemini: false,
      modelUsed: 'local-rules',
      statusText: 'กรุณาพิมพ์คำตอบก่อนส่งตรวจค่ะ',
      correctedSentence: '',
      feedbackPoints: ['กรุณาพิมพ์คำตอบก่อนส่งตรวจค่ะ'],
      breakdown: { grammar: false, structure: false, image: false, meaning: false, connector: false },
    };
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)?.trim();
  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && req.useAiCheck !== false) {
    try {
      return await evaluateWithGemini(req, apiKey);
    } catch (error) {
      console.warn('Live Gemini picture evaluation failed, falling back to local evaluator:', error instanceof Error ? error.message : error);
    }
  }

  return evaluatePictureLocally(req);
}
