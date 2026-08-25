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
  const normalize = (s: string) => 
    (s || '')
      .replace(/[\u2018\u2019`]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .trim()
      .toLowerCase()
      .replace(/[.!?,]$/, '')
      .replace(/\s+/g, ' ');

  const normalizedStudent = normalize(req.studentAnswer);
  const modelAnswer = req.item.model_answer || '';
  const normalizedModel = normalize(modelAnswer);
  const acceptableList = (req.item.acceptable_answers || []).map(normalize);

  // Fast path: If student matches model answer or acceptable answer exactly
  const isExactModelMatch = normalizedStudent && (
    normalizedStudent === normalizedModel || 
    acceptableList.includes(normalizedStudent)
  );

  const startsCapital = (req.studentAnswer || '').trim().charAt(0) === (req.studentAnswer || '').trim().charAt(0).toUpperCase();
  const endsPeriod = (req.studentAnswer || '').trim().endsWith('.');

  if (isExactModelMatch && startsCapital && endsPeriod) {
    const defaultTranslation = req.item.image_description || req.item.thai || req.item.prompt || '';
    return {
      isCorrect: true,
      statusText: "ถูกต้องเลยค่ะ เก่งมากเลย 👏",
      studentTranslation: req.exerciseType === 'picture_description'
        ? (req.item.context_hint || "ฉันทำสิ่งนี้ตามโครงสร้างประโยคที่ถูกต้องสมบูรณ์")
        : defaultTranslation,
      correctedSentence: modelAnswer,
      feedbackPoints: [
        "• โครงสร้างประโยคถูกต้องสมบูรณ์แบบ ไวยากรณ์และการใช้คำศัพท์สอดคล้องกับบริบทเป็นอย่างดีเลยค่ะ"
      ],
      breakdown: { core: true, context: true, connect: true },
      isLiveGemini: false,
      modelUsed: 'exact-model-match'
    };
  }

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

  const systemInstruction = `You are Kru Whan (ครูหวาน) - an expert, warm, and encouraging English Language Teacher & Master AI Exercise Advisor for Thai students using English sentence construction courses (Sentence Builder).
You will evaluate thousands of different quizzes across various books, units, and grammar formulas.
Your mission is to provide accurate, pedagogical, and encouraging feedback in Thai tailored strictly to the SPECIFIC grammar rules, formulas, and visual context provided in each individual quiz prompt.

TONE & POLITE PARTICLES (STRICT):
- ALWAYS speak as Kru Whan (female teacher persona).
- ALWAYS use female polite ending particles: "ค่ะ", "นะคะ", "เลยค่ะ".
- NEVER EVER use male polite particles ("ครับ", "นะครับ").
- Deliver clear, friendly, and structured bullet points (2 to 4 points maximum).

UNIVERSAL PEDAGOGICAL EVALUATION FRAMEWORK (APPLIES TO ALL 1,000+ QUIZZES):
1. FORMULA & BLUEPRINT CONFORMANCE:
   - Strictly check the student's answer against the specific "Teacher Pattern & Structure Rules" given for this quiz.
   - Verify that each required slot/component in the formula is present and uses the correct grammatical form (e.g. Base Verb, V.ing, Adjective, Past Verb, etc.).

2. BROAD SEMANTIC ACCEPTANCE & VISUAL RELEVANCE:
   - BE GENEROUS AND OPEN TO VALID VARIATIONS: An image of a student sitting at a desk with an open book, lamp, and coffee can legitimately be described with many related verbs: 'read / read books / study / review lessons / learn / do homework / take notes'. ALL of these are 100% valid actions matching the scene!
   - NEVER reject 'read books' or 'read a book' by claiming the image only depicts 'study'!
   - If the student's sentence is grammatically correct, follows the required formula, and makes logical sense with the picture context, YOU MUST SET "isCorrect": true!
   - Only flag image relevance if the action completely contradicts the image (e.g. cooking in kitchen, playing football, driving a car when the image is studying in a room).

3. GRAMMAR, PARTS OF SPEECH (POS) & SYNTAX VALIDATION:
   - Parts of Speech: Ensure words used in each slot belong to the required POS (e.g. if the formula requires an Adjective, flag if the student uses a Noun or Verb such as using 'sleep' instead of 'sleepy/tired', 'anger' instead of 'angry', 'success' instead of 'successful').
   - Auxiliary & Be Verbs: Detect any double/redundant auxiliary verbs (e.g. 'I'm am', 'do are', 'is be').
   - Countable Noun Determiners: Only comment on determiners if a singular countable noun is literally placed alone without any article or possessive (e.g., 'read book' or 'review lesson'). If the student ALREADY included 'a', 'an', 'the', 'my', 'your', or plural '-s' (e.g., 'the lesson', 'a book', 'books', 'my notes'), it is 100% grammatically correct and you MUST NOT claim it lacks a determiner!

4. THAI TRANSLATION & RECOMMENDED SENTENCE:
   - "studentTranslation": Provide an accurate, natural Thai translation of what the student literally typed in their answer.
   - "correctedSentence": Provide a natural, native-level sentence that perfectly follows the target formula for this quiz.

5. ACCURACY & EVALUATION RESULT:
   - "isCorrect": true whenever the sentence is grammatically correct, follows the formula, matches the image plausibly, begins with a capital letter, and ends with a period '.'.
   - "statusText": "ถูกต้องเลยค่ะ เก่งมากเลย 👏" if isCorrect is true, otherwise "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".

CRITICAL RESPONSE FORMAT: Respond ONLY with valid raw JSON matching this schema:
{
  "isCorrect": boolean,
  "statusText": "string in Thai ('ถูกต้องเลยค่ะ เก่งมากเลย 👏' or '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ')",
  "studentTranslation": "string in Thai translating what the student wrote",
  "correctedSentence": "string (A natural, fully correct sentence conforming to the target formula)",
  "feedbackPoints": ["string in Thai", "string in Thai"],
  "breakdown": { "core": boolean, "context": boolean, "connect": boolean }
}
Do not wrap in markdown code blocks. Return pure raw JSON string only.`;

  const modelAnswer = req.item.model_answer ? `Target Model Answer (Ground Truth Reference): "${req.item.model_answer}"` : '';
  const acceptableAnswers = req.item.acceptable_answers ? `Acceptable Answer Variations: ${JSON.stringify(req.item.acceptable_answers)}` : '';
  const teacherGuidance = req.item.teacher_guidance || req.item.context_hint || req.item.guidance || '';

  let prompt = '';
  if (req.exerciseType === 'translation') {
    prompt = `Exercise Type: Translation (Exercise 1)
Thai Prompt: "${req.item.thai || req.item.thai_prompt || req.item.prompt || ''}"
${modelAnswer}
${acceptableAnswers}
${teacherGuidance ? `Teacher Formula / Guidance:\n${teacherGuidance}` : ''}
Student Answer to Evaluate: "${req.studentAnswer}"

Task for Exercise 1:
1. Evaluate if Student Answer matches the Target Model Answer "${req.item.model_answer}".
2. Set "correctedSentence" EXACTLY to "${req.item.model_answer}".
3. If student wrote incorrect words or typos, explain in Thai feedbackPoints using Kru Whan female polite tone (ค่ะ/นะคะ).`;
  } else if (req.exerciseType === 'guided_sentence') {
    prompt = `Exercise Type: Guided Sentence (Exercise 2)
Prompt / Template: "${req.item.prompt || req.item.thai_template || ''}"
Word Bank Reference: ${JSON.stringify(req.wordBank || {})}
Templates Reference: ${JSON.stringify(req.templates || [])}
${modelAnswer}
${teacherGuidance ? `Teacher Formula / Guidance:\n${teacherGuidance}` : ''}
Student Answer to Evaluate: "${req.studentAnswer}"

Task for Exercise 2:
1. Check grammar, sentence structure flow, word choices, spelling, capital first letter, and period '.' at the end.
2. Provide constructive feedback points in Thai as Kru Whan.`;
  } else {
    prompt = `Exercise Type: Picture Description & Sentence Construction (Exercise 3: Free-Style Structure Building)
${req.item.image_description ? `Picture Description & Scene Context:\n"${req.item.image_description}"\n` : ''}
${modelAnswer}
${acceptableAnswers}

Teacher Pattern & Structure Rules (STRICTLY LOCK ONTO THESE FORMULAS & PATTERNS FOR THIS QUIZ):
${teacherGuidance || `Core: I + do + [ V.ไม่ผัน ]\nContext: [ to + V.ไม่ผัน ]\nConnect: [ even when I'm + คำคุณศัพท์ ]`}

Student Answer to Evaluate: "${req.studentAnswer}"

Evaluation Steps for this Quiz:
1. Translate what the student wrote into natural Thai and return it in "studentTranslation".
2. Check if the sentence adheres to the specific Teacher Pattern & Structure Rules for this quiz.
3. Check grammar, part of speech, auxiliary verbs, and spelling based on the student's actual sentence.
4. Verify if the described action and emotion match the scene in the picture.
5. In "correctedSentence", provide the best, most natural native sentence adhering to the target pattern.
6. Use Kru Whan's female polite tone (ค่ะ/นะคะ/เลยค่ะ) throughout all feedbackPoints.`;
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
