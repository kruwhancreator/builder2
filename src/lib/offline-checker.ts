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
  const spellingErrors: Array<{ typed: string; correction: string }> = [];
  let isValid = true;

  // -------------------------------------------------------------
  // 1. CAPITAL LETTER CHECK AT START
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
  // 3. TARGET SENTENCE NORMALIZATION & ALIGNMENT
  // -------------------------------------------------------------
  const cleanWord = (w: string) => normalizeTypography(w).toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const studentTokens = raw.split(/\s+/);
  const studentWords = studentTokens.map(cleanWord).filter(Boolean);

  const modelAnswer = normalizeTypography(item.model_answer || '');
  const acceptableAnswers: string[] = (item.acceptable_answers || [modelAnswer]).map(normalizeTypography);
  const allTargetSentences = [modelAnswer, ...acceptableAnswers].filter(Boolean);

  // Find the closest target sentence to the student's input
  let bestTargetSentence = modelAnswer;
  let bestTargetScore = -1;

  allTargetSentences.forEach((targetStr: string) => {
    const tWords = targetStr.split(/\s+/).map(cleanWord).filter(Boolean);
    let matchCount = 0;
    studentWords.forEach((sW: string) => {
      if (tWords.some((tW: string) => tW === sW || getWordSimilarity(sW, tW) >= 0.6)) {
        matchCount++;
      }
    });
    if (matchCount > bestTargetScore) {
      bestTargetScore = matchCount;
      bestTargetSentence = targetStr;
    }
  });

  // Preserve raw target tokens with original casing and punctuation stripped
  const rawTargetTokens = bestTargetSentence.split(/\s+/).map(w => w.replace(/[.!?,]$/, ''));
  const targetWords = rawTargetTokens.map(cleanWord).filter(Boolean);

  // Collect all valid words from all acceptable answers to prevent false positives
  const allTargetWordsSet = new Set<string>();
  allTargetSentences.forEach((s: string) => {
    s.split(/\s+/).map(cleanWord).filter(Boolean).forEach((w: string) => allTargetWordsSet.add(w));
  });

  // -------------------------------------------------------------
  // 4. PRONOUN "I" and "I'm" CAPITALIZATION & APOSTROPHE CHECK
  // -------------------------------------------------------------
  studentTokens.forEach((tok) => {
    const cleanTok = tok.replace(/[.!?,]$/, '');
    if (cleanTok === 'i') {
      isValid = false;
      points.push('• สรรพนาม "I" (ฉัน) ต้องเขียนด้วยตัวพิมพ์ใหญ่เสมอ ไม่ใช้ตัวพิมพ์เล็ก "i" นะคะ');
    } else if (cleanTok === "i'm" || cleanTok === 'i’m') {
      isValid = false;
      points.push('• คำว่า "I\'m" ตัว "I" ต้องเป็นตัวพิมพ์ใหญ่เสมอนะคะ (เขียนเป็น "I\'m")');
    } else if (cleanTok.toLowerCase() === 'im' && targetWords.includes("i'm")) {
      isValid = false;
      points.push('• คำว่า "I\'m" ต้องใส่เครื่องหมาย Apostrophe (\') ด้วยนะคะ (เขียนเป็น "I\'m")');
    }
  });

  // -------------------------------------------------------------
  // 5. DYNAMIC WORD-BY-WORD DIFF & SPELLING DETECTION
  // -------------------------------------------------------------
  const usedTargetIndices = new Set<number>();
  const unmatchedStudentWords: Array<{ word: string; index: number; rawToken: string }> = [];

  studentWords.forEach((sWord: string, sIdx: number) => {
    // 1. Exact match against target sequence
    let matchedIdx = -1;
    for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
      if (!usedTargetIndices.has(tIdx) && targetWords[tIdx] === sWord) {
        matchedIdx = tIdx;
        break;
      }
    }

    if (matchedIdx !== -1) {
      usedTargetIndices.add(matchedIdx);
      return;
    }

    // 2. Exact match in any acceptable answers
    if (allTargetWordsSet.has(sWord)) {
      return;
    }

    unmatchedStudentWords.push({ word: sWord, index: sIdx, rawToken: studentTokens[sIdx] || sWord });
  });

  // Match unmatched student words against remaining target words for grammar substitutions or typos
  unmatchedStudentWords.forEach(({ word: sWord, rawToken }) => {
    // 1. Check for Contraction vs Base Pronoun/Auxiliary Grammar Substitutions (e.g. "I'm" vs "I", "don't" vs "do")
    for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
      if (usedTargetIndices.has(tIdx)) continue;
      const tWord = targetWords[tIdx];
      const tRaw = rawTargetTokens[tIdx] || tWord;

      // Case A: Student wrote "I'm" / "im" when target is "I"
      if ((sWord === "i'm" || sWord === "im") && tWord === "i") {
        usedTargetIndices.add(tIdx);
        isValid = false;
        points.push(`• ไวยากรณ์ไม่ถูกต้อง: โครงสร้างนี้ใช้ "${tRaw}" (เช่น "${tRaw} do...") ไม่ใช้ "${rawToken.replace(/[.!?,]$/, '')}" นะคะ`);
        return;
      }

      // Case B: Student wrote "I" when target is "I'm"
      if (sWord === "i" && (tWord === "i'm" || tWord === "im")) {
        usedTargetIndices.add(tIdx);
        isValid = false;
        points.push(`• ไวยากรณ์ไม่ถูกต้อง: โครงสร้างนี้ต้องใช้ "${tRaw}" (เช่น "even when ${tRaw}...") นะคะ`);
        return;
      }

      // Case C: Student wrote "don't" when target is "do"
      if ((sWord === "don't" || sWord === "dont") && tWord === "do") {
        usedTargetIndices.add(tIdx);
        isValid = false;
        points.push(`• ไวยากรณ์ไม่ถูกต้อง: โครงสร้างนี้ใช้รูปบอกเล่า "${tRaw}" ไม่ใช่รูปปฏิเสธ "${rawToken.replace(/[.!?,]$/, '')}" นะคะ`);
        return;
      }

      // Case D: Other pronoun contractions (you're vs you, we're vs we, etc.)
      const contractionsMap: Record<string, string> = {
        "you're": "you",
        "we're": "we",
        "they're": "they",
        "he's": "he",
        "she's": "she",
        "it's": "it"
      };

      if (contractionsMap[sWord] === tWord) {
        usedTargetIndices.add(tIdx);
        isValid = false;
        points.push(`• ไวยากรณ์ไม่ถูกต้อง: โครงสร้างนี้ใช้ "${tRaw}" ไม่ใช้ "${rawToken.replace(/[.!?,]$/, '')}" นะคะ`);
        return;
      }
      if (contractionsMap[tWord] === sWord) {
        usedTargetIndices.add(tIdx);
        isValid = false;
        points.push(`• ไวยากรณ์ไม่ถูกต้อง: โครงสร้างนี้ต้องใช้รูปย่อ "${tRaw}" นะคะ`);
        return;
      }
    }

    // 2. Morphological rule: -ing dropping e (e.g. makeing -> making, hesitateing -> hesitating)
    if (sWord.endsWith('eing') && sWord.length >= 5) {
      const correction = sWord.slice(0, -4) + 'ing';
      spellingErrors.push({ typed: sWord, correction });
      points.push(`• สะกดคำผิด: "${sWord}" ควรตัด e ออกก่อนเติม -ing เป็น "${correction}"`);
      isValid = false;
      return;
    }

    let bestMatchWord = '';
    let bestMatchRaw = '';
    let bestMatchIdx = -1;
    let bestDist = Infinity;
    let bestSim = 0;

    targetWords.forEach((tWord: string, tIdx: number) => {
      if (usedTargetIndices.has(tIdx)) return;

      const dist = getLevenshteinDistance(sWord, tWord);
      const sim = getWordSimilarity(sWord, tWord);

      // Handle character elongation (e.g. "waterssssss" -> "water", "cooooook" -> "cook")
      const sCompressed = sWord.replace(/(.)\1{2,}/g, '$1');
      const isElongatedTypo = sWord.length > tWord.length && (
        sWord.startsWith(tWord) || 
        sCompressed === tWord || 
        getLevenshteinDistance(sCompressed, tWord) <= 1
      );

      // Handle small words like 'd' -> 'do', 'to', 'up', 'am' (distance <= 1)
      const isShortWordFuzzy = (tWord.length <= 3 && dist <= 1);
      // Handle longer words (distance <= 2 or similarity >= 0.55)
      const isLongWordFuzzy = (dist <= 2 && sim >= 0.55);

      if (isShortWordFuzzy || isLongWordFuzzy || isElongatedTypo) {
        if (dist < bestDist || (dist === bestDist && sim > bestSim) || isElongatedTypo) {
          bestDist = dist;
          bestSim = sim;
          bestMatchWord = tWord;
          bestMatchRaw = rawTargetTokens[tIdx] || tWord;
          bestMatchIdx = tIdx;
        }
      }
    });

    // If a fuzzy match is found
    if (bestMatchWord && bestMatchIdx !== -1) {
      usedTargetIndices.add(bestMatchIdx);

      // Check if next target word is a phrasal verb particle (e.g. wake + up, clean + up, look + for)
      let finalCorrection = bestMatchRaw;
      const nextTargetWord = targetWords[bestMatchIdx + 1];
      if (
        nextTargetWord && 
        PHRASAL_PARTICLES.has(nextTargetWord) && 
        !usedTargetIndices.has(bestMatchIdx + 1) &&
        !studentWords.includes(nextTargetWord)
      ) {
        finalCorrection = `${bestMatchRaw} ${rawTargetTokens[bestMatchIdx + 1] || nextTargetWord}`;
        usedTargetIndices.add(bestMatchIdx + 1);
      }

      // Avoid false positive if only casing differed (handled by pronoun rule)
      if (sWord !== bestMatchWord) {
        spellingErrors.push({ typed: rawToken.replace(/[.!?,]$/, ''), correction: finalCorrection });
        points.push(`• สะกดคำผิด: คุณพิมพ์ "${rawToken.replace(/[.!?,]$/, '')}" คำที่ถูกต้องคือ "${finalCorrection}"`);
        isValid = false;
      }
    } else {
      // Global search across acceptable answers
      let globalBestWord = '';
      let globalBestDist = Infinity;
      allTargetWordsSet.forEach((tW: string) => {
        const dist = getLevenshteinDistance(sWord, tW);
        const sim = getWordSimilarity(sWord, tW);
        const sCompressed = sWord.replace(/(.)\1{2,}/g, '$1');
        const isElongated = sWord.startsWith(tW) || sCompressed === tW;
        if ((dist <= 2 && sim >= 0.55) || (tW.length <= 3 && dist <= 1) || isElongated) {
          if (dist < globalBestDist || isElongated) {
            globalBestDist = dist;
            globalBestWord = tW;
          }
        }
      });

      if (globalBestWord && sWord !== globalBestWord) {
        spellingErrors.push({ typed: rawToken.replace(/[.!?,]$/, ''), correction: globalBestWord });
        points.push(`• สะกดคำผิด: คุณพิมพ์ "${rawToken.replace(/[.!?,]$/, '')}" คำที่ถูกต้องคือ "${globalBestWord}"`);
        isValid = false;
      }
    }
  });

  // -------------------------------------------------------------
  // 6. MISSING WORDS DETECTION
  // -------------------------------------------------------------
  const missingWords: string[] = [];
  for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
    if (!usedTargetIndices.has(tIdx)) {
      const current = rawTargetTokens[tIdx] || targetWords[tIdx];
      const next = targetWords[tIdx + 1];
      if (next && PHRASAL_PARTICLES.has(next) && !usedTargetIndices.has(tIdx + 1)) {
        missingWords.push(`${current} ${rawTargetTokens[tIdx + 1] || next}`);
        tIdx++;
      } else {
        missingWords.push(current);
      }
    }
  }

  if (missingWords.length > 0) {
    isValid = false;
    if (missingWords.length === 1) {
      points.push(`• คำตกหล่น: ในประโยคยังขาดคำว่า "${missingWords[0]}"`);
    } else if (missingWords.length <= 3) {
      points.push(`• คำตกหล่น: ในประโยคยังขาดคำว่า "${missingWords.join('", "')}"`);
    }
  }

  // -------------------------------------------------------------
  // 7. FIXED ANSWER KEY NORMALIZATION & MATCHING
  // -------------------------------------------------------------
  const normalizeForMatch = (str: string) => 
    normalizeTypography(str)
      .trim()
      .toLowerCase()
      .replace(/[.!?]/g, '')
      .replace(/\s+/g, ' ');

  const normalizedStudent = normalizeForMatch(raw);
  const normalizedModel = normalizeForMatch(modelAnswer);

  const matchesFixedAnswer = allTargetSentences.some((target: string) => normalizeForMatch(target) === normalizedStudent);

  if (!matchesFixedAnswer && points.length === 0) {
    isValid = false;
    points.push(`• คำตอบยังไม่ตรงตามโครงสร้างเฉลย (เฉลยหลัก: "${modelAnswer}")`);
  }

  // -------------------------------------------------------------
  // 8. FINAL RESULT ASSEMBLY
  // -------------------------------------------------------------
  if (isValid && matchesFixedAnswer && hasFullStop && isCapital && spellingErrors.length === 0) {
    return {
      isCorrect: true,
      message: 'ถูกต้องเลยค่ะ เก่งมากเลย 👏',
      points: [],
      spellingErrors: [],
      normalizedStudent,
      normalizedModel
    };
  }

  return {
    isCorrect: false,
    message: 'ยังไม่ถูกต้องตามโครงสร้างหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
    points: points.length > 0 ? points : [`• คำตอบยังไม่ตรงตามเฉลย (เฉลยหลัก: "${modelAnswer}")`],
    spellingErrors,
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
      message: '⚡ คำแนะนำเบื้องต้น:',
      points: [`• ตัวแรกของประโยคต้องเป็นตัวพิมพ์ใหญ่ (Capital letter) เช่น "${firstChar.toUpperCase()}..."`]
    };
  }

  const hasPunctuation = raw.endsWith('.') || raw.endsWith('?') || raw.endsWith('!');
  if (!hasPunctuation) {
    return {
      isCorrect: false,
      message: '⚡ คำแนะนำเบื้องต้น:',
      points: ['• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ด้านหลังสุดของประโยคด้วยนะคะ']
    };
  }

  const cleanWord = (w: string) => normalizeTypography(w).toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const studentTokens = raw.split(/\s+/).map(cleanWord).filter(Boolean);
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
      const wTokens = w.en.split(/\s+/).map(cleanWord).filter(Boolean);
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

  // Check missing categories & detect fuzzy spelling typos
  const foundOrders = new Set(matchedWords.map(m => m.order));
  const missingOrders = requiredOrders.filter(ord => !foundOrders.has(ord));

  if (missingOrders.length > 0) {
    let hasGrammarMismatch = false;
    const spellingPoints: string[] = [];

    for (const ord of missingOrders) {
      const cat = parsedCategories.find(c => c.order === ord);
      if (!cat) continue;

      for (const targetWord of cat.words) {
        if (!targetWord.en) continue;
        const targetEn = targetWord.en.toLowerCase();
        const targetWordsList = targetEn.split(/\s+/).map(cleanWord).filter(Boolean);
        const tFirst = targetWordsList[0];

        // Check single-word or multi-word phrase against student tokens
        for (let i = 0; i <= studentTokens.length - targetWordsList.length; i++) {
          const studentChunk = studentTokens.slice(i, i + targetWordsList.length).join(' ');
          const sWords = studentChunk.split(/\s+/);
          const sFirst = sWords[0];
          const sRest = sWords.slice(1).join(' ');
          const tRest = targetWordsList.slice(1).join(' ');

          const isRestMatching = sRest === tRest || getLevenshteinDistance(sRest, tRest) <= 1;

          // 1. GRAMMATICAL INFLECTION (Real word variants like drinking, drinks, drank, drinked vs drink)
          if (isRestMatching) {
            const sLemma = nlp(sFirst).verbs().toInfinitive().text() || '';
            const isRelatedVerb = sLemma === tFirst ||
                                  sFirst.replace(/(ing|ed|es|s)$/, '') === tFirst.replace(/(ing|ed|es|s)$/, '');

            if (isRelatedVerb && sFirst !== tFirst) {
              hasGrammarMismatch = true;
              break;
            }
          }

          // 2. MORPHOLOGICAL SPELLING: E-dropping rule (e.g. makeing -> making, hesitateing -> hesitating)
          if (studentChunk.endsWith('eing') && targetEn.endsWith('ing')) {
            spellingPoints.push(`• สะกดคำผิด: "${studentChunk}" ควรตัด e ออกก่อนเติม -ing เป็น "${targetEn}" (${targetWord.th})`);
            break;
          }

          // 3. TYPO / ELONGATION / LEVENSHTEIN (e.g. waterssssss -> water, drnk -> drink)
          const dist = getLevenshteinDistance(studentChunk, targetEn);
          const sim = getWordSimilarity(studentChunk, targetEn);
          const sCompressed = studentChunk.replace(/(.)\1{2,}/g, '$1');
          const isElongated = studentChunk.length > targetEn.length && (
            studentChunk.startsWith(targetEn) ||
            sCompressed === targetEn ||
            getLevenshteinDistance(sCompressed, targetEn) <= 1
          );

          if ((dist <= 2 && sim >= 0.55) || (targetEn.length <= 4 && dist <= 1) || isElongated) {
            if (studentChunk !== targetEn) {
              spellingPoints.push(`• สะกดคำผิด: คุณพิมพ์ "${studentChunk}" คำที่ถูกต้องคือ "${targetWord.en}" (${targetWord.th})`);
              break;
            }
          }
        }
        if (hasGrammarMismatch) break;
      }
      if (hasGrammarMismatch) break;
    }

    if (hasGrammarMismatch) {
      return {
        isCorrect: false,
        message: 'ยังไม่ถูกต้องตามโครงสร้างหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
        points: ['• โครงสร้างประโยคยังไม่ถูกต้องตามหนังสือนะคะ ให้นักเรียนใช้โครงสร้างคำศัพท์ตามหนังสือแล้วลองใหม่อีกครั้งค่ะ']
      };
    }

    if (spellingPoints.length > 0) {
      return {
        isCorrect: false,
        message: '⚡ ตรวจพบการสะกดคำผิด:',
        points: spellingPoints
      };
    }

    const missingNames = missingOrders.map(ord => {
      const cat = parsedCategories.find(c => c.order === ord);
      return cat ? `"${cat.name}"` : `"หมวดที่ ${ord}"`;
    });

    return {
      isCorrect: false,
      message: 'ยังเติมคำในช่องว่างไม่ครบถ้วน หรือสะกดคำศัพท์ไม่ถูกต้องนะคะ',
      points: [
        `• ยังขาดคำศัพท์ใน ${missingNames.join(', ')} ค่ะ`,
        `• กรุณาพิมพ์เติมคำในช่องว่างให้ครบทุกช่องนะคะ`
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
    const expectedCat1 = parsedCategories.find(c => c.order === requiredOrders[0])?.name || `ช่องที่ 1`;
    const expectedCat2 = parsedCategories.find(c => c.order === requiredOrders[1])?.name || `ช่องที่ 2`;
    return {
      isCorrect: false,
      message: 'โครงสร้างประโยคไม่ถูกต้องค่ะ ลำดับคำศัพท์สลับตำแหน่งกันนะคะ',
      points: [
        `• ลำดับคำศัพท์ในแต่ละช่องสลับตำแหน่งกันค่ะ`,
        `• กรุณาเติมคำจาก "${expectedCat1}" ในช่องแรก และตามด้วยคำจาก "${expectedCat2}" ตามลำดับนะคะ`
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
            : `• ลองทบทวนการจับคู่ความหมายระหว่างคำศัพท์ดูอีกครั้งนะคะ`
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
    const typoErrors: string[] = [];
    for (const unrec of unrecognizedTokens) {
      let bestCorrection = '';
      for (const cat of parsedCategories) {
        for (const w of cat.words) {
          if (!w.en) continue;
          const targetEn = w.en.toLowerCase();
          const sCompressed = unrec.replace(/(.)\1{2,}/g, '$1');
          const dist = getLevenshteinDistance(unrec, targetEn);
          const sim = getWordSimilarity(unrec, targetEn);
          const isElongated = unrec.length > targetEn.length && (
            unrec.startsWith(targetEn) || 
            sCompressed === targetEn || 
            getLevenshteinDistance(sCompressed, targetEn) <= 1
          );

          if (isElongated || dist <= 2 || sim >= 0.55) {
            bestCorrection = w.en;
            break;
          }
        }
        if (bestCorrection) break;
      }

      if (bestCorrection) {
        typoErrors.push(`• สะกดคำผิด: คุณพิมพ์ "${unrec}" คำที่ถูกต้องคือ "${bestCorrection}"`);
      } else {
        typoErrors.push(`• มีคำศัพท์ที่ไม่ตรงตามหนังสือ: "${unrec}"`);
      }
    }

    return {
      isCorrect: false,
      message: 'ยังไม่ถูกต้องตามโครงสร้างหนังสือนะคะ ลองใหม่อีกครั้งค่ะ',
      points: typoErrors
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


