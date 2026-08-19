/**
 * Offline Grammar & Spell Checker Engine
 * Pure clientside TypeScript engine providing 0ms deterministic spell checking,
 * grammar analysis, morphological rules, and typo detection without external API calls.
 */

// 1. Levenshtein Distance Algorithm
export function getLevenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + 1  // substitution
        );
      }
    }
  }

  return matrix[bn][an];
}

// Similarity Ratio (0.0 to 1.0)
export function getWordSimilarity(a: string, b: string): number {
  const distance = getLevenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return (maxLen - distance) / maxLen;
}

// 2. Common English Typo & Spelling Rule Dictionary
const COMMON_SPELLING_DICTIONARY: Record<string, string> = {
  // -ing rule exceptions (dropping 'e')
  'makeing': 'making',
  'takeing': 'taking',
  'comeing': 'coming',
  'giveing': 'giving',
  'writeing': 'writing',
  'haveing': 'having',
  'driveing': 'driving',
  'leaveing': 'leaving',
  'hesitateing': 'hesitating',
  'adjustting': 'adjusting',
  'cleanning': 'cleaning',
  'prepareing': 'preparing',
  'useing': 'using',
  
  // -ing doubling consonant
  'runing': 'running',
  'swiming': 'swimming',
  'swimimg': 'swimming',
  'shoping': 'shopping',
  'geting': 'getting',
  'stoping': 'stopping',
  'siting': 'sitting',
  'cuting': 'cutting',
  'planing': 'planning',
  'traking': 'tracking',
  'trackking': 'tracking',
  
  // Common sentence builder typos
  'communting': 'commuting',
  'comuting': 'commuting',
  'commting': 'commuting',
  'comutingg': 'commuting',
  'hom': 'home',
  'walikng': 'walking',
  'walkin': 'walking',
  'breackfast': 'breakfast',
  'brakfast': 'breakfast',
  'brekfast': 'breakfast',
  'schedual': 'schedule',
  'schedul': 'schedule',
  'scheduel': 'schedule',
  'becuase': 'because',
  'becuse': 'because',
  'becouse': 'because',
  'becasue': 'because',
  'mesy': 'messy',
  'necesary': 'necessary',
  'necessery': 'necessary',
  'neccesary': 'necessary',
  'neccessary': 'necessary',
  'confidance': 'confidence',
  'momet': 'moment',
  'momment': 'moment',
  'momnt': 'moment',
  'packge': 'package',
  'pakage': 'package',
  'pacage': 'package',
  'delivry': 'delivery',
  'urgentt': 'urgent',
  'urgant': 'urgent',
  'exercis': 'exercise',
  'excersise': 'exercise',
  'pratice': 'practice',
  'practise': 'practice',
  'restfull': 'restful',
  'healthy': 'healthy',
  'healthi': 'healthy',
  'cheep': 'cheap',
  'chaep': 'cheap'
};

export interface OfflineCheckResult {
  isCorrect: boolean;
  message: string;
  points: string[];
  spellingErrors?: Array<{ typed: string; correction: string }>;
  normalizedStudent?: string;
  normalizedModel?: string;
}

/**
 * Main offline grammar and spell check evaluator
 */
export function checkOfflineGrammarAndSpelling(
  item: any,
  studentAnswer: string,
  exerciseType: 'translation' | 'guided_sentence' | 'picture_description' = 'translation'
): OfflineCheckResult {
  const raw = (studentAnswer || '').trim();
  if (!raw) {
    return {
      isCorrect: false,
      message: '❌ กรุณาพิมพ์คำตอบภาษาอังกฤษก่อนกดตรวจค่ะ',
      points: ['ยังไม่ได้พิมพ์คำตอบในช่องข้อความ']
    };
  }

  const points: string[] = [];
  const spellingErrors: Array<{ typed: string; correction: string }> = [];
  let isValid = true;

  // -------------------------------------------------------------
  // 1. CAPITAL LETTER CHECK
  // -------------------------------------------------------------
  const firstChar = raw.charAt(0);
  const isCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
  if (!isCapital) {
    isValid = false;
    const targetUpper = item.model_answer ? item.model_answer.charAt(0) : 'I';
    points.push(`• ตัวแรกของประโยคต้องเป็นตัวพิมพ์ใหญ่ (Capital letter) เช่น "${targetUpper}..."`);
  }

  // -------------------------------------------------------------
  // 2. FULL STOP (.) CHECK AT THE END
  // -------------------------------------------------------------
  const hasFullStop = raw.endsWith('.');
  if (!hasFullStop) {
    isValid = false;
    points.push('• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ด้านหลังสุดของประโยคด้วยนะคะ');
  }

  // -------------------------------------------------------------
  // 3. TOKENIZE WORDS & PREPARE TARGET VOCABULARY
  // -------------------------------------------------------------
  const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const studentWords = raw.split(/\s+/).map(cleanWord).filter(Boolean);

  const modelAnswer = item.model_answer || '';
  const acceptableAnswers: string[] = item.acceptable_answers || [modelAnswer];
  const allTargetSentences = [modelAnswer, ...acceptableAnswers].filter(Boolean);

  // Collect all unique expected words across model and acceptable answers
  const targetWordsSet = new Set<string>();
  const modelWords = modelAnswer.split(/\s+/).map(cleanWord).filter(Boolean);
  allTargetSentences.forEach((s: string) => {
    s.split(/\s+/).map(cleanWord).filter(Boolean).forEach((w: string) => targetWordsSet.add(w));
  });

  // -------------------------------------------------------------
  // 4. SPELL CHECKING & FUZZY TYPO DETECTION
  // -------------------------------------------------------------
  studentWords.forEach((sWord: string) => {
    // Exact match in target vocabulary or common English word -> OK
    if (targetWordsSet.has(sWord)) {
      return;
    }

    // Check Rule 1: Dictionary of common typos
    if (COMMON_SPELLING_DICTIONARY[sWord]) {
      const correctWord = COMMON_SPELLING_DICTIONARY[sWord];
      spellingErrors.push({ typed: sWord, correction: correctWord });
      points.push(`• สะกดคำผิด: คุณพิมพ์ "${sWord}" คำที่ถูกต้องคือ "${correctWord}"`);
      isValid = false;
      return;
    }

    // Check Rule 2: -ing dropping 'e' rule
    if (sWord.endsWith('eing') && sWord.length > 5) {
      const suggested = sWord.slice(0, -4) + 'ing';
      spellingErrors.push({ typed: sWord, correction: suggested });
      points.push(`• สะกดคำผิด: "${sWord}" ควรตัด e ออกก่อนเติม -ing เป็น "${suggested}"`);
      isValid = false;
      return;
    }

    // Check Rule 3: Levenshtein distance against all expected target words
    let bestMatchWord = '';
    let bestDistance = Infinity;
    let highestSim = 0;

    targetWordsSet.forEach((tWord: string) => {
      const dist = getLevenshteinDistance(sWord, tWord);
      const sim = getWordSimilarity(sWord, tWord);
      if (dist < bestDistance || (dist === bestDistance && sim > highestSim)) {
        bestDistance = dist;
        highestSim = sim;
        bestMatchWord = tWord;
      }
    });

    // If word is very close to a target word (distance <= 2 and similarity >= 0.60)
    if (bestMatchWord && bestDistance <= 2 && highestSim >= 0.60 && sWord.length >= 3) {
      spellingErrors.push({ typed: sWord, correction: bestMatchWord });
      points.push(`• สะกดคำผิด: คุณพิมพ์ "${sWord}" คำที่ถูกต้องคือ "${bestMatchWord}"`);
      isValid = false;
    }
  });

  // -------------------------------------------------------------
  // 5. GRAMMATICAL STRUCTURE CHECKS (PRESENT CONTINUOUS)
  // -------------------------------------------------------------
  const lowerAnswer = raw.toLowerCase();
  
  // Check for missing 'am/is/are' before -ing verb
  if (/\bi\s+\w+ing\b/i.test(lowerAnswer) && !/\bi\s+am\s+\w+ing\b/i.test(lowerAnswer) && !/\bi'm\s+\w+ing\b/i.test(lowerAnswer)) {
    isValid = false;
    points.push('• ไวยากรณ์ไม่ครบ: ขาดคำว่า "am" (โครงสร้าง Present Continuous ต้องเป็น I am + กริยาเติม -ing)');
  }

  // Check for base verb without -ing after 'am' (e.g. 'I am make')
  if (/\bi\s+am\s+(make|commute|clean|adjust|cook|drink|run|study)\b/i.test(lowerAnswer)) {
    isValid = false;
    points.push('• ไวยากรณ์: กริยาหลัง "am" ต้องเติม -ing เช่น "making", "commuting"');
  }

  // -------------------------------------------------------------
  // 6. MISSING KEY WORDS DETECTION
  // -------------------------------------------------------------
  if (modelWords.length > 0) {
    const studentWordSet = new Set(studentWords);
    const missingWords: string[] = [];

    modelWords.forEach((mW: string) => {
      // Don't flag single letter words like 'i' or 'a' unless critical
      if (mW.length > 1 && !studentWordSet.has(mW)) {
        // Check if student typed a typo of this word
        const hasTypoMatch = spellingErrors.some(err => err.correction === mW);
        if (!hasTypoMatch) {
          missingWords.push(mW);
        }
      }
    });

    if (missingWords.length > 0 && missingWords.length <= 2 && spellingErrors.length === 0) {
      points.push(`• คำตกหล่น: ในประโยคยังขาดคำว่า "${missingWords.join('", "')}"`);
    }
  }

  // -------------------------------------------------------------
  // 7. FIXED ANSWER KEY NORMALIZATION & MATCHING
  // -------------------------------------------------------------
  const normalize = (str: string) => str.trim().toLowerCase().replace(/[.!?]/g, '').replace(/\s+/g, ' ');
  const normalizedStudent = normalize(raw);
  const normalizedModel = normalize(modelAnswer);

  const matchesFixedAnswer = allTargetSentences.some(target => normalize(target) === normalizedStudent);

  if (!matchesFixedAnswer && spellingErrors.length === 0 && points.length === 0) {
    isValid = false;
    points.push(`• คำตอบยังไม่ตรงตามเฉลยในหนังสือ (เฉลยเป้าหมายหลัก: "${modelAnswer}")`);
  }

  // -------------------------------------------------------------
  // 8. FINAL RESULT ASSEMBLY
  // -------------------------------------------------------------
  if (isValid && matchesFixedAnswer && hasFullStop && isCapital && spellingErrors.length === 0) {
    return {
      isCorrect: true,
      message: '🎉 ถูกต้องสมบูรณ์แบบค่ะ! ไวยากรณ์ ตัวสะกด ตัวพิมพ์ใหญ่ และจุด Full Stop ถูกต้องเป๊ะมาก 👏',
      points: ['คำตอบตรงตามเฉลยในหนังสือ Sentence Builder 2'],
      spellingErrors: [],
      normalizedStudent,
      normalizedModel
    };
  }

  return {
    isCorrect: false,
    message: '❌ ยังไม่ถูกต้องตามโครงสร้างหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
    points: points.length > 0 ? points : [`• คำตอบยังไม่ตรงตามเฉลย (เฉลยหลัก: "${modelAnswer}")`],
    spellingErrors,
    normalizedStudent,
    normalizedModel
  };
}
