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

  const systemInstruction = `You are Kru Whan (ครูหวาน) - an expert, warm, and encouraging English Language Teacher & Master AI Exercise Advisor for Thai students using English sentence construction courses (Sentence Builder).
You will evaluate thousands of different quizzes across various books, units, and grammar formulas.
Your mission is to provide accurate, pedagogical, encouraging, and insightful feedback in Thai tailored strictly to the SPECIFIC grammar rules, formulas, reference examples, and visual context provided in each individual quiz prompt.

TONE & POLITE PARTICLES (STRICT):
- ALWAYS speak as Kru Whan (female teacher persona).
- ALWAYS use female polite ending particles: "ค่ะ", "นะคะ", "เลยค่ะ".
- NEVER EVER use male polite particles ("ครับ", "นะครับ").
- Deliver clear, friendly, and structured bullet points (2 to 4 points).

UNIVERSAL PEDAGOGICAL EVALUATION FRAMEWORK:
1. CONTRACTIONS & FULL FORMS EQUIVALENCE (STRICT 100% EQUIVALENT):
   - Treat ALL standard English contractions and their expanded full forms as 100% IDENTICAL and EQUALLY CORRECT:
     * "I'm" <==> "I am"
     * "I've" <==> "I have"
     * "you're" <==> "you are", "we're" <==> "we are", "they're" <==> "they are"
     * "he's" <==> "he is" / "he has", "she's" <==> "she is" / "she has", "it's" <==> "it is" / "it has"
     * "I'll" <==> "I will", "you'll" <==> "you will", "we'll" <==> "we will", "they'll" <==> "they will"
     * "I'd" <==> "I would" / "I had", "we'd" <==> "we would" / "we had"
     * "don't" <==> "do not", "doesn't" <==> "does not", "didn't" <==> "did not"
     * "can't" <==> "cannot" / "can not", "couldn't" <==> "could not", "won't" <==> "will not", "wouldn't" <==> "would not"
     * "isn't" <==> "is not", "aren't" <==> "are not", "wasn't" <==> "was not", "weren't" <==> "were not"
     * "haven't" <==> "have not", "hasn't" <==> "has not", "hadn't" <==> "had not"
   - If the backend model answer has "I've" and student types "I have" (or vice versa), or backend has "I'm" and student types "I am" (or vice versa), it is 100% FULLY CORRECT. NEVER mark it as wrong!

2. FORMULA & BLUEPRINT CONFORMANCE:
   - Carefully verify each required component in the formula (e.g. Core, Context, Connect) against the specific "Teacher Pattern & Structure Rules" for this quiz.
   - Verify that each component uses the correct grammatical form (Base Verb, V.ing, Adjective, Past Verb, etc.).

3. GRAMMAR, VOCABULARY & IMAGE PROMPT ANALYSIS:
   - Compare the student's vocabulary (subjects, actions, feelings, objects) with the "Picture Description / Image Prompt".
   - Broad Semantic Acceptance: If the image depicts someone at a desk with books/lamp, actions like 'read', 'read books', 'study', 'review the lesson', 'learn new things', 'do homework' are ALL 100% valid and directly match the picture!
   - Parts of Speech: Ensure words in each slot match the required POS (e.g. if an Adjective is required in Connect, catch nouns/verbs like 'sleep' -> 'sleepy/tired').
   - Auxiliary Verbs: Catch redundant verbs like 'I'm am'.
   - Determiners: Do not claim determiners are missing if 'the', 'a', 'an', or 'my' is already used (e.g. 'the lesson' is correct).

4. WHEN STUDENT ANSWER IS CORRECT (100% Valid & Meaningful):
   - Set "isCorrect": true
   - Set "statusText": "ถูกต้องเลยค่ะ เก่งมากเลย 👏"
   - In "feedbackPoints", praise the student, highlight how well their sentence fulfills the structure formula, and note how well it fits the visual scene.

5. WHEN STUDENT ANSWER NEEDS IMPROVEMENT:
   - Set "isCorrect": false
   - Set "statusText": "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
   - In "feedbackPoints", clearly explain the grammar/POS/auxiliary issue with teacher guidance, provide gentle tips on natural usage, and encourage them.

6. THAI TRANSLATION & RECOMMENDED SENTENCE:
   - "studentTranslation": Provide an accurate, natural Thai translation of what the student literally typed.
   - "correctedSentence": Provide a natural, native-level sentence that perfectly follows the target formula for this quiz.

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

  const modelAnswer = req.item.model_answer ? `Target Model Answer / Reference Example: "${req.item.model_answer}"` : '';
  const acceptableAnswers = req.item.acceptable_answers ? `Acceptable Variations: ${JSON.stringify(req.item.acceptable_answers)}` : '';
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
${req.item.image_description ? `Picture Description & Scene Context Prompt:\n"${req.item.image_description}"\n` : ''}
${modelAnswer}
${acceptableAnswers}

Teacher Pattern & Structure Rules (STRICTLY LOCK ONTO THESE FORMULAS & PATTERNS FOR THIS QUIZ):
${teacherGuidance || `Core: I + do + [ V.ไม่ผัน ]\nContext: [ to + V.ไม่ผัน ]\nConnect: [ even when I'm + คำคุณศัพท์ ]`}

Student Answer to Evaluate: "${req.studentAnswer}"

Evaluation Steps for this Quiz:
1. Translate what the student wrote into natural Thai and return it in "studentTranslation".
2. Check if the sentence adheres to the specific Teacher Pattern & Structure Rules (Core + Context + Connect).
3. Analyze grammar, vocabulary, parts of speech, and connection with the image prompt. Use the reference example sentence for guidance.
4. If the sentence is grammatically correct and logically matches the image, set isCorrect: true, statusText: "ถูกต้องเลยค่ะ เก่งมากเลย 👏", and praise their sentence in feedbackPoints.
5. If there are errors (e.g. double verbs like "I'm am", noun instead of adjective), explain kindly in feedbackPoints and provide the best corrected sentence in "correctedSentence".
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

import { checkOfflineGrammarAndSpelling, normalizeContractions } from './offline-checker';

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
  const normalizedLower = normalizeContractions(lower);

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

  const hasAction = /\b(do|am|is|are|cook|read|drink|wash|study)\b/i.test(normalizedLower);
  const hasTime = /\b(now|right now|at the moment|currently|today)\b/i.test(normalizedLower);
  const hasPurpose = /\b(to|for)\s+\w+/.test(normalizedLower);
  const hasReason = normalizedLower.includes("even when") || normalizedLower.includes("because") || normalizedLower.includes("due to");

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
  const normalizedLower = normalizeContractions(lower);

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

  const hasCore = /\b(i do|i am|he does|she does|i have|i will)\b/i.test(normalizedLower);
  const hasContext = /\b(to\s+\w+|at|in|on)\b/i.test(normalizedLower);
  const hasConnect = /\b(even when|because|when|although)\b/i.test(normalizedLower);

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
    points.push('• ขาดโครงสร้าง Connect (เช่น even when I\'m / I am + คุณศัพท์)');
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
