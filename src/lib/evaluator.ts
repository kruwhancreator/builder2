import { GoogleGenAI } from '@google/genai';

export interface EvaluationRequest {
  exerciseType: 'translation' | 'guided_sentence' | 'picture_description';
  item: any;
  studentAnswer: string;
  wordBank?: any;
  templates?: string[];
}

export interface EvaluationResult {
  score: number;
  statusText: string;
  correctedSentence: string;
  feedbackPoints: string[];
  breakdown?: Record<string, any>;
  isLiveGemini?: boolean;
  modelUsed?: string;
}

export async function evaluateAnswer(req: EvaluationRequest): Promise<EvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && apiKey.trim() !== '') {
    try {
      const geminiResult = await evaluateWithGemini(apiKey, req);
      return { ...geminiResult, isLiveGemini: true };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local evaluator:', err);
      return { ...evaluateLocally(req), isLiveGemini: false };
    }
  }

  return { ...evaluateLocally(req), isLiveGemini: false };
}

async function evaluateWithGemini(apiKey: string, req: EvaluationRequest): Promise<EvaluationResult> {
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an expert English Language Teacher & QuillBot-style AI Exercise Advisor for Thai students using Sentence Builder Vol. 2.
Your goal is to evaluate student answers, check grammar (Present Continuous: S + is/am/are + V.ing), detect spelling errors (e.g., "makeing" -> "making"), check punctuation (must have a period '.' at the end), and provide encouraging feedback in Thai.

CRITICAL EVALUATION RULES:
1. Check Spelling: Carefully look for spelling errors in verbs (e.g. "makeing" -> "making", "driveing" -> "driving", "runing" -> "running"). If a spelling mistake is found, explicitly mention it in feedbackPoints in Thai and fix it in correctedSentence.
2. Check Punctuation: Check if the sentence ends with a period (Full stop "."). If missing, add "." to correctedSentence and remind the student in Thai: "อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ท้ายประโยคด้วยครับ".
3. For Exercise 1 (Translation): Compare against the target Model Answer and Teacher Guidance provided.
4. For Exercise 2 (Guided Free Style Sentence): Students write free-style sentences. Verify that grammar (S + is/am/are + V.ing) is correct and matches the step requirement.

CRITICAL REQUIREMENT: You MUST respond ONLY with valid, raw JSON matching this schema:
{
  "score": number (0-100),
  "statusText": "string in Thai (e.g. ✅ ถูกต้องสมบูรณ์! (100%) or ⚡ เกือบถูกต้องแล้ว! (90%))",
  "correctedSentence": "string (the natural, grammatically correct English sentence ending with a period '.')",
  "feedbackPoints": ["string in Thai", "string in Thai"],
  "breakdown": optional object with key-value checks (e.g. { "actionValid": true, "timeValid": true, "purposeValid": true, "reasonValid": true })
}
Do not wrap in markdown code blocks. Return pure raw JSON string only.`;

  const modelAnswer = req.item.model_answer ? `Target Model Answer: "${req.item.model_answer}"` : '';
  const acceptableAnswers = req.item.acceptable_answers ? `Acceptable Variations: ${JSON.stringify(req.item.acceptable_answers)}` : '';
  const teacherGuidance = req.item.teacher_guidance ? `Teacher Instructions: "${req.item.teacher_guidance}"` : '';

  let prompt = '';
  if (req.exerciseType === 'translation') {
    prompt = `Exercise Type: Translation
Thai Prompt: "${req.item.thai}"
Target Keywords: ${JSON.stringify(req.item.keywords || [])}
${modelAnswer}
${acceptableAnswers}
${teacherGuidance}
Student Answer: "${req.studentAnswer}"

Evaluate student answer against Target Model Answer and Teacher Instructions. Check spelling (e.g. makeing -> making), grammar (S + is/am/are + V.ing), and ending period '.'.`;
  } else if (req.exerciseType === 'guided_sentence') {
    prompt = `Exercise Type: Guided Sentence (Free Style)
Prompt Step: "${req.item.prompt}"
Word Bank Reference: ${JSON.stringify(req.wordBank || {})}
Templates Reference: ${JSON.stringify(req.templates || [])}
${modelAnswer}
${teacherGuidance}
Student Answer: "${req.studentAnswer}"

Students write free-style sentences following the step structure. Check grammar (I am + V.ing), spelling (e.g. "makeing" -> "making"), and full stop "." at the end.
Provide breakdown object: { "actionValid": boolean, "timeValid": boolean, "purposeValid": boolean, "reasonValid": boolean }.`;
  } else {
    prompt = `Exercise Type: Picture Description
Picture Description: "${req.item.image_description}"
Context Hint: "${req.item.context_hint || ''}"
${modelAnswer}
${acceptableAnswers}
${teacherGuidance}

Required Structure:
1. Core: S + is/am/are + V.ing (e.g., "The man is drinking coffee", "I am drinking coffee")
2. Context: time or place (e.g., "at the cafe", "right now", "now")
3. Connect: cause/reason/purpose (e.g. "because ...", "for refreshment", "to save money")

Student Answer: "${req.studentAnswer}"

Check Core (S + is/am/are + V.ing with any valid subject), Context, Connect, spelling errors (e.g. makeing -> making), and ending period '.'.
Return breakdown object: { "core": boolean, "context": boolean, "connect": boolean }.`;
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
          temperature: 0.2,
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

  return {
    score: typeof parsed.score === 'number' ? parsed.score : 80,
    statusText: parsed.statusText || 'ตรวจคำตอบเรียบร้อยแล้ว',
    correctedSentence: parsed.correctedSentence || req.studentAnswer,
    feedbackPoints: Array.isArray(parsed.feedbackPoints) ? parsed.feedbackPoints : ['ไวยากรณ์ส่วนใหญ่ถูกต้อง'],
    breakdown: cleanBreakdown,
    modelUsed: successfulModel
  };
}

function evaluateLocally(req: EvaluationRequest): EvaluationResult {
  const cleanAnswer = req.studentAnswer.trim();
  const lowerAnswer = cleanAnswer.toLowerCase();

  if (!cleanAnswer) {
    return {
      score: 0,
      statusText: '❌ กรุณาพิมพ์คำตอบก่อนส่งตรวจครับ',
      correctedSentence: '',
      feedbackPoints: ['ยังไม่มีข้อมูลคำตอบ กรุณาพิมพ์คำตอบภาษาอังกฤษในช่องข้อความ']
    };
  }

  if (req.exerciseType === 'translation') {
    return evaluateTranslationLocally(req.item, lowerAnswer, cleanAnswer);
  } else if (req.exerciseType === 'guided_sentence') {
    return evaluateGuidedSentenceLocally(lowerAnswer, cleanAnswer);
  } else {
    return evaluatePictureDescriptionLocally(lowerAnswer, cleanAnswer);
  }
}

function evaluateTranslationLocally(item: any, lower: string, original: string): EvaluationResult {
  const points: string[] = [];
  let score = 100;

  // Check spelling e.g. makeing -> making
  let fixedSentence = original;
  if (/\bmakeing\b/i.test(original)) {
    score -= 15;
    points.push('⚠️ สะกดคำผิด: "makeing" ควรแก้เป็น "making" (ตัด e ก่อนเติม -ing)');
    fixedSentence = fixedSentence.replace(/\bmakeing\b/gi, 'making');
  }

  // Check full stop
  const hasFullStop = original.endsWith('.');
  if (!hasFullStop) {
    score -= 10;
    points.push('💡 อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ท้ายประโยคด้วยครับ');
    fixedSentence = fixedSentence + '.';
  }

  const hasPresentContinuous = /\b(am|is|are)\s+\w+ing\b/.test(lower) || /\b(am|is|are)\s+making\b/.test(lower);
  if (!hasPresentContinuous) {
    score -= 25;
    points.push('💡 อย่าลืมใช้โครงสร้าง Present Continuous: S + is/am/are + V.ing');
  } else {
    points.push('✅ การใช้โครงสร้าง Present Continuous ถูกต้องตามหลักภาษา');
  }

  const targetAnswer = item.model_answer || fixedSentence;

  return {
    score: Math.max(score, 60),
    statusText: score >= 90 ? '🎉 ถูกต้องสมบูรณ์! (100%)' : `⚡ เกือบถูกต้องแล้ว! (${score}%)`,
    correctedSentence: targetAnswer,
    feedbackPoints: points.length > 0 ? points : ['ประโยคถูกต้องและสละสลวย']
  };
}

function evaluateGuidedSentenceLocally(lower: string, original: string): EvaluationResult {
  const points: string[] = [];
  let score = 100;

  let fixedSentence = original;
  if (/\bmakeing\b/i.test(original)) {
    score -= 15;
    points.push('⚠️ สะกดคำผิด: "makeing" ควรแก้เป็น "making" (ตัด e ก่อนเติม -ing)');
    fixedSentence = fixedSentence.replace(/\bmakeing\b/gi, 'making');
  }

  const hasFullStop = original.endsWith('.');
  if (!hasFullStop) {
    score -= 10;
    points.push('💡 อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ท้ายประโยคด้วยครับ');
    fixedSentence = fixedSentence + '.';
  }

  const hasAction = /\b(making|cleaning|adjusting|cooking|studying|working|drinking|running|buying)\b/.test(lower) || /\b(am|is|are)\s+\w+ing\b/.test(lower);
  const hasTime = /\b(now|right now|at the moment|currently|today)\b/.test(lower);
  const hasPurpose = /\b(to|for)\s+\w+/.test(lower);
  const hasReason = lower.includes("because") || lower.includes("due to");

  if (!hasAction) {
    score -= 25;
    points.push('💡 อย่าลืมใส่กริยา Action ในรูปแบบ Present Continuous (S + is/am/are + V.ing)');
  } else {
    points.push('✅ โครงสร้าง Action (S + is/am/are + V.ing) ถูกต้องสมบูรณ์');
  }

  if (hasTime) {
    points.push('✅ มีการระบุช่วงเวลา (Time) อย่างชัดเจน');
  }

  if (hasPurpose) {
    points.push('✅ มีการใช้ to/for แสดงจุดประสงค์ (Purpose)');
  }

  if (hasReason) {
    points.push('✅ มีการระบุเหตุผล (Reason) ด้วยคำเชื่อม because');
  }

  const breakdown = {
    actionValid: hasAction,
    timeValid: hasTime,
    purposeValid: hasPurpose,
    reasonValid: hasReason
  };

  return {
    score: Math.max(score, 65),
    statusText: score >= 90 ? '🎉 ยอดเยี่ยม! แต่งประโยคตรงตามเงื่อนไข (90%+)' : `⚡ เกือบสมบูรณ์แล้ว! (${score}%)`,
    correctedSentence: fixedSentence.charAt(0).toUpperCase() + fixedSentence.slice(1),
    feedbackPoints: points,
    breakdown
  };
}

function evaluatePictureDescriptionLocally(lower: string, original: string): EvaluationResult {
  const points: string[] = [];

  let fixedSentence = original;
  if (/\bmakeing\b/i.test(original)) {
    points.push('⚠️ สะกดคำผิด: "makeing" ควรแก้เป็น "making"');
    fixedSentence = fixedSentence.replace(/\bmakeing\b/gi, 'making');
  }

  const hasFullStop = original.endsWith('.');
  if (!hasFullStop) {
    points.push('💡 อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ท้ายประโยคด้วยครับ');
    fixedSentence = fixedSentence + '.';
  }

  const hasCore = /\b(i\s+am|(he|she|it|they|we|you|the\s+\w+|\w+)\s+(is|am|are))\s+\w+ing\b/i.test(lower) || /\b(is|am|are)\s+\w+ing\b/i.test(lower);
  const hasContext = /\b(at|in|on|now|right now|at the moment|currently|today|cafe|park|supermarket)\b/i.test(lower);
  const hasConnect = /\b(because|for|to)\b/i.test(lower) || lower.includes("so that");

  let coreScore = hasCore ? 35 : 10;
  let contextScore = hasContext ? 35 : 15;
  let connectScore = hasConnect ? 30 : 10;

  const totalScore = coreScore + contextScore + connectScore;

  if (hasCore) {
    points.push('✅ Core (S + is/am/are + V.ing): มีประธานและกริยา Present Continuous ถูกต้อง');
  } else {
    points.push('❌ Core: ขาดโครงสร้าง S + is/am/are + V.ing');
  }

  if (hasContext) {
    points.push('✅ Context: มีการระบุสถานที่หรือเวลา (เช่น at the cafe, right now)');
  } else {
    points.push('⚠️ Context: ควรเพิ่มคำระบุสถานที่หรือช่วงเวลาเพื่อให้เห็นภาพชัดเจน');
  }

  if (hasConnect) {
    points.push('✅ Connect: มีการใช้คำเชื่อมบอกเหตุผล/จุดประสงค์');
  } else {
    points.push('⚠️ Connect: ควรใช้ because หรือ to/for เชื่อมประโยคบอกเหตุผล');
  }

  const breakdown = {
    core: hasCore,
    context: hasContext,
    connect: hasConnect
  };

  return {
    score: totalScore,
    statusText: totalScore >= 90 ? '🌟 ครบถ้วน 3 โครงสร้าง! (100%)' : `🧩 ได้ ${totalScore}% (ตรวจสอบ 3 โครงสร้างด้านล่าง)`,
    correctedSentence: fixedSentence.charAt(0).toUpperCase() + fixedSentence.slice(1),
    feedbackPoints: points,
    breakdown
  };
}
