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

TONE, POLITE PARTICLES & PRONOUNS (STRICT RULES):
- ALWAYS speak as Kru Whan (female teacher persona).
- ALWAYS use female polite ending particles: "ค่ะ", "นะคะ", "เลยค่ะ".
- NEVER EVER use male polite particles ("ครับ", "นะครับ").
- ADDRESSING THE USER (CRITICAL):
  * ALWAYS refer to the user/student as "นักเรียน" (e.g. "ประโยคของนักเรียน", "นักเรียนเลือกคำศัพท์ได้ดีมากค่ะ", "นักเรียนลองปรับ...", "คำแปลประโยคของนักเรียน").
  * NEVER EVER use "น้อง", "น้องๆ", "ลูกค้า", "ท่าน", or "คุณ".
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

4. CHARACTER GENDER & SEX ACCURACY IN PICTURE DESCRIPTION (STRICT):
   - Check the sex/gender of the character depicted in the "Picture Description & Scene Context Prompt" or reference example.
   - "I" IS ALWAYS ACCEPTABLE: If the student builds the sentence using first-person "I" / "I am" / "I'm" / "I do", this is 100% valid (first-person perspective imagining themselves as the character).
   - THIRD-PERSON PRONOUNS MUST MATCH THE CHARACTER'S GENDER (CRITICAL):
     * If the character in the picture is MALE (boy, man, father, brother, guy, son, male) and the student uses third-person FEMALE pronouns ("she", "her", "hers", "herself"):
       - This MUST BE MARKED AS INCORRECT (isCorrect: false).
       - statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
       - In feedbackPoints, strictly advise: "• ตัวละครในภาพเป็นผู้ชาย/เด็กผู้ชาย ควรใช้สรรพนาม 'he' (หรือใช้ 'I' หากแต่งประโยคจากมุมมองของตัวเอง) นะคะ ไม่ใช้ 'she' ค่ะ"
     * If the character in the picture is FEMALE (girl, woman, mother, sister, lady, daughter, female) and the student uses third-person MALE pronouns ("he", "him", "his", "himself"):
       - This MUST BE MARKED AS INCORRECT (isCorrect: false).
       - statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
       - In feedbackPoints, strictly advise: "• ตัวละครในภาพเป็นผู้หญิง/เด็กผู้หญิง ควรใช้สรรพนาม 'she' (หรือใช้ 'I' หากแต่งประโยคจากมุมมองของตัวเอง) นะคะ ไม่ใช้ 'he' ค่ะ"

5. ACCURACY OF IMAGE ELEMENTS, OBJECTS & ENTITIES (STRICT VISUAL MATCHING):
   - Verify that all key subjects, objects, animals, actions, and settings mentioned by the student match what is depicted in the "Picture Description & Scene Context Prompt" or the reference visual context.
   - If the image contains a specific entity and the student mentions an incorrect or conflicting entity (for example: image shows a DOG, but student writes "cat"; image shows COFFEE, but student writes "soup"; image shows a BICYCLE, but student writes "car"; image shows a HAIRCUT, but student writes "cooking"):
     * MUST mark as INCORRECT (isCorrect: false).
     * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
     * In feedbackPoints, explicitly explain the visual mismatch in Thai using Kru Whan female polite tone (ค่ะ/นะคะ) and the pronoun "นักเรียน":
       e.g., "• ในภาพเป็นสุนัข (dog) ไม่ใช่แมว (cat) นะคะ นักเรียนลองปรับคำศัพท์ให้ตรงกับสิ่งที่เกิดขึ้นในภาพดูนะคะ"

6. REAL-WORLD PLAUSIBILITY & LOGICAL REALITY CHECK (CRITICAL):
   - Even if the grammar and sentence structure formula are technically 100% correct, the sentence MUST describe a situation that is possible, natural, and realistic in real life.
   - If an action, habit, frequency, or circumstance contradicts reality, common sense, or human nature:
     * For example: "I have my hair cut everyday after I leave for work" -> Getting a haircut every single day is not realistic or common practice in real life!
     * For example: Eating 30 meals a day, drinking boiling lava, walking to the moon after work, brushing teeth every minute, etc.
     * When the sentence describes an unrealistic or impossible habit/frequency/action:
       - MUST mark as INCORRECT (isCorrect: false).
       - Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
       - In feedbackPoints, kindly explain the real-world implausibility in Thai and suggest a realistic, natural alternative:
         e.g., "• แม้โครงสร้างประโยคจะถูกต้อง แต่การตัดผมทุกวัน (every day) อาจไม่สอดคล้องกับความเป็นจริงในชีวิตประจำวันนะคะ นักเรียนสามารถปรับความถี่หรือช่วงเวลาให้สมจริงยิ่งขึ้น เช่น 'once a month' หรือ 'every few weeks' ได้ค่ะ"

7. WHEN STUDENT ANSWER IS CORRECT (100% Valid & Meaningful):
   - Set "isCorrect": true
   - Set "statusText": "ถูกต้องเลยค่ะ เก่งมากเลย 👏"
   - In "feedbackPoints", praise the student, highlight how well their sentence fulfills the structure formula, and note how well it fits the visual scene.

8. WHEN STUDENT ANSWER NEEDS IMPROVEMENT:
   - Set "isCorrect": false
   - Set "statusText": "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
   - In "feedbackPoints", clearly explain the grammar/POS/gender/entity/reality issue with teacher guidance, provide gentle tips on natural usage, and encourage them.

9. THAI TRANSLATION & RECOMMENDED SENTENCE:
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
2. STRICT CHARACTER GENDER & PRONOUN VERIFICATION:
   - "I" / "I am" / "I'm" / "I do" is ALWAYS acceptable and correct (first-person perspective).
   - If the character depicted in the picture/context is MALE and student wrote "she", "her", or feminine pronouns: MUST mark isCorrect: false, and advise that the character is male so should use "he" (or "I") instead of "she".
   - If the character depicted in the picture/context is FEMALE and student wrote "he", "his", "him", or masculine pronouns: MUST mark isCorrect: false, and advise that the character is female so should use "she" (or "I") instead of "he".
3. STRICT IMAGE ELEMENT & ENTITY VERIFICATION:
   - Check that the animals, objects, actions, and settings in the student's answer match the picture context ("${req.item.image_description || ''}").
   - If image has a dog and student writes "cat", image has coffee and student writes "wine", image has haircut and student writes "swimming" -> MUST mark isCorrect: false, statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ", and advise in feedbackPoints that the image shows [element in picture] not [student's word].
4. STRICT REAL-WORLD PLAUSIBILITY & COMMON SENSE CHECK:
   - Even if grammar is correct, the sentence MUST be reasonable, plausible, and possible in real life!
   - If student writes an unrealistic habit or frequency (e.g. "I have my hair cut everyday...", "I wash my car every 10 minutes...", "I eat dinner 10 times a night..."):
     * MUST mark isCorrect: false.
     * statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
     * In feedbackPoints, explain kindly that this frequency/action is not realistic in everyday life, and suggest a plausible alternative (e.g. once a month, on weekends).
5. Check if the sentence adheres to the specific Teacher Pattern & Structure Rules (Core + Context + Connect).
6. Analyze grammar, vocabulary, parts of speech, and connection with the image prompt. Use the reference example sentence for guidance.
7. If the sentence is grammatically correct, logically matches the image elements and gender, and is plausible in real life, set isCorrect: true, statusText: "ถูกต้องเลยค่ะ เก่งมากเลย 👏", and praise their sentence in feedbackPoints.
8. If there are errors (unrealistic habit, entity mismatch, gender mismatch, double verbs like "I'm am", noun instead of adjective), explain kindly in feedbackPoints using the term "นักเรียน" and provide the best corrected sentence in "correctedSentence".
9. Use Kru Whan's female polite tone (ค่ะ/นะคะ/เลยค่ะ) throughout all feedbackPoints.`;
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

  let isCorrect = typeof parsed.isCorrect === 'boolean'
    ? parsed.isCorrect
    : (typeof parsed.score === 'number' ? parsed.score >= 95 : !parsed.statusText?.includes('ไม่สมบูรณ์'));

  const rawFeedbackPoints: string[] = Array.isArray(parsed.feedbackPoints) ? parsed.feedbackPoints : [];
  let sanitizedFeedbackPoints = rawFeedbackPoints.map(pt => sanitizeThaiStudentPronouns(pt));

  // Strict Character Gender Verification for Picture Description (Exercise 3)
  if (req.exerciseType === 'picture_description') {
    const contextText = `${req.item.image_description || ''} ${req.item.model_answer || ''} ${req.item.context_hint || ''} ${req.item.teacher_guidance || ''}`.toLowerCase();
    const studentTokens = ` ${req.studentAnswer.toLowerCase()} `;

    const isMaleContext = /\b(boy|man|male|he|his|him|father|brother|guy|gentleman|son|grandpa|grandfather)\b/i.test(contextText) ||
                          /(ผู้ชาย|เด็กผู้ชาย|เด็กชาย|ชาย|คุณพ่อ|พ่อ|พี่ชาย|น้องชาย|ลูกชาย|คุณตา|คุณปู่|ตา|ปู่)/.test(contextText);
    const isFemaleContext = /\b(girl|woman|female|she|her|hers|mother|sister|lady|daughter|grandma|grandmother)\b/i.test(contextText) ||
                            /(ผู้หญิง|เด็กผู้หญิง|เด็กหญิง|หญิง|คุณแม่|แม่|พี่สาว|น้องสาว|ลูกสาว|คุณยาย|คุณย่า|ยาย|ย่า)/.test(contextText);

    const studentUsesFemale = /\b(she|her|hers|herself)\b/i.test(studentTokens);
    const studentUsesMale = /\b(he|him|his|himself)\b/i.test(studentTokens);

    if (isMaleContext && !isFemaleContext && studentUsesFemale) {
      isCorrect = false;
      const genderNotice = '• ตัวละครในภาพเป็นผู้ชาย ควรใช้สรรพนาม "he" (หรือใช้ "I" หากแต่งประโยคจากมุมมองของตัวเอง) นะคะ ไม่ใช้ "she" ค่ะ';
      if (!sanitizedFeedbackPoints.some(pt => pt.includes('ผู้ชาย') || (pt.includes('he') && pt.includes('she')))) {
        sanitizedFeedbackPoints = [genderNotice, ...sanitizedFeedbackPoints];
      }
    } else if (isFemaleContext && !isMaleContext && studentUsesMale) {
      isCorrect = false;
      const genderNotice = '• ตัวละครในภาพเป็นผู้หญิง ควรใช้สรรพนาม "she" (หรือใช้ "I" หากแต่งประโยคจากมุมมองของตัวเอง) นะคะ ไม่ใช้ "he" ค่ะ';
      if (!sanitizedFeedbackPoints.some(pt => pt.includes('ผู้หญิง') || (pt.includes('she') && pt.includes('he')))) {
        sanitizedFeedbackPoints = [genderNotice, ...sanitizedFeedbackPoints];
      }
    }
  }

  return {
    isCorrect,
    score: isCorrect ? 100 : (typeof parsed.score === 'number' && isCorrect ? parsed.score : 60),
    statusText: sanitizeThaiStudentPronouns(isCorrect ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏' : (parsed.statusText || '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ')),
    studentTranslation: sanitizeThaiStudentPronouns(parsed.studentTranslation || ''),
    correctedSentence: finalCorrectedSentence,
    feedbackPoints: sanitizedFeedbackPoints,
    breakdown: cleanBreakdown,
    modelUsed: successfulModel
  };
}

/**
 * Sanitizes Thai pronouns to strictly use "นักเรียน" instead of "น้อง", "น้องๆ", "ลูกค้า", or "คุณ"
 */
function sanitizeThaiStudentPronouns(text: string): string {
  if (!text) return '';
  return text
    .replace(/น้องๆ/g, 'นักเรียน')
    .replace(/น้อง/g, 'นักเรียน')
    .replace(/ลูกค้า/g, 'นักเรียน')
    .replace(/ประโยคของคุณ/g, 'ประโยคของนักเรียน')
    .replace(/คำตอบของคุณ/g, 'คำตอบของนักเรียน')
    .replace(/ของคุณ/g, 'ของนักเรียน')
    .replace(/กับคุณ/g, 'กับนักเรียน')
    .replace(/ให้คุณ/g, 'ให้นักเรียน')
    .replace(/ว่าคุณ/g, 'ว่านักเรียน')
    .replace(/ถ้าคุณ/g, 'ถ้านักเรียน')
    .replace(/เมื่อคุณ/g, 'เมื่อนักเรียน')
    .replace(/คุณ/g, 'นักเรียน');
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

  // Character gender check in picture context
  const contextText = `${item.image_description || ''} ${item.model_answer || ''} ${item.context_hint || ''} ${item.teacher_guidance || ''}`.toLowerCase();
  const studentTokens = ` ${normalizedLower} `;

  const isMaleContext = /\b(boy|man|male|he|his|him|father|brother|guy|gentleman|son|grandpa|grandfather)\b/i.test(contextText) ||
                        /(ผู้ชาย|เด็กผู้ชาย|เด็กชาย|ชาย|คุณพ่อ|พ่อ|พี่ชาย|น้องชาย|ลูกชาย|คุณตา|คุณปู่|ตา|ปู่)/.test(contextText);
  const isFemaleContext = /\b(girl|woman|female|she|her|hers|mother|sister|lady|daughter|grandma|grandmother)\b/i.test(contextText) ||
                          /(ผู้หญิง|เด็กผู้หญิง|เด็กหญิง|หญิง|คุณแม่|แม่|พี่สาว|น้องสาว|ลูกสาว|คุณยาย|คุณย่า|ยาย|ย่า)/.test(contextText);

  const studentUsesFemale = /\b(she|her|hers|herself)\b/i.test(studentTokens);
  const studentUsesMale = /\b(he|him|his|himself)\b/i.test(studentTokens);

  if (isMaleContext && !isFemaleContext && studentUsesFemale) {
    isCorrect = false;
    points.push('• ตัวละครในภาพเป็นผู้ชาย ควรใช้สรรพนาม "he" (หรือใช้ "I" หากแต่งประโยคจากมุมมองของตัวเอง) นะคะ ไม่ใช้ "she" ค่ะ');
  } else if (isFemaleContext && !isMaleContext && studentUsesMale) {
    isCorrect = false;
    points.push('• ตัวละครในภาพเป็นผู้หญิง ควรใช้สรรพนาม "she" (หรือใช้ "I" หากแต่งประโยคจากมุมมองของตัวเอง) นะคะ ไม่ใช้ "he" ค่ะ');
  }

  // Real-world plausibility check (e.g. haircut everyday)
  const isHaircut = /\b(hair\s*cut|cut\s+.*hair)\b/i.test(normalizedLower);
  const isEveryday = /\b(every\s*day|daily|everyday)\b/i.test(normalizedLower);
  if (isHaircut && isEveryday) {
    isCorrect = false;
    points.push('• แม้โครงสร้างประโยคจะถูกต้อง แต่การตัดผมทุกวัน (every day) อาจไม่สอดคล้องกับความเป็นจริงในชีวิตประจำวันนะคะ นักเรียนสามารถปรับความถี่ให้สมจริงยิ่งขึ้น เช่น "once a month" หรือ "every few weeks" ได้ค่ะ');
  }

  const hasCore = /\b(i do|i am|he does|she does|i have|i will|he is|she is)\b/i.test(normalizedLower);
  const hasContext = /\b(to\s+\w+|at|in|on)\b/i.test(normalizedLower);
  const hasConnect = /\b(even when|because|when|although)\b/i.test(normalizedLower);

  if (hasCore) {
    points.push('• โครงสร้าง Core (I do...) ถูกต้องค่ะ');
  } else {
    isCorrect = false;
    points.push('• ขาดโครงสร้าง Core (เช่น I do + กริยาไม่ผัน หรือ He does / She does)');
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
