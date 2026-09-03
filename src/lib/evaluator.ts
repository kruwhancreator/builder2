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

CRITICAL DISTINCTION: CALLING THE USER VS TRANSLATING EXERCISE CONTENT:
1. CALLING / ADDRESSING THE USER (การเรียกตัวผู้ใช้งาน / คุยกับผู้เรียน):
   - When Kru Whan speaks to or refers to the user (e.g. in feedback points, encouragement, or advice), ALWAYS call the user "นักเรียน" (e.g. "ประโยคของนักเรียน", "นักเรียนเลือกคำศัพท์ได้ดีมากค่ะ", "นักเรียนลองปรับ...", "คำตอบของนักเรียน").
   - DO NOT call the user "ลูกค้า" (customer), "ผู้ใช้" (user), "น้อง", "น้องๆ", or "คุณ".

2. TRANSLATING QUESTIONS, SENTENCES, OR ANSWERS (การแปลเนื้อหาประโยค โจทย์ หรือคำตอบ):
   - When translating English to Thai or Thai to English in the exercise content ("studentTranslation" or questions/answers), you are NOT calling or addressing the user! You are translating the text faithfully!
   - In translations:
     * "you" translates as "คุณ" (or "เธอ") — NEVER translate "you" as "นักเรียน"! (e.g. "I will help you" = "ฉันจะช่วยคุณ", NOT "ฉันจะช่วยนักเรียน"!).
     * "customer" / "customers" translates as "ลูกค้า" — NEVER translate "customer" as "นักเรียน"! (e.g. "I help the customer" = "ฉันช่วยลูกค้า", NOT "ฉันช่วยนักเรียน"!).
     * "student" / "students" translates as "นักเรียน".
     * "they" / "them" referring to human beings (customers, guests, people) translates as "พวกเขา" (or "เขา"), NEVER "พวกมัน".
     * "they" / "them" referring to inanimate things/objects (bags, dishes, cars) translates as "พวกมัน", "สิ่งเหล่านั้น", or the noun itself.

CRITICAL ANTI-HALLUCINATION & STUDENT ANSWER ISOLATION (ZERO HALLUCINATIONS):
- You MUST evaluate ONLY the words that the student actually typed in "Student Answer to Evaluate".
- NEVER attribute words from the reference example (such as 'bags') to the student if the student did not write them!
- NEVER state in feedback "คำว่า '...' ที่นักเรียนใช้" or give feedback analyzing words that the student DID NOT write in their sentence!
- The "Reference Model Answer" is provided ONLY as an example of one valid sentence for teacher guidance. It is NOT what the student wrote!
- Example: If the student wrote "I'm expected to help the customer at the hotel, so I make sure to handle them carefully":
  * The student wrote "the customer" and "handle them", NOT "bags"!
  * DO NOT claim in feedback: "คำว่า 'bags' เป็นคำนามพหูพจน์ เมื่อนักเรียนใช้สรรพนาม 'them' อ้างถึงกระเป๋า..." -> THIS IS A BLATANT HALLUCINATION! The student never typed "bags"!
  * Critique what the student ACTUALLY wrote:
    1) Singular vs Plural pronoun mismatch: "the customer" is singular, but student used plural pronoun "them" (if referring to customers in general, use plural "customers", or if singular use "him/her").
    2) Word collocation: "handle" in English is typically used for physical objects or luggage/bags (เช่น ถือ/ยก/ดูแลสิ่งของอย่างระมัดระวัง), whereas for customers (people), we normally say "serve them politely", "assist them attentively", or "take care of them properly".
    3) If the student wanted to describe the bellboy carrying luggage in the picture, suggest that they can use "carry bags at the hotel, so I make sure to handle them carefully".

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

2. TEACHER PERSONA & STRICT ENFORCEMENT OF TAUGHT LESSON SENTENCE STRUCTURE:
   - You are a real, meticulous, and expert English teacher (Kru Whan) grading student exercises.
   - In each unit, a specific sentence structure or grammar pattern is taught to the student (e.g., "S. + is/am/are + V.3", "S. + is/am/are + V.ing", "Core + Context + Connect", "S. + have/has + V.3", etc., as specified in the quiz context).
   - MANDATORY STRUCTURE ADHERENCE:
     * The student MUST construct their sentence using the target grammatical structure taught in this lesson.
     * CRITICAL RULE: Even if the student's answer is grammatically correct in general English, IF IT DOES NOT FOLLOW OR USE THE SENTENCE STRUCTURE TAUGHT IN THIS UNIT, IT IS 100% INCORRECT (isCorrect: false)!
     * Example: If the unit teaches Passive Voice ("S. + is/am/are + V.3"), and the student writes an active voice sentence (e.g. "The barber cuts my hair" or "I cut my hair"), it MUST BE MARKED AS INCORRECT (isCorrect: false), because the student did not use the taught structure!
     * Example: If the unit teaches Present Continuous ("S. + is/am/are + V.ing"), and the student writes simple present ("I do...") or simple past ("I did..."), it MUST BE MARKED AS INCORRECT (isCorrect: false).
     * When incorrect due to wrong structure:
       - Set isCorrect: false
       - Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
       - In feedbackPoints, explain clearly as a teacher:
         1) "ในบทเรียนนี้เรากำลังฝึกแต่งประโยคด้วยโครงสร้าง [Target Structure ที่กำหนด] นะคะ"
         2) Explain what structure the student used instead and why it needs to change.
         3) Show how to restructure it into the required formula.
   - 100% GRAMMATICAL INTEGRITY & PRECISION:
     * Subject-Verb Agreement: Ensure the subject matches the auxiliary/verb (e.g. "He is" vs "He are").
     * Verb Forms: Check that the verb is in the exact required form (e.g. Past Participle V.3, V.ing, Base form).
     * Prepositions, Articles (a/an/the), Punctuation (Capital start, period '.' at end), and Spelling must all be strictly verified.
     * If there is ANY grammatical error, mark isCorrect: false and explain the error kindly.

3. STRICT PUNCTUATION MARKS, DETERMINERS & PRONOUN-ANTECEDENT AGREEMENT (TEACHER'S RIGOROUS CHECK):
   - PUNCTUATION MARKS (COMMAS & FULL STOPS - CRITICAL):
     * Comma before Coordinating Conjunctions: When joining two clauses with words like "so", "but", "and" (e.g. Core + Context + Connect like "..., so I make sure to..."), there MUST be a comma (,) before the conjunction!
       - Example: "I'm expected to help customers at work, so I make sure to do it properly." (MUST have comma before 'so').
       - If the student writes "... at work so I make sure..." without the comma:
         * MUST mark as INCORRECT (isCorrect: false).
         * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
         * In feedbackPoints, explain: "• ขาดเครื่องหมายจุลภาค (Comma ,) หน้าคำเชื่อม 'so' นะคะ เมื่อเชื่อมสองประโยคเข้าด้วยกัน ควรใส่เป็น ', so' ค่ะ"
     * Full Stop / Period (.): Every sentence MUST end with a period (.). If missing, set isCorrect: false, and advise: "• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ท้ายประโยคด้วยนะคะ"
     * Capitalization: The first letter of the sentence MUST be capitalized (e.g. "I'm", "He", "The").
   - DETERMINERS & COLLOCATIONS:
     * Specific objects and household chores require appropriate articles/determiners (e.g. "do the dishes" or "wash the dishes", NOT "do dishes"; "make the bed", NOT "make bed"; "take out the trash", NOT "take out trash").
     * If an essential determiner like "the" is missing in such collocations:
       * MUST mark as INCORRECT (isCorrect: false).
       * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
       * In feedbackPoints, explain: "• สำหรับคำว่า 'dishes' ในบริบทนี้ ควรมีคำนำหน้านาม 'the' เป็น 'the dishes' (เช่น do the dishes) นะคะ"
   - PRONOUN-ANTECEDENT NUMBER AGREEMENT (SINGULAR VS PLURAL):
     * A pronoun referring back to a noun must strictly agree in number (singular vs plural).
     * Example: "the dishes" is PLURAL (คำนามพหูพจน์). When referring back to it later in the clause (e.g. "so I make sure to do [pronoun]"), the pronoun MUST be "them" (plural object pronoun), NOT "it" (singular)!
     * If pronoun number does not match the antecedent (e.g. writing "do it" when referring to dishes):
       * MUST mark as INCORRECT (isCorrect: false).
       * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
       * In feedbackPoints, explain: "• คำว่า 'dishes' เป็นคำนามพหูพจน์ สรรพนามที่ใช้แทนจะต้องเป็น 'them' ไม่ใช่ 'it' นะคะ (เช่น 'do them' แทนที่จะเป็น 'do it')"

4. GRAMMAR, VOCABULARY & IMAGE PROMPT ANALYSIS:
   - Compare the student's vocabulary (subjects, actions, feelings, objects) with the "Picture Description / Image Prompt".
   - Broad Semantic Acceptance: If the image depicts someone at a desk with books/lamp, actions like 'read', 'read books', 'study', 'review the lesson', 'learn new things', 'do homework' are ALL 100% valid and directly match the picture!
   - Parts of Speech: Ensure words in each slot match the required POS (e.g. if an Adjective is required in Connect, catch nouns/verbs like 'sleep' -> 'sleepy/tired').
   - Auxiliary Verbs: Catch redundant verbs like 'I'm am'.
   - Determiners: Do not claim determiners are missing if 'the', 'a', 'an', or 'my' is already used (e.g. 'the lesson' is correct).

5. CHARACTER GENDER & SEX ACCURACY IN PICTURE DESCRIPTION (STRICT):
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

6. ACCURACY OF IMAGE ELEMENTS, OBJECTS & ENTITIES (STRICT VISUAL MATCHING):
   - Verify that all key subjects, objects, animals, actions, and settings mentioned by the student match what is depicted in the "Picture Description & Scene Context Prompt" or the reference visual context.
   - If the image contains a specific entity and the student mentions an incorrect or conflicting entity (for example: image shows a DOG, but student writes "cat"; image shows COFFEE, but student writes "soup"; image shows a BICYCLE, but student writes "car"; image shows a HAIRCUT, but student writes "cooking"):
     * MUST mark as INCORRECT (isCorrect: false).
     * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
     * In feedbackPoints, explicitly explain the visual mismatch in Thai using Kru Whan female polite tone (ค่ะ/นะคะ) and the pronoun "นักเรียน":
       e.g., "• ในภาพเป็นสุนัข (dog) ไม่ใช่แมว (cat) นะคะ นักเรียนลองปรับคำศัพท์ให้ตรงกับสิ่งที่เกิดขึ้นในภาพดูนะคะ"

7. REAL-WORLD PLAUSIBILITY & LOGICAL REALITY CHECK (CRITICAL):
   - Even if the grammar and sentence structure formula are technically 100% correct, the sentence MUST describe a situation that is possible, natural, and realistic in real life.
   - If an action, habit, frequency, or circumstance contradicts reality, common sense, or human nature:
     * For example: "I have my hair cut everyday after I leave for work" -> Getting a haircut every single day is not realistic or common practice in real life!
     * For example: Eating 30 meals a day, drinking boiling lava, walking to the moon after work, brushing teeth every minute, etc.
     * When the sentence describes an unrealistic or impossible habit/frequency/action:
       - MUST mark as INCORRECT (isCorrect: false).
       - Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
       - In feedbackPoints, kindly explain the real-world implausibility in Thai and suggest a realistic, natural alternative:
         e.g., "• แม้โครงสร้างประโยคจะถูกต้อง แต่การตัดผมทุกวัน (every day) อาจไม่สอดคล้องกับความเป็นจริงในชีวิตประจำวันนะคะ นักเรียนสามารถปรับความถี่หรือช่วงเวลาให้สมจริงยิ่งขึ้น เช่น 'once a month' หรือ 'every few weeks' ได้ค่ะ"

8. WHEN STUDENT ANSWER IS CORRECT (100% Valid & Meaningful):
   - Set "isCorrect": true
   - Set "statusText": "ถูกต้องเลยค่ะ เก่งมากเลย 👏"
   - In "feedbackPoints", praise the student, highlight how well their sentence fulfills the structure formula, and note how well it fits the visual scene.

9. WHEN STUDENT ANSWER NEEDS IMPROVEMENT:
   - Set "isCorrect": false
   - Set "statusText": "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
   - In "feedbackPoints", clearly explain the structure/grammar/punctuation/determiner/pronoun/gender/entity/reality issue with teacher guidance, provide gentle tips on natural usage, and encourage them.

10. THAI TRANSLATION & RECOMMENDED SENTENCE:
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

  const modelAnswer = req.item.model_answer ? `Example Reference Sentence (FOR TEACHER REFERENCE ONLY - DO NOT assume the student used words from this example unless they actually appear in the student's answer): "${req.item.model_answer}"` : '';
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
    const unitTitle = req.item.unit_title || '';
    const unitSubtitle = req.item.unit_subtitle || '';
    const exerciseTitle = req.item.exercise_title || '';
    const exerciseInstruction = req.item.exercise_instruction || '';
    const exerciseGuidance = req.item.exercise_guidance || '';
    const grammarFocus = req.item.grammar_focus || '';
    const structureRequired = req.item.structure_required ? JSON.stringify(req.item.structure_required) : '';

    const targetStructure = req.item.teacher_guidance || 
                            grammarFocus || 
                            exerciseGuidance || 
                            unitSubtitle || 
                            `Core: I + do + [ V.ไม่ผัน ]\nContext: [ to + V.ไม่ผัน ]\nConnect: [ even when I'm + คำคุณศัพท์ ]`;

    prompt = `Exercise Type: Picture Description & Sentence Construction (Exercise 3: Free-Style Structure Building)
${unitTitle ? `Unit Title: "${unitTitle}"\n` : ''}${unitSubtitle ? `Unit Lesson Subtitle & Pattern: "${unitSubtitle}"\n` : ''}${exerciseTitle ? `Exercise Title: "${exerciseTitle}"\n` : ''}${exerciseInstruction ? `Exercise Instructions: "${exerciseInstruction}"\n` : ''}${grammarFocus ? `Grammar Focus: "${grammarFocus}"\n` : ''}${structureRequired ? `Required Structure Blueprint: ${structureRequired}\n` : ''}${req.item.image_description ? `Picture Description & Scene Context Prompt:\n"${req.item.image_description}"\n` : ''}
${modelAnswer}
${acceptableAnswers}

🎯 TARGET LESSON SENTENCE STRUCTURE TO ENFORCE (สูตรโครงสร้างประโยคประจำบทเรียนที่ต้องบังคับใช้):
${targetStructure}

Student Answer to Evaluate: "${req.studentAnswer}"

Evaluation Steps for this Quiz (ACT STRICTLY LIKE A TEACHER GRADING A STUDENT'S EXERCISE):
1. Translate what the student wrote into natural Thai and return it in "studentTranslation":
   - "customer" / "customers" MUST be translated as "ลูกค้า", NEVER "นักเรียน".
   - "they" / "them" referring to human beings (customers, guests, people) MUST be translated as "พวกเขา", NEVER "พวกมัน".
2. STRICT ANTI-HALLUCINATION CHECK:
   - Evaluate ONLY the words that the student actually wrote in "${req.studentAnswer}".
   - NEVER attribute words from the reference example (such as 'bags') to the student if the student did not write them!
   - NEVER say "คำว่า '...' ที่นักเรียนใช้" for words that do NOT exist in the student's answer!
3. STRICT SENTENCE STRUCTURE ENFORCEMENT (PRIMARY TEACHER DUTY):
   - Check if the student's answer adheres to the TARGET SENTENCE STRUCTURE taught in this unit ("${targetStructure}").
   - If the student writes a sentence that fails to use or ignores the required formula (e.g., using active voice when passive voice S. + is/am/are + V.3 is taught, using wrong tense, or missing required slots):
     * MUST mark isCorrect: false.
     * statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
     * In feedbackPoints, explain: "ในบทเรียนนี้เรากำลังฝึกแต่งประโยคด้วยโครงสร้าง [ระบุโครงสร้าง] นะคะ" and point out exactly what needs to be changed to conform to the lesson.
3. STRICT PUNCTUATION MARKS & CLAUSE COMMAS:
   - Check for a comma (,) before coordinating conjunctions when connecting clauses (e.g. "..., so I make sure to...", "..., but...", "..., and..."). If the comma is omitted (e.g. "... at home so I make sure..."), MUST mark isCorrect: false, statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ", and advise to add a comma before 'so' (e.g. ", so").
   - Check for ending period / full stop (.). If missing, mark isCorrect: false.
   - Check first letter capitalization.
4. STRICT DETERMINERS & COLLOCATIONS:
   - Check that set phrases and chores include required determiners (e.g. "do the dishes" NOT "do dishes", "make the bed", "take out the trash"). If missing 'the', mark isCorrect: false and advise in feedbackPoints.
5. STRICT PRONOUN-ANTECEDENT AGREEMENT:
   - Pronouns must match plural/singular nouns they replace (e.g. referring back to plural "the dishes" requires "them", NOT "it"; referring back to singular "the car" requires "it", NOT "them"). If mismatched (e.g. "do the dishes ... so I make sure to do it"), MUST mark isCorrect: false and advise in feedbackPoints.
6. STRICT GRAMMATICAL CORRECTNESS:
   - Check 100% grammar accuracy: Subject-verb agreement (e.g. He is vs He are), verb forms (V.3 vs V.ing vs Base Verb), prepositions, articles (a/an/the), and spelling.
   - If any grammatical error exists, mark isCorrect: false and explain the rule kindly.
7. STRICT CHARACTER GENDER & PRONOUN VERIFICATION:
   - "I" / "I am" / "I'm" / "I do" is ALWAYS acceptable and correct (first-person perspective).
   - If the character depicted in the picture/context is MALE and student wrote "she", "her", or feminine pronouns: MUST mark isCorrect: false, and advise that the character is male so should use "he" (or "I") instead of "she".
   - If the character depicted in the picture/context is FEMALE and student wrote "he", "his", "him", or masculine pronouns: MUST mark isCorrect: false, and advise that the character is female so should use "she" (or "I") instead of "he".
8. STRICT IMAGE ELEMENT & ENTITY VERIFICATION:
   - Check that the animals, objects, actions, and settings in the student's answer match the picture context ("${req.item.image_description || ''}").
   - If image has a dog and student writes "cat", image has coffee and student writes "wine", image has haircut and student writes "swimming" -> MUST mark isCorrect: false, statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ", and advise in feedbackPoints that the image shows [element in picture] not [student's word].
9. STRICT REAL-WORLD PLAUSIBILITY & COMMON SENSE CHECK:
   - Even if grammar is correct, the sentence MUST be reasonable, plausible, and possible in real life!
   - If student writes an unrealistic habit or frequency (e.g. "I have my hair cut everyday...", "I wash my car every 10 minutes...", "I eat dinner 10 times a night..."):
     * MUST mark isCorrect: false.
     * statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
     * In feedbackPoints, explain kindly that this frequency/action is not realistic in everyday life, and suggest a plausible alternative (e.g. once a month, on weekends).
10. If the sentence is 100% grammatically correct, adheres strictly to the target sentence structure, logically matches the image elements and gender, and is plausible in real life:
   - Set isCorrect: true, statusText: "ถูกต้องเลยค่ะ เก่งมากเลย 👏", and praise their sentence in feedbackPoints.
11. If there are errors (structure mismatch, missing comma, determiner error, pronoun mismatch, grammatical error, unrealistic habit, entity mismatch, gender mismatch), explain kindly in feedbackPoints using the term "นักเรียน" and provide the best corrected sentence conforming to the target formula in "correctedSentence".
12. Use Kru Whan's female polite tone (ค่ะ/นะคะ/เลยค่ะ) throughout all feedbackPoints.`;
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
  let sanitizedFeedbackPoints = cleanFeedbackPoints(rawFeedbackPoints, req.studentAnswer);

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
    studentTranslation: cleanStudentTranslation(parsed.studentTranslation || '', req.studentAnswer),
    correctedSentence: finalCorrectedSentence,
    feedbackPoints: sanitizedFeedbackPoints,
    breakdown: cleanBreakdown,
    modelUsed: successfulModel
  };
}

/**
 * Ensures student translation accurately translates words like 'customer' as 'ลูกค้า'
 * and human pronouns like 'them' as 'พวกเขา' instead of 'พวกมัน'.
 */
function cleanStudentTranslation(translation: string, studentAns: string): string {
  if (!translation) return '';
  let result = translation;

  // If student wrote customer/client, ensure translation has ลูกค้า not นักเรียน
  if (/\b(customer|customers|client|clients)\b/i.test(studentAns)) {
    result = result.replace(/ช่วยนักเรียน/g, 'ช่วยลูกค้า')
                   .replace(/บริการนักเรียน/g, 'บริการลูกค้า')
                   .replace(/ดูแลนักเรียน/g, 'ดูแลลูกค้า')
                   .replace(/ต่อนักเรียน/g, 'ต่อลูกค้า')
                   .replace(/กับนักเรียน/g, 'กับลูกค้า')
                   .replace(/พบนักเรียน/g, 'พบลูกค้า');
  }

  // If student wrote about human beings (customer, guests, people, passengers, staff, etc.),
  // 'them' referring to humans must be 'พวกเขา' (or 'เขา') and NEVER 'พวกมัน'!
  if (/\b(customer|customers|guest|guests|people|person|passenger|passengers|staff|client|clients|visitor|visitors|friend|friends)\b/i.test(studentAns)) {
    result = result.replace(/พวกมัน/g, 'พวกเขา')
                   .replace(/จัดการพวกมัน/g, 'ดูแลพวกเขา')
                   .replace(/บริการพวกมัน/g, 'บริการพวกเขา')
                   .replace(/ช่วยพวกมัน/g, 'ช่วยพวกเขา');
  }

  return result;
}

/**
 * Sanitizes and cleans feedback points to prevent hallucinated claims
 * (such as attributing words from the reference model answer like 'bags' that the student never typed).
 */
function cleanFeedbackPoints(points: string[], studentAns: string): string[] {
  const studentLower = studentAns.toLowerCase();
  const hasBags = /\bbags?\b/i.test(studentLower);

  return points.map(pt => {
    let cleaned = sanitizeThaiStudentPronouns(pt);

    // If student did NOT mention 'bags' / 'bag', but feedback hallucinated claiming student used 'bags':
    if (!hasBags) {
      cleaned = cleaned.replace(/คำว่า\s*['"‘“]bags?['"’”]\s*(?:เป็นคำนามพหูพจน์\s*)?เมื่อนักเรียนใช้สรรพนาม\s*['"‘“]them['"’”]\s*อ้างถึงกระเป๋า.*?(?=แต่|$)/g,
        'หากนักเรียนต้องการสื่อถึงกระเป๋าเดินทาง (bags) ในภาพ ');
      cleaned = cleaned.replace(/คำว่า\s*['"‘“]bags?['"’”]\s*ที่นักเรียนใช้/g,
        'กระเป๋าเดินทาง (bags) ในภาพ');
    }

    // Ensure business customer mentions are not corrupted to นักเรียน
    cleaned = cleaned.replace(/บริการนักเรียน/g, 'บริการลูกค้า')
                     .replace(/การช่วยเหลือนักเรียน/g, 'การช่วยเหลือลูกค้า')
                     .replace(/ช่วยนักเรียนที่โรงแรม/g, 'ช่วยลูกค้าที่โรงแรม')
                     .replace(/ไม่ใช่การช่วยนักเรียน/g, 'ไม่ใช่การช่วยลูกค้า');

    // Ensure humans are not referred to as พวกมัน
    if (/\b(customer|customers|guest|guests|people|person|passenger|passengers|staff|client|clients)\b/i.test(studentLower)) {
      cleaned = cleaned.replace(/จัดการพวกมัน/g, 'ดูแลพวกเขา')
                       .replace(/ดูแลพวกมัน/g, 'ดูแลพวกเขา');
    }

    return cleaned;
  });
}

/**
 * Sanitizes Thai pronouns to strictly use "นักเรียน" ONLY when Kru Whan addresses the user,
 * and NEVER replaces "คุณ" in general or the noun "ลูกค้า" (customer).
 */
function sanitizeThaiStudentPronouns(text: string): string {
  if (!text) return '';
  return text
    .replace(/น้องๆ/g, 'นักเรียน')
    .replace(/น้อง/g, 'นักเรียน')
    .replace(/คุณลูกค้า/g, 'นักเรียน')
    .replace(/ประโยคของคุณ/g, 'ประโยคของนักเรียน')
    .replace(/คำตอบของคุณ/g, 'คำตอบของนักเรียน')
    .replace(/ข้อความของคุณ/g, 'ข้อความของนักเรียน')
    .replace(/การบ้านของคุณ/g, 'การบ้านของนักเรียน')
    .replace(/ของตัวคุณ/g, 'ของตัวนักเรียน')
    .replace(/ตัวคุณ/g, 'ตัวนักเรียน');
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

  // Comma before coordinating conjunction 'so' when connecting clauses
  if (/\b\w+\s+so\s+i\b/i.test(original) && !/,\s*so\s+/i.test(original)) {
    isCorrect = false;
    points.push('• ขาดเครื่องหมายจุลภาค (Comma ,) หน้าคำเชื่อม "so" นะคะ เมื่อเชื่อมประโยคเข้าด้วยกัน ควรใส่เป็น ", so" ค่ะ');
  }

  // Determiner check: e.g. do dishes -> do the dishes
  if (/\b(do|wash)\s+dishes\b/i.test(normalizedLower) && !/\b(do|wash)\s+the\s+dishes\b/i.test(normalizedLower)) {
    isCorrect = false;
    points.push('• สำหรับคำว่า "dishes" ในบริบทนี้ ควรมีคำนำหน้านาม "the" เป็น "the dishes" (เช่น do the dishes) นะคะ');
  }

  // Pronoun-antecedent agreement: dishes is plural -> them, not it
  if (/\bdishes\b/i.test(normalizedLower) && /\b(do|wash|clean)\s+it\b/i.test(normalizedLower)) {
    isCorrect = false;
    points.push('• คำว่า "dishes" เป็นคำนามพหูพจน์ สรรพนามที่ใช้แทนจะต้องเป็น "them" ไม่ใช่ "it" นะคะ (เช่น "do them" แทนที่จะเป็น "do it")');
  }

  const hasCore = /\b(i do|i am|he does|she does|i have|i will|he is|she is)\b/i.test(normalizedLower);
  const hasContext = /\b(to\s+\w+|at|in|on)\b/i.test(normalizedLower);
  const hasConnect = /\b(even when|because|when|although|so)\b/i.test(normalizedLower);

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
