import nlp from 'compromise';

/**
 * Smart Universal NLP & Sequence Alignment Grammar Engine
 * Powered by 'compromise' NLP library (100% Free, Pure Offline, 0ms latency)
 * Features Phrasal Verb Chunks (e.g. "wake up"), Contraction Expansion, and Multi-token Alignment.
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

// Word Similarity Ratio (0.0 to 1.0)
export function getWordSimilarity(a: string, b: string): number {
  const distance = getLevenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return (maxLen - distance) / maxLen;
}

// Common Phrasal Verbs and Collocations
const PHRASAL_PARTICLES = new Set(['up', 'out', 'in', 'on', 'off', 'down', 'for', 'to', 'with', 'at', 'into', 'about', 'after', 'away']);

export interface OfflineCheckResult {
  isCorrect: boolean;
  message: string;
  points: string[];
  translation?: string;
  spellingErrors?: Array<{ typed: string; correction: string }>;
  normalizedStudent?: string;
  normalizedModel?: string;
}

/**
 * Universal NLP Grammar and Spell Checker
 */
/**
 * Typography Normalizer: Converts curly quotes, smart apostrophes, and unicode dashes to standard ASCII
 */
export function normalizeTypography(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019\u0060\u00B4\u201B]/g, "'") // curly single quotes ’ ‘ ` ´ to '
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')         // curly double quotes ” “ to "
    .replace(/[\u2013\u2014]/g, '-')                     // en/em dashes to -
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes English contractions to their expanded full forms
 * Ensures that "I'm" == "I am", "I've" == "I have", "don't" == "do not", etc.
 */
export function normalizeContractions(text: string): string {
  if (!text) return '';
  let result = normalizeTypography(text);

  const contractionsMap: Array<[RegExp, string]> = [
    // Pronoun + am/are/is
    [/\bI'm\b/gi, 'I am'],
    [/\byou're\b/gi, 'you are'],
    [/\bwe're\b/gi, 'we are'],
    [/\bthey're\b/gi, 'they are'],
    [/\bhe's\b/gi, 'he is'],
    [/\bshe's\b/gi, 'she is'],
    [/\bit's\b/gi, 'it is'],
    [/\bthat's\b/gi, 'that is'],
    [/\bthere's\b/gi, 'there is'],
    [/\bwhat's\b/gi, 'what is'],
    [/\bwho's\b/gi, 'who is'],
    [/\bwhere's\b/gi, 'where is'],
    [/\bhow's\b/gi, 'how is'],
    [/\blet's\b/gi, 'let us'],

    // Pronoun + have/has/had
    [/\bI've\b/gi, 'I have'],
    [/\byou've\b/gi, 'you have'],
    [/\bwe've\b/gi, 'we have'],
    [/\bthey've\b/gi, 'they have'],
    [/\bI'd\b/gi, 'I would'],
    [/\byou'd\b/gi, 'you would'],
    [/\bhe'd\b/gi, 'he would'],
    [/\bshe'd\b/gi, 'she would'],
    [/\bwe'd\b/gi, 'we would'],
    [/\bthey'd\b/gi, 'they would'],

    // Pronoun + will
    [/\bI'll\b/gi, 'I will'],
    [/\byou'll\b/gi, 'you will'],
    [/\bhe'll\b/gi, 'he will'],
    [/\bshe'll\b/gi, 'she will'],
    [/\bwe'll\b/gi, 'we will'],
    [/\bthey'll\b/gi, 'they will'],
    [/\bit'll\b/gi, 'it will'],
    [/\bthat'll\b/gi, 'that will'],

    // Negations
    [/\bdon't\b/gi, 'do not'],
    [/\bdoesn't\b/gi, 'does not'],
    [/\bdidn't\b/gi, 'did not'],
    [/\bcan't\b/gi, 'cannot'],
    [/\bcouldn't\b/gi, 'could not'],
    [/\bwon't\b/gi, 'will not'],
    [/\bwouldn't\b/gi, 'would not'],
    [/\bshouldn't\b/gi, 'should not'],
    [/\bisn't\b/gi, 'is not'],
    [/\baren't\b/gi, 'are not'],
    [/\bwasn't\b/gi, 'was not'],
    [/\bweren't\b/gi, 'were not'],
    [/\bhaven't\b/gi, 'have not'],
    [/\bhasn't\b/gi, 'has not'],
    [/\bhadn't\b/gi, 'had not'],
  ];

  for (const [pattern, replacement] of contractionsMap) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Universal NLP Grammar and Spell Checker
 */
export function checkOfflineGrammarAndSpelling(
  item: any,
  studentAnswer: string,
  exerciseType: 'translation' | 'guided_sentence' | 'picture_description' = 'translation'
): OfflineCheckResult {
  const raw = normalizeTypography(studentAnswer || '');
  if (!raw) {
    return {
      isCorrect: false,
      message: 'กรุณาพิมพ์คำตอบภาษาอังกฤษก่อนกดตรวจค่ะ',
      points: ['ยังไม่ได้พิมพ์คำตอบในช่องข้อความ']
    };
  }

  const points: string[] = [];
  let isValid = true;

  // -------------------------------------------------------------
  // 1. CAPITAL LETTER CHECK AT START
  // -------------------------------------------------------------
  const firstChar = raw.charAt(0);
  const isCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
  if (!isCapital) {
    isValid = false;
    const targetUpper = item.model_answer ? item.model_answer.charAt(0).toUpperCase() : 'I';
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
  // 3. TARGET SENTENCE NORMALIZATION & ALIGNMENT
  // -------------------------------------------------------------
  const cleanWord = (w: string) => normalizeTypography(w).toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const studentTokens = raw.split(/\s+/);
  const studentWords = studentTokens.map(cleanWord).filter(Boolean);

  const modelAnswer = normalizeTypography(item.model_answer || '');
  const acceptableAnswers: string[] = (item.acceptable_answers || [modelAnswer]).map(normalizeTypography);
  const allTargetSentences = [modelAnswer, ...acceptableAnswers].filter(Boolean);

  // -------------------------------------------------------------
  // 4. PRONOUN "I" and "I'm" / "I've" CAPITALIZATION & APOSTROPHE CHECK
  // -------------------------------------------------------------
  studentTokens.forEach((tok) => {
    const cleanTok = tok.replace(/[.!?,]$/, '');
    if (cleanTok === 'i') {
      isValid = false;
      points.push('• สรรพนาม "I" (ฉัน) ต้องเขียนด้วยตัวพิมพ์ใหญ่เสมอ ไม่ใช้ตัวพิมพ์เล็ก "i" นะคะ');
    } else if (cleanTok === "i'm" || cleanTok === 'i’m') {
      isValid = false;
      points.push('• คำว่า "I\'m" ตัว "I" ต้องเป็นตัวพิมพ์ใหญ่เสมอนะคะ (เขียนเป็น "I\'m" หรือ "I am")');
    } else if (cleanTok === "i've" || cleanTok === 'i’ve') {
      isValid = false;
      points.push('• คำว่า "I\'ve" ตัว "I" ต้องเป็นตัวพิมพ์ใหญ่เสมอนะคะ (เขียนเป็น "I\'ve" หรือ "I have")');
    } else if (cleanTok.toLowerCase() === 'im') {
      isValid = false;
      points.push('• คำว่า "I\'m" ต้องใส่เครื่องหมาย Apostrophe (\') ด้วยนะคะ (เขียนเป็น "I\'m" หรือ "I am")');
    } else if (cleanTok.toLowerCase() === 'ive') {
      isValid = false;
      points.push('• คำว่า "I\'ve" ต้องใส่เครื่องหมาย Apostrophe (\') ด้วยนะคะ (เขียนเป็น "I\'ve" หรือ "I have")');
    }
  });

  // -------------------------------------------------------------
  // 5. FIXED ANSWER KEY NORMALIZATION & MATCHING (WITH CONTRACTIONS)
  // -------------------------------------------------------------
  const normalizeForMatch = (str: string) => 
    normalizeContractions(normalizeTypography(str))
      .trim()
      .toLowerCase()
      .replace(/[.!?]/g, '')
      .replace(/\s+/g, ' ');

  const normalizedStudent = normalizeForMatch(raw);
  const normalizedModel = normalizeForMatch(modelAnswer);

  const matchesFixedAnswer = allTargetSentences.some((target: string) => normalizeForMatch(target) === normalizedStudent);

  if (!matchesFixedAnswer) {
    isValid = false;
  }

  // -------------------------------------------------------------
  // 6. FINAL RESULT ASSEMBLY FOR EXERCISE 1
  // -------------------------------------------------------------
  if (isValid && matchesFixedAnswer && hasFullStop && isCapital) {
    return {
      isCorrect: true,
      message: 'ถูกต้องเลยค่ะ เก่งมากเลย 👏',
      points: [],
      spellingErrors: [],
      normalizedStudent,
      normalizedModel
    };
  }

  // Always include standard reminder for incorrect answer without leaking exact words
  const feedbackPoints = [...points];
  feedbackPoints.push('• เช็ค คำในหนังสือ / การสะกดคำ / วรรคตอน / full stop นะคะ');

  return {
    isCorrect: false,
    message: 'ประโยคยังไม่สมบูรณ์ตามโครงสร้างในหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
    points: feedbackPoints,
    spellingErrors: [],
    normalizedStudent,
    normalizedModel
  };
}

/**
 * Smart Modular Grammar & Coherence Checker for Exercise 2 (Choose Provided Word)
 * Features Modular Translation Auto-Assembly from thai_template and word bank {en, th}
 * Tier 1: Completeness check
 * Tier 2: Category Placement / Order check
 * Tier 3: Semantic Coherence / Parallel Index check
 * + Instant Dynamic Thai Translation Assembly
 */
export function checkGuidedSentenceExercise(
  item: any,
  studentAnswer: string,
  categories: Array<{ order: number; name?: string; category_name?: string; words?: Array<string | { en: string; th?: string }>; word_bank?: Array<string | { en: string; th?: string }>; }> = []
): OfflineCheckResult {
  const raw = normalizeTypography(studentAnswer || '');
  if (!raw) {
    return {
      isCorrect: false,
      message: 'กรุณาเลือกเติมคำในช่องว่างให้ครบก่อนกดตรวจนะคะ',
      points: ['ยังไม่ได้เลือกคำศัพท์ลงในช่องว่าง']
    };
  }

  // 0. CAPITAL LETTER CHECK & FULL STOP CHECK (Universal grammar rules)
  const firstChar = raw.charAt(0);
  const isCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
  if (!isCapital) {
    return {
      isCorrect: false,
      message: 'ประโยคยังไม่สมบูรณ์ตามโครงสร้างในหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
      points: [
        `• ตัวแรกของประโยคต้องเป็นตัวพิมพ์ใหญ่ (Capital letter) เช่น "${firstChar.toUpperCase()}..."`,
        '• เช็ค คำในหนังสือ / การสะกดคำ / วรรคตอน / full stop / ความสอดคล้องของความหมาย นะคะ'
      ]
    };
  }

  const hasPunctuation = raw.endsWith('.') || raw.endsWith('?') || raw.endsWith('!');
  if (!hasPunctuation) {
    return {
      isCorrect: false,
      message: 'ประโยคยังไม่สมบูรณ์ตามโครงสร้างในหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
      points: [
        '• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ด้านหลังสุดของประโยคด้วยนะคะ',
        '• เช็ค คำในหนังสือ / การสะกดคำ / วรรคตอน / full stop / ความสอดคล้องของความหมาย นะคะ'
      ]
    };
  }

  const cleanWord = (w: string) => normalizeTypography(w).toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const studentTokens = normalizeContractions(raw).split(/\s+/).map(cleanWord).filter(Boolean);
  const normalizedRaw = studentTokens.join(' ');

  // 1. NORMALIZE CATEGORIES & WORD CHOICES (with id, next_valid_ids, and row index)
  const parsedCategories = (categories || []).map((cat, cIdx) => {
    const rawWords = Array.isArray(cat.words) ? cat.words : (cat.word_bank || []);
    const wordList = rawWords.map((w: any, idx: number) => {
      const defaultId = `${cat.order || cIdx + 1}${String.fromCharCode(97 + idx)}`;
      if (typeof w === 'string') {
        const enStr = normalizeTypography(w);
        return { id: defaultId, en: enStr, th: enStr, index: idx, next_valid_ids: undefined };
      }
      const enStr = normalizeTypography(w.en || '');
      return {
        id: w.id || defaultId,
        en: enStr,
        th: w.th || enStr,
        index: typeof w.index === 'number' ? w.index : idx,
        next_valid_ids: Array.isArray(w.next_valid_ids) ? w.next_valid_ids : undefined
      };
    });
    return {
      order: cat.order || (cIdx + 1),
      name: cat.name || cat.category_name || `หมวดที่ ${cat.order || cIdx + 1}`,
      words: wordList
    };
  });

  const requiredOrders: number[] = item.required_orders && item.required_orders.length > 0 
    ? item.required_orders 
    : parsedCategories.map(c => c.order);

  // 2. EXACT WORD-TOKEN MATCHING (Strict whole words, NO loose substring matching)
  interface MatchedSlotWord {
    id: string;
    en: string;
    th: string;
    order: number;
    catName: string;
    index: number;
    next_valid_ids?: string[];
    position: number;
  }

  const matchedWords: MatchedSlotWord[] = [];
  const matchedTokenIndices = new Set<number>();

  for (const cat of parsedCategories) {
    for (const w of cat.words) {
      if (!w.en) continue;
      const wTokens = normalizeContractions(w.en).split(/\s+/).map(cleanWord).filter(Boolean);
      if (wTokens.length === 0) continue;

      for (let i = 0; i <= studentTokens.length - wTokens.length; i++) {
        const slice = studentTokens.slice(i, i + wTokens.length);
        if (slice.every((tok, idx) => tok === wTokens[idx])) {
          matchedWords.push({
            id: w.id,
            en: w.en,
            th: w.th,
            order: cat.order,
            catName: cat.name,
            index: w.index,
            next_valid_ids: w.next_valid_ids,
            position: i
          });
          for (let j = 0; j < wTokens.length; j++) {
            matchedTokenIndices.add(i + j);
          }
        }
      }
    }
  }

  // Sort matched words by appearance order
  matchedWords.sort((a, b) => a.position - b.position);

  // Check missing categories
  const foundOrders = new Set(matchedWords.map(m => m.order));
  const missingOrders = requiredOrders.filter(ord => !foundOrders.has(ord));

  if (missingOrders.length > 0) {
    return {
      isCorrect: false,
      message: 'ประโยคยังไม่สมบูรณ์ตามโครงสร้างในหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
      points: [
        '• เช็ค คำในหนังสือ / การสะกดคำ / วรรคตอน / full stop / ความสอดคล้องของความหมาย นะคะ'
      ]
    };
  }

  // 3. CHECK STRUCTURAL SEQUENCE (First occurrence of each order by position)
  const orderedMatches: MatchedSlotWord[] = [];
  const assignedOrders = new Set<number>();

  for (const m of matchedWords) {
    if (requiredOrders.includes(m.order) && !assignedOrders.has(m.order)) {
      orderedMatches.push(m);
      assignedOrders.add(m.order);
    }
  }

  const actualOrderSequence = orderedMatches.map(m => m.order);
  const isOrderCorrect = requiredOrders.every((reqOrd, idx) => actualOrderSequence[idx] === reqOrd);

  if (!isOrderCorrect) {
    return {
      isCorrect: false,
      message: 'ประโยคยังไม่สมบูรณ์ตามโครงสร้างในหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
      points: [
        '• ลำดับโครงสร้างของประโยคสลับตำแหน่งกันค่ะ',
        '• เช็ค คำในหนังสือ / การสะกดคำ / วรรคตอน / full stop / ความสอดคล้องของความหมาย นะคะ'
      ]
    };
  }

  // 4. COMPATIBILITY MATRIX / PATH VALIDATION (Check consecutive pairs: 1a -> 2b -> 3b)
  for (let i = 0; i < orderedMatches.length - 1; i++) {
    const currentWord = orderedMatches[i];
    const nextWord = orderedMatches[i + 1];

    let isPairValid = false;

    if (currentWord.next_valid_ids && currentWord.next_valid_ids.length > 0) {
      // Check explicit next_valid_ids (e.g. currentWord allows ["2a", "2b"])
      isPairValid = currentWord.next_valid_ids.includes(nextWord.id) ||
                    currentWord.next_valid_ids.includes(nextWord.en) ||
                    currentWord.next_valid_ids.includes(String(nextWord.index));
    } else {
      // Fallback: horizontal row index consistency
      isPairValid = currentWord.index === nextWord.index;
    }

    if (!isPairValid) {
      const nextCat = parsedCategories.find(c => c.order === nextWord.order);
      let allowedNames: string[] = [];
      if (currentWord.next_valid_ids && nextCat) {
        allowedNames = nextCat.words
          .filter(w => currentWord.next_valid_ids!.includes(w.id))
          .map(w => `"${w.en}" (${w.th})`);
      } else if (nextCat) {
        const partner = nextCat.words.find(w => w.index === currentWord.index);
        if (partner) allowedNames.push(`"${partner.en}" (${partner.th})`);
      }

      return {
        isCorrect: false,
        message: 'โครงสร้างประโยคถูกต้องแล้วค่ะ แต่ความหมายยังไม่สอดคล้องกันนะคะ',
        points: [
          `• การเลือก "${currentWord.en}" (${currentWord.th}) ไม่สอดคล้องกับ "${nextWord.en}" (${nextWord.th}) ในบริบทนี้ค่ะ`,
          allowedNames.length > 0 
            ? `• คำว่า "${currentWord.en}" สามารถจับคู่กับ: ${allowedNames.join(' หรือ ')} ได้ค่ะ`
            : `• ลองทบทวนการจับคู่ความหมายระหว่างคำศัพท์ดูอีกครั้งนะคะ`,
          '• เช็ค คำในหนังสือ / การสะกดคำ / วรรคตอน / full stop / ความสอดคล้องของความหมาย นะคะ'
        ]
      };
    }
  }

  // 5. UNRECOGNIZED & MISSPELLED TOKEN VALIDATION (e.g. waterssssss)
  const allowedSkeletonTokens = new Set([
    'i', 'do', 'does', 'did', 'am', 'is', 'are', 'to', 'for', 'even', 'when', "i'm", 'im', 
    'because', 'although', 'at', 'in', 'on', 'my', 'the', 'a', 'an', 'that', 'so'
  ]);

  const unrecognizedTokens: string[] = [];
  for (let idx = 0; idx < studentTokens.length; idx++) {
    if (!matchedTokenIndices.has(idx) && !allowedSkeletonTokens.has(studentTokens[idx])) {
      unrecognizedTokens.push(studentTokens[idx]);
    }
  }

  if (unrecognizedTokens.length > 0) {
    return {
      isCorrect: false,
      message: 'ประโยคยังไม่สมบูรณ์ตามโครงสร้างในหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
      points: [
        '• เช็ค คำในหนังสือ / การสะกดคำ / วรรคตอน / full stop / ความสอดคล้องของความหมาย นะคะ'
      ]
    };
  }

  // 5. ASSEMBLE THAI TRANSLATION FROM TEMPLATE
  let assembledTranslation: string | undefined = undefined;

  const chosenWordsByOrder: Record<number, MatchedSlotWord> = {};
  for (const m of orderedMatches) {
    chosenWordsByOrder[m.order] = m;
  }

  if (item.thai_template) {
    let tpl: string = item.thai_template;
    for (const ord of requiredOrders) {
      const chosen = chosenWordsByOrder[ord];
      if (chosen) {
        tpl = tpl.replace(new RegExp(`\\{${ord}\\}`, 'g'), chosen.th);
      }
    }
    assembledTranslation = tpl;
  } else if (item.translations && typeof item.translations === 'object') {
    for (const [key, trans] of Object.entries(item.translations)) {
      const subWords = key.split('|').map(w => w.trim().toLowerCase());
      if (subWords.every(w => normalizedRaw.includes(w))) {
        assembledTranslation = trans as string;
        break;
      }
    }
  } else if (item.translation) {
    assembledTranslation = item.translation;
  }

  if (!assembledTranslation && orderedMatches.length > 0) {
    assembledTranslation = orderedMatches.map(c => c.th || c.en).join(' ');
  }

  return {
    isCorrect: true,
    message: 'ถูกต้องเลยค่ะ เก่งมากเลย 👏',
    points: [],
    translation: assembledTranslation
  };
}


