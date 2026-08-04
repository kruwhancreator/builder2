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

  const systemInstruction = `You are QuillBot-style AI Exercise Advisor for English language learners in Thailand using Sentence Builder Vol. 2.
Evaluate student answers with encouragement, score (0-100), corrected sentence, and detailed Thai bullet points.

CRITICAL REQUIREMENT: You MUST respond ONLY with valid, raw JSON matching this schema:
{
  "score": number (0-100),
  "statusText": "string in Thai (e.g. ✅ ถูกต้องสมบูรณ์! (100%) or ⚡ เกือบถูกต้องแล้ว! (90%))",
  "correctedSentence": "string (the natural, grammatically correct English sentence)",
  "feedbackPoints": ["string in Thai", "string in Thai"],
  "breakdown": optional object with key-value checks (e.g. { "core": true, "context": true, "connect": true })
}
Do not wrap in markdown code blocks. Return pure raw JSON string only.`;

  let prompt = '';
  if (req.exerciseType === 'translation') {
    prompt = `Exercise Type: Translation
Thai Original Prompt: "${req.item.thai}"
Target Keywords: ${JSON.stringify(req.item.keywords || [])}
Student Answer: "${req.studentAnswer}"

Evaluate if the student used Present Continuous (S + is/am/are + V.ing) correctly. Accept valid subject variations (I am, The man is, She is, He is). Allow synonyms. Provide helpful Thai feedback.`;
  } else if (req.exerciseType === 'guided_sentence') {
    prompt = `Exercise Type: Guided Sentence
Prompt: "${req.item.prompt}"
Word Bank: ${JSON.stringify(req.wordBank || {})}
Templates: ${JSON.stringify(req.templates || [])}
Student Answer: "${req.studentAnswer}"

Evaluate if the sentence correctly constructs Action + Time + Purpose + Reason using Present Continuous. Accept any valid subjects (I am, The man is, She is, etc.).
Provide breakdown object: { "actionValid": boolean, "timeValid": boolean, "purposeValid": boolean, "reasonValid": boolean }.`;
  } else {
    prompt = `Exercise Type: Picture Description
Picture Description: "${req.item.image_description}"
Required Structure:
1. Core: S + is/am/are + V.ing (e.g., "The man is drinking coffee", "He is drinking coffee", "I am drinking coffee")
2. Context: time or place (e.g., "at the cafe", "right now", "now", "in the park")
3. Connect: cause/reason/purpose (e.g. "because ...", "for refreshment", "to stay fresh")

Student Answer: "${req.studentAnswer}"

CRITICAL RULE FOR CORE: Any subject + is/am/are + V.ing (such as "The man is drinking", "He is drinking", "I am drinking") MUST BE ACCEPTED AS A VALID CORE. Do NOT mark "The man is drinking" as incorrect for Core.

Return breakdown object: { "core": boolean, "context": boolean, "connect": boolean }.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}` }] }
    ],
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    }
  });

  const text = response.text || '';
  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

  // Clean breakdown if comments were returned inside object
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
    breakdown: cleanBreakdown
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

  const hasPresentContinuous = /\b(am|is|are)\s+\w+ing\b/.test(lower);
  if (!hasPresentContinuous) {
    score -= 30;
    points.push('💡 อย่าลืมใช้โครงสร้าง Present Continuous: S + is/am/are + V.ing (เช่น I am traveling / The man is styling)');
  } else {
    points.push('✅ การใช้โครงสร้าง Present Continuous ถูกต้องตามหลักภาษาแล้ว!');
  }

  if (item.id === 1) {
    const corrected = "I am traveling to go home.";
    if (lower.includes("traveling") || lower.includes("travelling") || lower.includes("heading")) {
      points.push('✅ คำกริยาการเดินทาง (traveling/heading) ถูกต้องและเหมาะสมกับบริบท');
    } else {
      score -= 15;
      points.push('💡 สามารถใช้คำว่า "traveling" หรือ "heading home" เพื่อสื่อความหมายถึงการเดินทางกลับบ้านได้ครับ');
    }

    if (score >= 90) {
      return {
        score,
        statusText: '🎉 ถูกต้องสมบูรณ์! (100%)',
        correctedSentence: original.endsWith('.') ? original : `${original}.`,
        feedbackPoints: ['ยอดเยี่ยมมาก! แปลได้ถูกต้องตามหลักไวยากรณ์และความหมายครบถ้วน', ...points]
      };
    }

    return {
      score: Math.max(score, 60),
      statusText: `⚡ เกือบถูกต้องแล้ว! (${score}%)`,
      correctedSentence: corrected,
      feedbackPoints: points
    };
  }

  if (item.id === 2) {
    const hasMyConfidence = lower.includes("confidence");
    let corrected = "I am styling my hair to boost my confidence now.";
    
    if (lower.includes("styling") || lower.includes("doing") || lower.includes("adjusting")) {
      points.push('✅ การใช้กริยาจัดผมถูกต้องตามโครงสร้าง Present Continuous แล้วครับ!');
    } else {
      score -= 15;
      points.push('💡 สำหรับการจัดผม แนะนำให้ใช้ "styling my hair" หรือ "doing my hair"');
    }

    if (hasMyConfidence) {
      points.push('✅ มีการใช้คำว่า "confidence" (ความมั่นใจ) ถูกต้องตามบริบท');
    }

    if (score >= 90) {
      return {
        score: 100,
        statusText: '🎉 ถูกต้องสมบูรณ์! (100%)',
        correctedSentence: original.endsWith('.') ? original : `${original}.`,
        feedbackPoints: ['ประโยคของคุณถูกต้องตามโครงสร้างภาษาอังกฤษและสละสลวยมาก!', ...points]
      };
    }

    return {
      score,
      statusText: `⚡ เกือบถูกต้องแล้ว! (${score}%)`,
      correctedSentence: corrected,
      feedbackPoints: points
    };
  }

  return {
    score: hasPresentContinuous ? 90 : 70,
    statusText: hasPresentContinuous ? '🎉 ประโยคถูกต้องตามหลักการ! (90%)' : '⚡ ลองปรับโครงสร้างประโยคอีกนิด! (70%)',
    correctedSentence: original.charAt(0).toUpperCase() + original.slice(1) + (original.endsWith('.') ? '' : '.'),
    feedbackPoints: points.length > 0 ? points : ['โครงสร้างประโยคโดยรวมใช้งานได้ดี']
  };
}

function evaluateGuidedSentenceLocally(lower: string, original: string): EvaluationResult {
  const points: string[] = [];
  let score = 100;

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
  } else {
    score -= 15;
    points.push('💡 สามารถเติมคำระบุเวลา เช่น right now หรือ at the moment เพื่อให้ประโยคสมบูรณ์ยิ่งขึ้น');
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
    correctedSentence: original.charAt(0).toUpperCase() + original.slice(1) + (original.endsWith('.') ? '' : '.'),
    feedbackPoints: points,
    breakdown
  };
}

function evaluatePictureDescriptionLocally(lower: string, original: string): EvaluationResult {
  const points: string[] = [];

  // Match any Subject (I, He, She, They, The man, A woman, etc.) + is/am/are + V.ing
  const hasCore = /\b(i\s+am|(he|she|it|they|we|you|the\s+\w+|\w+)\s+(is|am|are))\s+\w+ing\b/i.test(lower) || /\b(is|am|are)\s+\w+ing\b/i.test(lower);
  const hasContext = /\b(at|in|on|now|right now|at the moment|currently|today|cafe|park|supermarket)\b/i.test(lower);
  const hasConnect = /\b(because|for|to)\b/i.test(lower) || lower.includes("so that");

  let coreScore = hasCore ? 35 : 10;
  let contextScore = hasContext ? 35 : 15;
  let connectScore = hasConnect ? 30 : 10;

  const totalScore = coreScore + contextScore + connectScore;

  if (hasCore) {
    points.push('✅ Core (S + is/am/are + V.ing): มีประธานและกริยา Present Continuous ถูกต้อง (เช่น The man is drinking / I am drinking)');
  } else {
    points.push('❌ Core: ขาดโครงสร้าง S + is/am/are + V.ing (เช่น The man is drinking / I am drinking)');
  }

  if (hasContext) {
    points.push('✅ Context: มีการระบุสถานที่หรือเวลา (เช่น at the cafe, right now)');
  } else {
    points.push('⚠️ Context: ควรเพิ่มคำระบุสถานที่หรือช่วงเวลาเพื่อให้เห็นภาพชัดเจน');
  }

  if (hasConnect) {
    points.push('✅ Connect: มีการใช้คำเชื่อมบอกเหตุผล/จุดประสงค์ (เช่น because ..., for refreshment, to stay healthy)');
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
    correctedSentence: original.charAt(0).toUpperCase() + original.slice(1) + (original.endsWith('.') ? '' : '.'),
    feedbackPoints: points,
    breakdown
  };
}
