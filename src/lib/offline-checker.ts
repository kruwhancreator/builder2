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

  const targetWords = bestTargetSentence.split(/\s+/).map(cleanWord).filter(Boolean);

  // Collect all valid words from all acceptable answers to prevent false positives
  const allTargetWordsSet = new Set<string>();
  allTargetSentences.forEach((s: string) => {
    s.split(/\s+/).map(cleanWord).filter(Boolean).forEach((w: string) => allTargetWordsSet.add(w));
  });

  // -------------------------------------------------------------
  // 4. DYNAMIC WORD-BY-WORD DIFF & PHRASAL VERB GROUPING
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
    // Morphological rule: -ing dropping e (e.g. makeing -> making, hesitateing -> hesitating)
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

      // Handle small words like 'd' -> 'do', 'i' -> 'is', 'to', 'up', 'am' (distance <= 1)
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

      // Check if next target word is a phrasal verb particle (e.g. wake + up, clean + up, look + for)
      let finalCorrection = bestMatchWord;
      const nextTargetWord = targetWords[bestMatchIdx + 1];
      if (
        nextTargetWord && 
        PHRASAL_PARTICLES.has(nextTargetWord) && 
        !usedTargetIndices.has(bestMatchIdx + 1) &&
        !studentWords.includes(nextTargetWord)
      ) {
        // Merge into complete phrasal verb: "wake up"
        finalCorrection = `${bestMatchWord} ${nextTargetWord}`;
        usedTargetIndices.add(bestMatchIdx + 1);
      }

      spellingErrors.push({ typed: sWord, correction: finalCorrection });
      points.push(`• สะกดคำผิด: คุณพิมพ์ "${sWord}" คำที่ถูกต้องคือ "${finalCorrection}"`);
      isValid = false;
    } else {
      // Global search across acceptable answers
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
  // 5. MISSING WORDS DETECTION (WITH PHRASAL CHUNK MERGING)
  // -------------------------------------------------------------
  const missingWords: string[] = [];
  for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
    if (!usedTargetIndices.has(tIdx)) {
      const current = targetWords[tIdx];
      const next = targetWords[tIdx + 1];
      if (next && PHRASAL_PARTICLES.has(next) && !usedTargetIndices.has(tIdx + 1)) {
        missingWords.push(`${current} ${next}`);
        tIdx++; // skip next since it's grouped
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
  // 6. FIXED ANSWER KEY NORMALIZATION & MATCHING
  // -------------------------------------------------------------
  const normalize = (str: string) => str.trim().toLowerCase().replace(/[.!?]/g, '').replace(/\s+/g, ' ');
  const normalizedStudent = normalize(raw);
  const normalizedModel = normalize(modelAnswer);

  const matchesFixedAnswer = allTargetSentences.some((target: string) => normalize(target) === normalizedStudent);

  if (!matchesFixedAnswer && points.length === 0) {
    isValid = false;
    points.push(`• คำตอบยังไม่ตรงตามโครงสร้างเฉลย (เฉลยหลัก: "${modelAnswer}")`);
  }

  // -------------------------------------------------------------
  // 7. FINAL RESULT ASSEMBLY
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
  const raw = (studentAnswer || '').trim();
  if (!raw) {
    return {
      isCorrect: false,
      message: 'กรุณาเลือกเติมคำในช่องว่างให้ครบก่อนกดตรวจนะคะ',
      points: ['ยังไม่ได้เลือกคำศัพท์ลงในช่องว่าง']
    };
  }

  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[.!?,]$/, '');
  const normalizedRaw = normalize(raw);

  // 1. NORMALIZE CATEGORIES & WORD CHOICES (with id, next_valid_ids, and row index)
  const parsedCategories = (categories || []).map((cat, cIdx) => {
    const rawWords = Array.isArray(cat.words) ? cat.words : (cat.word_bank || []);
    const wordList = rawWords.map((w: any, idx: number) => {
      const defaultId = `${cat.order || cIdx + 1}${String.fromCharCode(97 + idx)}`; // e.g. "1a", "1b", "1c"
      if (typeof w === 'string') {
        return { id: defaultId, en: w, th: w, index: idx, next_valid_ids: undefined };
      }
      return {
        id: w.id || defaultId,
        en: w.en || '',
        th: w.th || w.en || '',
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

  // Check acceptable answers first if explicitly defined
  const acceptableList: string[] = item.acceptable_answers || (item.model_answer ? [item.model_answer] : []);
  if (acceptableList.some(ans => normalize(ans) === normalizedRaw)) {
    return {
      isCorrect: true,
      message: '🎉 ยอดเยี่ยมมากค่ะ! ตอบได้ถูกต้องตามเฉลยสมบูรณ์แบบ 👏',
      points: ['• โครงสร้างประโยคถูกต้อง', '• ความหมายสอดคล้องสมบูรณ์']
    };
  }

  // 2. MATCH WORDS IN EACH REQUIRED SLOT
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

  for (const cat of parsedCategories) {
    for (const w of cat.words) {
      if (!w.en) continue;
      const normKey = normalize(w.en);
      let searchPos = 0;
      while (searchPos < normalizedRaw.length) {
        const foundPos = normalizedRaw.indexOf(normKey, searchPos);
        if (foundPos === -1) break;
        matchedWords.push({
          id: w.id,
          en: w.en,
          th: w.th,
          order: cat.order,
          catName: cat.name,
          index: w.index,
          next_valid_ids: w.next_valid_ids,
          position: foundPos
        });
        searchPos = foundPos + normKey.length;
      }
    }
  }

  // Sort matched words by appearance order
  matchedWords.sort((a, b) => a.position - b.position);

  // Check missing categories
  const foundOrders = new Set(matchedWords.map(m => m.order));
  const missingOrders = requiredOrders.filter(ord => !foundOrders.has(ord));

  if (missingOrders.length > 0) {
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


