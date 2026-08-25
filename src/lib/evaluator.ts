import { GoogleGenAI } from '@google/genai';

export interface EvaluationRequest {
  exerciseType: 'translation' | 'guided_sentence' | 'picture_description';
  item: any;
  studentAnswer: string;
  wordBank?: any;
  templates?: string[];
  useAiCheck?: boolean; // When false, completely bypasses Gemini AI and runs local exact/rubric engine
}

export interface EvaluationResult {
  isCorrect?: boolean;
  score?: number;
  statusText: string;
  studentTranslation?: string;
  correctedSentence: string;
  feedbackPoints: string[];
  breakdown?: Record<string, any>;
  isLiveGemini?: boolean;
  modelUsed?: string;
}

export async function evaluateAnswer(req: EvaluationRequest): Promise<EvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 1. If AI check is disabled for this exercise (useAiCheck === false), bypass AI completely!
  if (req.useAiCheck === false) {
    return { ...evaluateLocally(req), isLiveGemini: false, modelUsed: 'deterministic-local-matcher' };
  }

  // 2. If AI check is enabled and API key is present, call Google Gemini AI
  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && apiKey.trim() !== '') {
    try {
      const geminiResult = await evaluateWithGemini(apiKey, req);
      return { ...geminiResult, isLiveGemini: true };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local evaluator:', err);
      return { ...evaluateLocally(req), isLiveGemini: false, modelUsed: 'local-fallback' };
    }
  }

  // 3. Default local evaluator fallback
  return { ...evaluateLocally(req), isLiveGemini: false, modelUsed: 'local-engine' };
}

async function evaluateWithGemini(apiKey: string, req: EvaluationRequest): Promise<EvaluationResult> {
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are Kru Whan (ครูหวาน) - an expert, warm, and encouraging English Language Teacher & Master Advisor for Thai students using the "Sentence Builder Vol. 2" system (Core + Context + Connect).
Your mission is to provide deep, accurate, pedagogical feedback in Thai that strictly analyzes the student's ACTUAL sentence without hallucinating hypothetical errors!

TONE & POLITE PARTICLES RULES:
- ALWAYS speak as Kru Whan (female teacher persona).
- ALWAYS use female polite ending particles: "ค่ะ", "นะคะ", "เลยค่ะ".
- NEVER EVER use male polite particles ("ครับ", "นะครับ").
- Keep feedback concise, friendly, and directly relevant (2-4 clear bullet points max).

CRITICAL ACCURACY & ERROR RELEVANCE RULES:
1. ONLY POINT OUT ERRORS THAT THE STUDENT ACTUALLY MADE:
   - If the student wrote "the lesson", "a book", "my notes", etc., they ALREADY have a determiner/article and are grammatically correct! NEVER claim they are missing a determiner if "the", "a", "an", or "my" is already present.
   - Only comment on missing determiners if a singular countable noun is literally placed alone without any article/possessive (e.g. writing "to review lesson" instead of "to review the lesson" / "to review lessons").

2. PARTS OF SPEECH & AUXILIARY VERB CHECKS:
   - Check Core: "I + do + [ V.ไม่ผัน / Base Form ]" (e.g. I do cook, I do read, I do study).
   - Check Context: "to + [ V.ไม่ผัน / Base Form ]" (e.g. to save money, to review the lesson).
   - Check Connect: "even when I'm + [ Adjective ]" (e.g. even when I'm tired / sleepy / exhausted).
   - If student wrote "I'm am sleep":
     "• พบข้อผิดพลาดเรื่องไวยากรณ์และชนิดของคำ: ในประโยคมี Verb to be ซ้ำซ้อน ('I'm am') และคำว่า 'sleep' เป็นคำกริยา/คำนามค่ะ หลังโครงสร้าง 'even when I'm' ต้องใช้คำคุณศัพท์ (Adjective) เช่น 'even when I'm sleepy' (ง่วงนอน) หรือ 'even when I'm tired' (เหนื่อย) นะคะ"

3. NATURAL ENGLISH NUANCES (Optional gentle tip):
   - If "read a book" is used for general reading habit:
     "• ในทางไวยากรณ์ 'read a book' ถูกต้องค่ะ (อ่านหนังสือ 1 เล่ม) แต่หากต้องการสื่อถึง 'นิสัยการอ่านหนังสือทั่วไป' ภาษาอังกฤษนิยมใช้คำนามพหูพจน์ เช่น 'read books' มากกว่าค่ะ"

4. IMAGE CONTEXT ALIGNMENT:
   - Verify if the action and feeling match the illustration (e.g., studying late / reading at desk while sleepy/yawning).

5. THAI TRANSLATION & RECOMMENDED SENTENCE:
   - "studentTranslation": Natural Thai translation of what the student literally typed.
   - "correctedSentence": The polished, most natural, native-level sentence conforming to the target formula (e.g. "I do read books to review the lesson even when I'm sleepy.").

6. RESULT CRITERIA:
   - "isCorrect": true ONLY if there are zero grammar errors, zero typos, correct parts of speech, capital letter at start, and period '.' at end.
   - "statusText": "ถูกต้องเลยค่ะ เก่งมากเลย 👏" if isCorrect is true, otherwise "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".

CRITICAL REQUIREMENT: You MUST respond ONLY with valid, raw JSON matching this schema:
{
  "isCorrect": boolean,
  "statusText": "string in Thai ('ถูกต้องเลยค่ะ เก่งมากเลย 👏' or '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ')",
  "studentTranslation": "string in Thai translating what the student wrote",
  "correctedSentence": "string (A natural, fully correct sentence conforming to the target pattern)",
  "feedbackPoints": ["string in Thai", "string in Thai"],
  "breakdown": { "core": boolean, "context": boolean, "connect": boolean }
}
Do not wrap in markdown code blocks. Return pure raw JSON string only.`;

  const modelAnswer = req.item.model_answer ? `Target Model Answer (Ground Truth): "${req.item.model_answer}"` : '';
  const acceptableAnswers = req.item.acceptable_answers ? `Acceptable Variations: ${JSON.stringify(req.item.acceptable_answers)}` : '';
  const teacherGuidance = req.item.teacher_guidance || req.item.context_hint ? `Teacher Pattern & Context Rules:\n${req.item.teacher_guidance || req.item.context_hint}` : '';

  let prompt = '';
  if (req.exerciseType === 'translation') {
    prompt = `Exercise Type: Translation (Exercise 1)
Thai Prompt: "${req.item.thai || req.item.thai_prompt || ''}"
${modelAnswer}
${acceptableAnswers}
${teacherGuidance}
Student Answer: "${req.studentAnswer}"

Task for Exercise 1:
1. Evaluate if Student Answer matches the Target Model Answer "${req.item.model_answer}".
2. Set "correctedSentence" EXACTLY to "${req.item.model_answer}".
3. If student wrote incorrect words or typos, explain in Thai feedbackPoints using female polite tone (ค่ะ/นะคะ).`;
  } else if (req.exerciseType === 'guided_sentence') {
    prompt = `Exercise Type: Guided Sentence (Free Style)
Prompt Step: "${req.item.prompt || ''}"
Word Bank Reference: ${JSON.stringify(req.wordBank || {})}
Templates Reference: ${JSON.stringify(req.templates || [])}
${modelAnswer}
${teacherGuidance}
Student Answer: "${req.studentAnswer}"

Students write free-style sentences following the step structure. Check grammar, spelling, and full stop "." at the end.`;
  } else {
    const teacherPatternContext = req.item.teacher_guidance || req.item.context_hint || '';
    prompt = `Exercise Type: Picture Description & Sentence Construction (Exercise 3: Core + Context + Connect)
${req.item.image_description ? `Picture Description & Scene Context:\n"${req.item.image_description}"\n` : ''}
${modelAnswer}
${acceptableAnswers}

Teacher Pattern & Structure Rules (STRICTLY LOCK ONTO THESE FORMULAS & PATTERNS):
${teacherPatternContext || `Core: I + do + [ V.ไม่ผัน ]\nContext: to + [ V.ไม่ผัน ]\nConnect: even when I'm + [ คำคุณศัพท์ ]\nExample: I do read books to review my lessons even when I'm sleepy.`}

Student Answer to Evaluate: "${req.studentAnswer}"

Detailed Evaluation Instructions:
1. Translate what the student wrote into natural Thai and return it in "studentTranslation".
2. Check Core, Context, and Connect components carefully:
   - Is Core "I + do + Base Verb"?
   - Is Context "to + Base Verb"?
   - Is Connect "even when I'm + Adjective"?
3. Provide insightful, teacher-like feedback points in "feedbackPoints":
   - Point out any Part of Speech confusion (e.g. sleep [Noun/Verb] vs sleepy [Adjective]).
   - Point out double auxiliary/be verbs (e.g. "I'm am").
   - Offer natural English advice (e.g. "read a book" vs "read books", determiner on "lessons").
   - Check image context alignment with the scene.
4. If there is ANY error or unnatural usage that needs correction:
   - set "isCorrect" to false.
   - set "statusText" to "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
5. If 100% correct and natural:
   - set "isCorrect" to true.
   - set "statusText" to "ถูกต้องเลยค่ะ เก่งมากเลย 👏".
6. In "correctedSentence", provide the most natural, polished sentence.
7. Use Kru Whan's female polite tone (ค่ะ/นะคะ) throughout.`;
  }

  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash'
  ];

  let lastError: any = null;
  let text = '';
  let successfulModel = '';

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}` }] }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      });
      text = response.text || '';
      if (text) {
        successfulModel = model;
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next model:`, err);
    }
  }

  if (!text) {
    throw lastError || new Error('All Gemini models failed');
  }

  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

  let cleanBreakdown: Record<string, boolean> | undefined = undefined;
  if (parsed.breakdown && typeof parsed.breakdown === 'object') {
    cleanBreakdown = {};
    if (typeof parsed.breakdown.core !== 'undefined') cleanBreakdown.core = Boolean(parsed.breakdown.core);
    if (typeof parsed.breakdown.context !== 'undefined') cleanBreakdown.context = Boolean(parsed.breakdown.context);
    if (typeof parsed.breakdown.connect !== 'undefined') cleanBreakdown.connect = Boolean(parsed.breakdown.connect);
    if (typeof parsed.breakdown.actionValid !== 'undefined') cleanBreakdown.actionValid = Boolean(parsed.breakdown.actionValid);
    if (typeof parsed.breakdown.timeValid !== 'undefined') cleanBreakdown.timeValid = Boolean(parsed.breakdown.timeValid);
    if (typeof parsed.breakdown.purposeValid !== 'undefined') cleanBreakdown.purposeValid = Boolean(parsed.breakdown.purposeValid);
    if (typeof parsed.breakdown.reasonValid !== 'undefined') cleanBreakdown.reasonValid = Boolean(parsed.breakdown.reasonValid);
  }

  // Force Exercise 1 to strictly use req.item.model_answer as correctedSentence
  let finalCorrectedSentence = parsed.correctedSentence || req.studentAnswer;
  if (req.exerciseType === 'translation' && req.item.model_answer) {
    finalCorrectedSentence = req.item.model_answer;
  }

  const isCorrect = typeof parsed.isCorrect === 'boolean'
    ? parsed.isCorrect
    : (typeof parsed.score === 'number' ? parsed.score >= 95 : !parsed.statusText?.includes('ไม่สมบูรณ์'));

  return {
    isCorrect,
    score: isCorrect ? 100 : (typeof parsed.score === 'number' ? parsed.score : 60),
    statusText: isCorrect ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏' : (parsed.statusText || '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ'),
    studentTranslation: parsed.studentTranslation || '',
    correctedSentence: finalCorrectedSentence,
    feedbackPoints: Array.isArray(parsed.feedbackPoints) ? parsed.feedbackPoints : [],
    breakdown: cleanBreakdown,
    modelUsed: successfulModel
  };
}

function evaluateLocally(req: EvaluationRequest): EvaluationResult {
  const cleanAnswer = req.studentAnswer.trim();
  const lowerAnswer = cleanAnswer.toLowerCase();

  if (!cleanAnswer) {
    return {
      isCorrect: false,
      score: 0,
      statusText: '❌ กรุณาพิมพ์คำตอบก่อนส่งตรวจนะคะ',
      correctedSentence: req.item.model_answer || '',
      feedbackPoints: ['ยังไม่มีข้อมูลคำตอบ กรุณาพิมพ์คำตอบภาษาอังกฤษในช่องข้อความค่ะ']
    };
  }

  if (req.exerciseType === 'translation') {
    return evaluateTranslationLocally(req.item, lowerAnswer, cleanAnswer);
  } else if (req.exerciseType === 'guided_sentence') {
    return evaluateGuidedSentenceLocally(req.item, lowerAnswer, cleanAnswer);
  } else {
    return evaluatePictureDescriptionLocally(req.item, lowerAnswer, cleanAnswer);
  }
}

import { checkOfflineGrammarAndSpelling } from './offline-checker';

function evaluateTranslationLocally(item: any, lower: string, original: string): EvaluationResult {
  const result = checkOfflineGrammarAndSpelling(item, original, 'translation');
  const targetAnswer = item.model_answer || "I am commuting to get home.";

  return {
    isCorrect: result.isCorrect,
    statusText: result.isCorrect ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏' : '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ',
    correctedSentence: targetAnswer,
    feedbackPoints: result.points
  };
}

function evaluateGuidedSentenceLocally(item: any, lower: string, original: string): EvaluationResult {
  const points: string[] = [];
  let isCorrect = true;

  let fixedSentence = original;
  if (/\bmakeing\b/i.test(original)) {
    isCorrect = false;
    points.push('• สะกดคำผิด: "makeing" ควรแก้เป็น "making" (ตัด e ก่อนเติม -ing นะคะ)');
    fixedSentence = fixedSentence.replace(/\bmakeing\b/gi, 'making');
  }

  const hasFullStop = original.endsWith('.');
  if (!hasFullStop) {
    isCorrect = false;
    points.push('• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ท้ายประโยคด้วยนะคะ');
    fixedSentence = fixedSentence + '.';
  }

  const hasAction = /\b(do|am|is|are|cook|read|drink|wash|study)\b/i.test(lower);
  const hasTime = /\b(now|right now|at the moment|currently|today)\b/i.test(lower);
  const hasPurpose = /\b(to|for)\s+\w+/.test(lower);
  const hasReason = lower.includes("even when") || lower.includes("because") || lower.includes("due to");

  if (hasAction) {
    points.push('• โครงสร้างคำกริยาถูกต้องค่ะ');
  }

  if (hasPurpose) {
    points.push('• มีการใช้ to แสดงจุดประสงค์ (Context) ถูกต้องค่ะ');
  }

  if (hasReason) {
    points.push('• มีการใช้คำเชื่อม (Connect) ถูกต้องค่ะ');
  }

  const breakdown = {
    actionValid: hasAction,
    timeValid: hasTime,
    purposeValid: hasPurpose,
    reasonValid: hasReason
  };

  return {
    isCorrect,
    statusText: isCorrect ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏' : '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ',
    correctedSentence: item.model_answer || (fixedSentence.charAt(0).toUpperCase() + fixedSentence.slice(1)),
    feedbackPoints: points,
    breakdown
  };
}

function evaluatePictureDescriptionLocally(item: any, lower: string, original: string): EvaluationResult {
  const points: string[] = [];
  let isCorrect = true;

  let fixedSentence = original;
  if (/\bmakeing\b/i.test(original)) {
    isCorrect = false;
    points.push('• สะกดคำผิด: "makeing" ควรแก้เป็น "making" (ตัด e ก่อนเติม -ing นะคะ)');
    fixedSentence = fixedSentence.replace(/\bmakeing\b/gi, 'making');
  }

  const hasFullStop = original.endsWith('.');
  if (!hasFullStop) {
    isCorrect = false;
    points.push('• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ท้ายประโยคด้วยนะคะ');
    fixedSentence = fixedSentence + '.';
  }

  const hasCore = /\b(i do|i am|he does|she does)\b/i.test(lower);
  const hasContext = /\b(to\s+\w+|at|in|on)\b/i.test(lower);
  const hasConnect = /\b(even when|because|when|although)\b/i.test(lower);

  if (hasCore) {
    points.push('• โครงสร้าง Core (I do...) ถูกต้องค่ะ');
  } else {
    isCorrect = false;
    points.push('• ขาดโครงสร้าง Core (เช่น I do + กริยาไม่ผัน)');
  }

  if (hasContext) {
    points.push('• โครงสร้าง Context (to...) ถูกต้องค่ะ');
  } else {
    isCorrect = false;
    points.push('• ขาดโครงสร้าง Context (เช่น to + กริยาไม่ผัน)');
  }

  if (hasConnect) {
    points.push('• โครงสร้าง Connect (even when...) ถูกต้องค่ะ');
  } else {
    isCorrect = false;
    points.push('• ขาดโครงสร้าง Connect (เช่น even when I\'m + คุณศัพท์)');
  }

  const breakdown = {
    core: hasCore,
    context: hasContext,
    connect: hasConnect
  };

  return {
    isCorrect,
    statusText: isCorrect ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏' : '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ',
    correctedSentence: item.model_answer || (fixedSentence.charAt(0).toUpperCase() + fixedSentence.slice(1)),
    feedbackPoints: points,
    breakdown
  };
}
