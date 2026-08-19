/**
 * Smart Universal Offline Grammar & Spell Checker Engine
 * Fully automatic dynamic sequence alignment (LCS + Token Diff + Fuzzy Distance).
 * Works for ANY sentence and ANY unit without needing manual wordbanks or hardcoded typo lists.
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

// Word Similarity (0.0 to 1.0)
export function getWordSimilarity(a: string, b: string): number {
  const distance = getLevenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return (maxLen - distance) / maxLen;
}

export interface OfflineCheckResult {
  isCorrect: boolean;
  message: string;
  points: string[];
  spellingErrors?: Array<{ typed: string; correction: string }>;
  normalizedStudent?: string;
  normalizedModel?: string;
}

/**
 * Universal Sequence Alignment & Morphological Rule Checker
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
      message: 'กรุณาพิมพ์คำตอบภาษาอังกฤษก่อนกดตรวจค่ะ',
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
  // 3. DYNAMIC TOKENIZATION & ALIGNMENT
  // -------------------------------------------------------------
  const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const studentWords = raw.split(/\s+/).map(cleanWord).filter(Boolean);

  const modelAnswer = item.model_answer || '';
  const acceptableAnswers: string[] = item.acceptable_answers || [modelAnswer];
  const allTargetSentences = [modelAnswer, ...acceptableAnswers].filter(Boolean);

  // Find the closest target sentence to the student's input
  let bestTargetSentence = modelAnswer;
  let bestTargetScore = -1;

  allTargetSentences.forEach((targetStr) => {
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

  const targetWords = bestTargetSentence.split(/\s+/).map(cleanWord).filter(Boolean);

  // Collect all valid words from all acceptable answers to avoid false positives
  const allTargetWordsSet = new Set<string>();
  allTargetSentences.forEach((s: string) => {
    s.split(/\s+/).map(cleanWord).filter(Boolean).forEach((w: string) => allTargetWordsSet.add(w));
  });

  // -------------------------------------------------------------
  // 4. DYNAMIC WORD-BY-WORD DIFF & SPELL CHECKING
  // -------------------------------------------------------------
  const usedTargetIndices = new Set<number>();
  const unmatchedStudentWords: Array<{ word: string; index: number }> = [];

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

    unmatchedStudentWords.push({ word: sWord, index: sIdx });
  });

  // Match unmatched student words against remaining target words for typos
  unmatchedStudentWords.forEach(({ word: sWord }) => {
    // Morphological check for -ing dropping e (e.g. makeing -> making, hesitateing -> hesitating)
    if (sWord.endsWith('eing') && sWord.length >= 5) {
      const correction = sWord.slice(0, -4) + 'ing';
      spellingErrors.push({ typed: sWord, correction });
      points.push(`• สะกดคำผิด: "${sWord}" ควรตัด e ออกก่อนเติม -ing เป็น "${correction}"`);
      isValid = false;
      return;
    }

    let bestMatchWord = '';
    let bestMatchIdx = -1;
    let bestDist = Infinity;
    let bestSim = 0;

    targetWords.forEach((tWord: string, tIdx: number) => {
      if (usedTargetIndices.has(tIdx)) return;

      const dist = getLevenshteinDistance(sWord, tWord);
      const sim = getWordSimilarity(sWord, tWord);

      // Handle small words like 'd' -> 'do', 'i' -> 'is', 'to', 'up' (distance = 1)
      const isShortWordFuzzy = (tWord.length <= 3 && dist <= 1);
      // Handle longer words (distance <= 2 or similarity >= 0.55)
      const isLongWordFuzzy = (dist <= 2 && sim >= 0.55);

      if (isShortWordFuzzy || isLongWordFuzzy) {
        if (dist < bestDist || (dist === bestDist && sim > bestSim)) {
          bestDist = dist;
          bestSim = sim;
          bestMatchWord = tWord;
          bestMatchIdx = tIdx;
        }
      }
    });

    // If a fuzzy match is found
    if (bestMatchWord && bestMatchIdx !== -1) {
      usedTargetIndices.add(bestMatchIdx);
      spellingErrors.push({ typed: sWord, correction: bestMatchWord });
      points.push(`• สะกดคำผิด: คุณพิมพ์ "${sWord}" คำที่ถูกต้องคือ "${bestMatchWord}"`);
      isValid = false;
    } else {
      // General target search
      let globalBestWord = '';
      let globalBestDist = Infinity;
      allTargetWordsSet.forEach((tW: string) => {
        const dist = getLevenshteinDistance(sWord, tW);
        const sim = getWordSimilarity(sWord, tW);
        if ((dist <= 2 && sim >= 0.55) || (tW.length <= 3 && dist <= 1)) {
          if (dist < globalBestDist) {
            globalBestDist = dist;
            globalBestWord = tW;
          }
        }
      });

      if (globalBestWord) {
        spellingErrors.push({ typed: sWord, correction: globalBestWord });
        points.push(`• สะกดคำผิด: คุณพิมพ์ "${sWord}" คำที่ถูกต้องคือ "${globalBestWord}"`);
        isValid = false;
      }
    }
  });

  // -------------------------------------------------------------
  // 5. MISSING WORDS DETECTION (e.g. missing 'up' in 'wake up')
  // -------------------------------------------------------------
  const missingWords: string[] = [];
  targetWords.forEach((tWord: string, tIdx: number) => {
    if (!usedTargetIndices.has(tIdx)) {
      missingWords.push(tWord);
    }
  });

  if (missingWords.length > 0) {
    isValid = false;
    if (missingWords.length === 1) {
      points.push(`• คำตกหล่น: ในประโยคยังขาดคำว่า "${missingWords[0]}"`);
    } else if (missingWords.length <= 3) {
      points.push(`• คำตกหล่น: ในประโยคยังขาดคำว่า "${missingWords.join('", "')}"`);
    }
  }

  // -------------------------------------------------------------
  // 6. FIXED ANSWER KEY NORMALIZATION & MATCHING
  // -------------------------------------------------------------
  const normalize = (str: string) => str.trim().toLowerCase().replace(/[.!?]/g, '').replace(/\s+/g, ' ');
  const normalizedStudent = normalize(raw);
  const normalizedModel = normalize(modelAnswer);

  const matchesFixedAnswer = allTargetSentences.some((target) => normalize(target) === normalizedStudent);

  if (!matchesFixedAnswer && points.length === 0) {
    isValid = false;
    points.push(`• คำตอบยังไม่ตรงตามโครงสร้างเฉลย (เฉลยหลัก: "${modelAnswer}")`);
  }

  // -------------------------------------------------------------
  // 7. FINAL RESULT
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
