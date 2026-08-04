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
}

export async function evaluateAnswer(req: EvaluationRequest): Promise<EvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
    try {
      return await evaluateWithGemini(apiKey, req);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local evaluator:', err);
      return evaluateLocally(req);
    }
  }

  return evaluateLocally(req);
}

async function evaluateWithGemini(apiKey: string, req: EvaluationRequest): Promise<EvaluationResult> {
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are QuillBot-style AI Exercise Advisor for English language learners in Thailand. 
You evaluate student answers for Sentence Builder Vol. 2 exercises and provide encouragement, score (0-100), corrected sentence, and detailed Thai bullet points.

CRITICAL REQUIREMENT: You MUST respond ONLY with valid, raw JSON matching this schema:
{
  "score": number (0-100),
  "statusText": "string in Thai (e.g. ✅ ถูกต้องสมบูรณ์! (100%) or ⚡ เกือบถูกต้องแล้ว! (90%))",
  "correctedSentence": "string (the natural, grammatically correct English sentence)",
  "feedbackPoints": ["string in Thai", "string in Thai"],
  "breakdown": optional object with specific checks
}
Do not wrap in markdown \`\`\`json block. Return pure raw JSON string only.`;

  let prompt = '';
  if (req.exerciseType === 'translation') {
    prompt = `Exercise Type: Translation
Thai Original Prompt: "${req.item.thai}"
Target Keywords: ${JSON.stringify(req.item.keywords || [])}
Student Answer: "${req.studentAnswer}"

Evaluate if the student used Present Continuous (S + is/am/are + V.ing) correctly. Allow synonyms. Give Thai feedback notes on grammar, article usage (a/an/the/my), and phrasing.`;
  } else if (req.exerciseType === 'guided_sentence') {
    prompt = `Exercise Type: Guided Sentence
Prompt: "${req.item.prompt}"
Word Bank: ${JSON.stringify(req.wordBank || {})}
Templates: ${JSON.stringify(req.templates || [])}
Student Answer: "${req.studentAnswer}"

Evaluate if the sentence correctly constructs Action + Time + Purpose + Reason using Present Continuous. Verify if Word Bank items or good custom alternatives were placed accurately. Provide breakdown object with { "actionValid": boolean, "timeValid": boolean, "purposeValid": boolean, "reasonValid": boolean }.`;
  } else {
    prompt = `Exercise Type: Picture Description
Picture Description: "${req.item.image_description}"
Required Structure:
1. Core: S + am + V.ing (e.g., I am drinking coffee)
2. Context: time/place (e.g., right now, at the cafe)
3. Connect: because + reason (e.g., because I feel tired)

Student Answer: "${req.studentAnswer}"

Evaluate presence of Core, Context, and Connect. Return breakdown: { "core": boolean, "coreComment": "Thai feedback", "context": boolean, "contextComment": "Thai feedback", "connect": boolean, "connectComment": "Thai feedback" }.`;
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

  return {
    score: typeof parsed.score === 'number' ? parsed.score : 80,
    statusText: parsed.statusText || 'ตรวจคำตอบเรียบร้อยแล้ว',
    correctedSentence: parsed.correctedSentence || req.studentAnswer,
    feedbackPoints: Array.isArray(parsed.feedbackPoints) ? parsed.feedbackPoints : ['ไวยากรณ์ส่วนใหญ่ถูกต้อง'],
    breakdown: parsed.breakdown || undefined
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

  // Check Present Continuous structure (am/is/are + ing)
  const hasPresentContinuous = /\b(am|is|are)\s+\w+ing\b/.test(lower);
  if (!hasPresentContinuous) {
    score -= 30;
    points.push('💡 อย่าลืมใช้โครงสร้าง Present Continuous: S + is/am/are + V.ing (เช่น I am traveling)');
  } else {
    points.push('✅ การใช้โครงสร้าง Present Continuous ถูกต้องตามหลักภาษาแล้ว!');
  }

  if (item.id === 1) { // ฉันกำลังเดินทางเพื่อกลับบ้าน
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

  if (item.id === 2) { // ฉันกำลังจัดผมเพื่อเสริมความมั่นใจตอนนี้
    const hasMyConfidence = lower.includes("my confidence");
    let corrected = "I am styling my hair to boost my confidence now.";
    
    if (lower.includes("styling my hair") || lower.includes("doing my hair")) {
      points.push('✅ การใช้ "styling my hair" ถูกต้องตามโครงสร้าง Present Continuous แล้วครับ!');
    } else {
      score -= 15;
      points.push('💡 สำหรับการจัดผม แนะนำให้ใช้ "styling my hair" หรือ "doing my hair"');
    }

    if (!hasMyConfidence && lower.includes("confidence")) {
      score -= 10;
      points.push('💡 เพิ่มคำแสดงความเป็นเจ้าของ "my" หน้า confidence เป็น "my confidence" เพื่อความสมบูรณ์และเป็นธรรมชาติ');
      corrected = "I am styling my hair to boost my confidence now.";
    }

    if (score >= 90) {
      return {
        score: 100,
        statusText: '🎉 ถูกต้องสมบูรณ์! (100%)',
        correctedSentence: "I am styling my hair to boost my confidence now.",
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

  if (item.id === 3) { // ฉันกำลังติดตามพัสดุเพราะมันเสี่ยง
    const hasTracking = lower.includes("tracking");
    const hasBecause = lower.includes("because");
    
    if (hasTracking) points.push('✅ การใช้คำว่า "tracking" สำหรับการติดตามพัสดุถูกต้องแล้ว');
    else points.push('💡 แนะนำให้ใช้ "tracking the parcel/package" สำหรับการติดตามพัสดุ');

    if (hasBecause) points.push('✅ การใช้คำเชื่อม "because" ถูกต้องตามหลักภาษา');
    else {
      score -= 20;
      points.push('💡 อย่าลืมใช้คำเชื่อม "because" เพื่อบอกเหตุผล');
    }

    return {
      score: hasTracking && hasBecause ? 95 : 75,
      statusText: hasTracking && hasBecause ? '🎉 ถูกต้องสมบูรณ์! (95%)' : '⚡ เกือบถูกต้องแล้ว! (75%)',
      correctedSentence: "I am tracking the parcel because it is risky.",
      feedbackPoints: points
    };
  }

  // Item 4 & generic translation
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

  const hasAction = /\b(making|cleaning|adjusting|cooking|studying|working)\b/.test(lower);
  const hasTime = /\b(now|right now|at the moment|currently|today)\b/.test(lower);
  const hasPurpose = /\bto\s+\w+/.test(lower);
  const hasReason = lower.includes("because");

  if (!hasAction) {
    score -= 25;
    points.push('💡 อย่าลืมใส่กริยาแสดง Action จาก Word Bank เช่น making breakfast หรือ cleaning my room');
  } else {
    points.push('✅ เลือกใช้ Action สอดคล้องกับ Word Bank และแต่งประโยคได้ถูกต้อง');
  }

  if (hasTime) {
    points.push('✅ มีการระบุช่วงเวลา (Time) อย่างชัดเจน');
  } else {
    score -= 15;
    points.push('💡 สามารถเติมคำระบุเวลา เช่น right now หรือ at the moment เพื่อให้ประโยคสมบูรณ์ยิ่งขึ้น');
  }

  if (hasPurpose) {
    points.push('✅ มีการใช้ to + V.inf แสดงจุดประสงค์ (Purpose)');
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

  const hasCore = /\b(i am|she is|he is|they are)\s+\w+ing\b/.test(lower);
  const hasContext = /\b(at|in|on|now|right now|at the moment|currently)\b/.test(lower);
  const hasConnect = lower.includes("because");

  let coreScore = hasCore ? 35 : 10;
  let contextScore = hasContext ? 35 : 15;
  let connectScore = hasConnect ? 30 : 10;

  const totalScore = coreScore + contextScore + connectScore;

  if (hasCore) {
    points.push('✅ Core (S + am/is/are + V.ing): มีประธานและกริยา Present Continuous ถูกต้อง');
  } else {
    points.push('❌ Core: ขาดโครงสร้าง S + am/is/are + V.ing (เช่น I am drinking...)');
  }

  if (hasContext) {
    points.push('✅ Context: มีการระบุสถานที่หรือเวลา (เช่น at the cafe, right now)');
  } else {
    points.push('⚠️ Context: ควรเพิ่มคำระบุสถานที่หรือช่วงเวลาเพื่อให้เห็นภาพชัดเจน');
  }

  if (hasConnect) {
    points.push('✅ Connect: มีการใช้ because เชื่อมประโยคและบอกเหตุผล');
  } else {
    points.push('⚠️ Connect: ยังไม่มีการใช้ because เชื่อมประโยคบอกเหตุผล');
  }

  const breakdown = {
    core: hasCore,
    coreComment: hasCore ? 'โครงสร้าง Core สมบูรณ์' : 'ระบุ I am + V.ing',
    context: hasContext,
    contextComment: hasContext ? 'มีระบุ Context ชัดเจน' : 'เติมคำบอกเวลา/สถานที่',
    connect: hasConnect,
    connectComment: hasConnect ? 'มีคำเชื่อม Connect ถูกต้อง' : 'เติม because + reason'
  };

  return {
    score: totalScore,
    statusText: totalScore >= 90 ? '🌟 ครบถ้วน 3 โครงสร้าง! (100%)' : `🧩 ได้ ${totalScore}% (ตรวจสอบ 3 โครงสร้างด้านล่าง)`,
    correctedSentence: original.charAt(0).toUpperCase() + original.slice(1) + (original.endsWith('.') ? '' : '.'),
    feedbackPoints: points,
    breakdown
  };
}
