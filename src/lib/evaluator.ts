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

/**
 * Checks if a sentence containing "about to" specifies a timeframe greater than 15 minutes.
 * "be about to" in Kru Whan's pedagogy is strictly reserved for immediate timeframes <= 15 minutes
 * (e.g. 15 minutes, fifteen minutes, 10 minutes, 5 minutes, in moments, right now).
 * Any duration > 15 minutes (e.g. 16 minutes, 20 minutes, twenty minutes, 30 minutes, an hour, tomorrow, next week)
 * must be marked incorrect with advice that the timeframe shouldn't exceed 15 minutes.
 */
export function isTimeframeGreaterThan15Minutes(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  // 1. Explicit numeric minutes: e.g. "in 20 minutes", "in 16 mins", "30 minutes"
  const numMinMatch = lower.match(/\b(?:in\s+)?(\d+)\s*(?:minutes?|mins?)\b/);
  if (numMinMatch) {
    const mins = parseInt(numMinMatch[1], 10);
    if (mins > 15) return true;
  }

  // 2. English number words for minutes > 15:
  // e.g. sixteen, seventeen, eighteen, nineteen, twenty, thirty, forty, fifty, sixty, etc.
  // Note: "fifteen" is <= 15, so it is NOT matched here.
  const wordMinMatch = lower.match(
    /\b(?:in\s+)?(sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-[a-z]+)?\s*(?:minutes?|mins?)\b/
  );
  if (wordMinMatch) return true;

  // 3. Hours or fractions of hours > 15 mins:
  // e.g. "in an hour", "in 1 hour", "in 2 hours", "in two hours", "half an hour" (30 min), "in a few hours"
  const hourMatch = lower.match(
    /\b(?:in\s+)?(?:an?|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+hours?\b|\bhalf\s+an\s+hour\b|\bin\s+a\s+few\s+hours\b/
  );
  if (hourMatch) return true;

  // 4. Days, weeks, months, or distant future:
  // e.g. "tomorrow", "tonight", "next week", "next month", "in a few days", "in a week"
  const distantMatch = lower.match(
    /\b(tomorrow|tonight|next\s+(?:week|month|year|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+a\s+few\s+days|in\s+a\s+week)\b/
  );
  if (distantMatch) return true;

  return false;
}

export interface ImageRelevanceResult {
  isRelevant: boolean;
  matchedWords: string[];
  topicThai: string;
  suggestedWords: string;
}

const SEMANTIC_THEMES = [
  {
    triggers: ['กาแฟ', 'ดื่มกาแฟ', 'ดื่มน้ำ', 'คาเฟ่', 'ร้านกาแฟ', 'ชา', 'เครื่องดื่ม', 'สดชื่น', 'coffee', 'cafe', 'tea', 'espresso', 'latte', 'cappuccino'],
    topicThai: 'ดื่มกาแฟในคาเฟ่',
    keywords: ['coffee', 'drink', 'drinking', 'drank', 'drinks', 'sip', 'sipping', 'sipped', 'cup', 'mug', 'cafe', 'café', 'espresso', 'latte', 'cappuccino', 'tea', 'water', 'beverage', 'shop', 'restaurant', 'refresh', 'refreshed', 'chill', 'relax', 'table', 'barista', 'cafeteria']
  },
  {
    triggers: ['วิ่ง', 'วิ่งออกกำลังกาย', 'เดิน', 'สวนสาธารณะ', 'สวน', 'run', 'running', 'jog', 'jogging', 'park'],
    topicThai: 'วิ่งออกกำลังกายในสวนสาธารณะ',
    keywords: ['run', 'running', 'ran', 'runs', 'jog', 'jogging', 'jogged', 'jogs', 'sprint', 'sprinting', 'walk', 'walking', 'park', 'garden', 'outdoor', 'outdoors', 'exercise', 'exercising', 'workout', 'fit', 'fitness', 'healthy', 'health', 'cardio', 'sweat', 'track']
  },
  {
    triggers: ['ปิดไฟ', 'เปิดไฟ', 'สวิตช์', 'ไฟฟ้า', 'ประหยัดไฟ', 'หลอดไฟ', 'ประหยัดพลังงาน', 'light', 'switch', 'electricity', 'toggle'],
    topicThai: 'ปิดสวิตช์ไฟเพื่อประหยัดพลังงาน',
    keywords: ['light', 'lights', 'switch', 'switches', 'toggle', 'turn off', 'turning off', 'turned off', 'switch off', 'switching off', 'switched off', 'turn on', 'switch on', 'electricity', 'energy', 'power', 'save', 'saving', 'saved', 'press', 'pressing', 'pressed', 'flip', 'flipping', 'flipped', 'finger', 'hand', 'wall', 'button', 'lamp']
  },
  {
    triggers: ['ห่อของขวัญ', 'ของขวัญ', 'กล่องของขวัญ', 'ริบบิ้น', 'wrap', 'gift', 'present'],
    topicThai: 'ห่อของขวัญที่โต๊ะ',
    keywords: ['wrap', 'wrapping', 'wrapped', 'gift', 'gifts', 'present', 'presents', 'box', 'boxes', 'ribbon', 'ribbons', 'package', 'packaging', 'packaged', 'desk', 'table', 'tape', 'paper']
  },
  {
    triggers: ['ล้างรถ', 'รถ', 'รถยนต์', 'wash car', 'car wash', 'vehicle'],
    topicThai: 'ล้างรถ',
    keywords: ['wash', 'washing', 'washed', 'car', 'cars', 'vehicle', 'vehicles', 'clean', 'cleaning', 'cleaned', 'water', 'sponge', 'garage']
  },
  {
    triggers: ['ตัดผม', 'ร้านตัดผม', 'ช่างทำผม', 'ผม', 'haircut', 'barber', 'salon'],
    topicThai: 'ตัดผมที่ร้านทำผม',
    keywords: ['hair', 'haircut', 'haircuts', 'cut', 'cutting', 'barber', 'barbershop', 'salon', 'stylist', 'shave', 'shaving', 'trim', 'trimming']
  },
  {
    triggers: ['ทำอาหาร', 'ทำกับข้าว', 'ปรุงอาหาร', 'ครัว', 'อาหาร', 'cook', 'cooking', 'kitchen', 'meal'],
    topicThai: 'ทำอาหารในครัว',
    keywords: ['cook', 'cooking', 'cooked', 'meal', 'meals', 'food', 'dinner', 'lunch', 'breakfast', 'kitchen', 'stove', 'pan', 'dish', 'dishes', 'chef', 'bake', 'baking', 'recipe', 'prep']
  },
  {
    triggers: ['ซักผ้า', 'เสื้อผ้า', 'ตากผ้า', 'รีดผ้า', 'laundry', 'clothes'],
    topicThai: 'ซักผ้า',
    keywords: ['laundry', 'clothes', 'clothing', 'wash', 'washing', 'washed', 'shirt', 'shirts', 'pants', 'fabric', 'fold', 'folding', 'iron', 'ironing', 'hang']
  },
  {
    triggers: ['ล้างจาน', 'จาน', 'ชาม', 'dish', 'dishes', 'sink'],
    topicThai: 'ล้างจานในครัว',
    keywords: ['dish', 'dishes', 'plate', 'plates', 'bowl', 'bowls', 'wash', 'washing', 'washed', 'sink', 'clean', 'cleaning', 'cleaned', 'soap', 'sponge']
  },
  {
    triggers: ['กระเป๋า', 'ยกกระเป๋า', 'กระเป๋าเดินทาง', 'สัมภาระ', 'โรงแรม', 'luggage', 'suitcase', 'bellboy', 'hotel'],
    topicThai: 'ยกกระเป๋าเดินทางที่โรงแรม',
    keywords: ['bag', 'bags', 'luggage', 'suitcase', 'suitcases', 'carry', 'carrying', 'carried', 'hotel', 'lobby', 'bellboy', 'guest', 'guests', 'handle', 'handling']
  },
  {
    triggers: ['เดินทาง', 'ไปทำงาน', 'กลับบ้าน', 'รถติด', 'รถไฟฟ้า', 'ออฟฟิศ', 'commute', 'commuting', 'traffic'],
    topicThai: 'เดินทางไปทำงาน',
    keywords: ['commute', 'commuting', 'commuted', 'work', 'office', 'train', 'bus', 'subway', 'transit', 'station', 'traffic', 'drive', 'driving', 'road', 'metro']
  },
  {
    triggers: ['ว่ายน้ำ', 'สระว่ายน้ำ', 'swim', 'swimming', 'pool'],
    topicThai: 'ว่ายน้ำในสระว่ายน้ำ',
    keywords: ['swim', 'swimming', 'swam', 'swimmer', 'pool', 'water']
  },
  {
    triggers: ['อ่านหนังสือ', 'หนังสือ', 'ห้องสมุด', 'ตำรา', 'read', 'book', 'books', 'library', 'study'],
    topicThai: 'อ่านหนังสือที่โต๊ะ',
    keywords: ['read', 'reading', 'book', 'books', 'library', 'page', 'pages', 'study', 'studying', 'studied', 'homework', 'notes', 'textbook', 'review', 'reviewing', 'desk', 'lamp']
  },
  {
    triggers: ['นอน', 'เข้านอน', 'เตียง', 'sleep', 'bed'],
    topicThai: 'เข้านอนพักผ่อน',
    keywords: ['sleep', 'sleeping', 'slept', 'bed', 'bedroom', 'rest', 'resting', 'tired', 'night', 'nap']
  },
  {
    triggers: ['ซื้อของ', 'ซูเปอร์มาร์เก็ต', 'ตลาด', 'ช้อปปิ้ง', 'shopping', 'supermarket', 'grocery'],
    topicThai: 'ซื้อของที่ซูเปอร์มาร์เก็ต',
    keywords: ['shop', 'shopping', 'buy', 'buying', 'grocery', 'groceries', 'supermarket', 'market', 'store', 'cart']
  },
  {
    triggers: ['ทำความสะอาด', 'กวาดบ้าน', 'ถูบ้าน', 'จัดห้อง', 'ปัดฝุ่น', 'clean room', 'housework'],
    topicThai: 'ทำความสะอาดห้อง',
    keywords: ['clean', 'cleaning', 'sweep', 'sweeping', 'mop', 'mopping', 'tidy', 'tidying', 'dust', 'dusting', 'room', 'house', 'floor', 'vacuum']
  },
  {
    triggers: ['รดน้ำต้นไม้', 'ปลูกต้นไม้', 'ต้นไม้', 'ดอกไม้', 'gardening', 'plant'],
    topicThai: 'รดน้ำต้นไม้ในสวน',
    keywords: ['water', 'watering', 'plant', 'plants', 'garden', 'gardening', 'flower', 'flowers', 'tree', 'trees', 'lawn']
  },
  {
    triggers: ['หมา', 'สุนัข', 'แมว', 'สัตว์เลี้ยง', 'pet', 'dog', 'cat'],
    topicThai: 'ดูแลสัตว์เลี้ยง',
    keywords: ['dog', 'dogs', 'puppy', 'cat', 'cats', 'kitten', 'pet', 'pets', 'walk', 'walking', 'feed', 'feeding', 'leash']
  }
];

function getWordVariants(word: string): string[] {
  const variants = new Set([word]);
  const w = word.toLowerCase();

  // Plural / 3rd person singular -s / -es
  if (w.endsWith('ies') && w.length > 4) variants.add(w.slice(0, -3) + 'y');
  if (w.endsWith('es') && w.length > 3) variants.add(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) variants.add(w.slice(0, -1));

  // -ing
  if (w.endsWith('ing') && w.length > 4) {
    const base = w.slice(0, -3);
    variants.add(base);
    variants.add(base + 'e');
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      variants.add(base.slice(0, -1));
    }
  }

  // -ed
  if (w.endsWith('ed') && w.length > 3) {
    const base = w.slice(0, -2);
    variants.add(base);
    variants.add(base + 'e');
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      variants.add(base.slice(0, -1));
    }
  }

  return Array.from(variants);
}

export interface ParsedItemGuidance {
  targetSentenceStructure: string;
  targetImageDescription: string;
  contextHints: string;
  rawTeacherGuidance: string;
  rawContextHint: string;
}

const STRUCTURE_MARKER_REGEX = /(?:^|\n|\b)(?:Core:|Context:|Connect:|Structure:|Pattern:|Blueprint:|สูตรโครงสร้าง:|โครงสร้างประโยค:|โครงสร้าง:|S\s*\+|Subject\s*\+|I\s*\+|V\.ไม่ผัน|V\.ing|V\.3|V\.inf|Base Verb|Past Participle|about to|\.\.\.,\s*but)\b/i;

function splitTextIntoStructureAndImage(text: string): { structureParts: string[]; imageParts: string[] } {
  const structureParts: string[] = [];
  const imageParts: string[] = [];

  if (!text || !text.trim()) return { structureParts, imageParts };

  const trimmed = text.trim();

  // 1. Check if text has an explicit split point like "Detailed Image Generation Prompt", "Image Description", etc.
  const imageHeaderMatch = trimmed.search(/(?:Detailed Image Generation Prompt|Detailed Image Prompt|Image Generation Prompt|Image Description|Image Prompt|Visual Description|คำอธิบายภาพ|รายละเอียดภาพ|Key Subject & Style Tags)/i);

  if (imageHeaderMatch >= 0) {
    const before = trimmed.substring(0, imageHeaderMatch).trim();
    const after = trimmed.substring(imageHeaderMatch).trim();

    if (before && (STRUCTURE_MARKER_REGEX.test(before) || before.length > 20)) {
      structureParts.push(before);
    }
    if (after) {
      imageParts.push(after);
    }
    return { structureParts, imageParts };
  }

  // 2. Check if text has "A monochrome... vector illustration" or similar in the middle
  const illustrationMatch = trimmed.search(/\n\s*(?:A monochrome|A vector illustration|An illustration of|A photo of)/i);
  if (illustrationMatch > 0) {
    const before = trimmed.substring(0, illustrationMatch).trim();
    const after = trimmed.substring(illustrationMatch).trim();
    if (before && (STRUCTURE_MARKER_REGEX.test(before) || before.length > 20)) {
      structureParts.push(before);
    }
    if (after) imageParts.push(after);
    return { structureParts, imageParts };
  }

  // 3. If no explicit split, check whether this text looks more like an image prompt or a sentence structure
  const hasStructure = STRUCTURE_MARKER_REGEX.test(trimmed);
  const isImageHeader = /^(?:Detailed Image Generation Prompt|Detailed Image Prompt|Image Generation Prompt|Image Description|Image Prompt|A monochrome|A vector|An illustration|An illustration of|A photo|Photo of|Illustration of|ภาพวาด|รูปภาพ|คำอธิบายภาพ)/i.test(trimmed);

  if (isImageHeader) {
    imageParts.push(trimmed);
  } else if (hasStructure) {
    structureParts.push(trimmed);
  } else if (/(\/.*\/|ภาพ|ผู้ชาย|ผู้หญิง|กำลัง|โต๊ะ|กาแฟ|วิ่ง)/i.test(trimmed)) {
    // Thai visual context or slash hints
    imageParts.push(trimmed);
  } else if (/^[A-Za-z\s.,+-[\](){}]+$/.test(trimmed) && trimmed.length < 100) {
    // Short English formula pattern
    structureParts.push(trimmed);
  } else {
    // Default fallback: treat as image prompt if longer narrative, else structure
    if (trimmed.length > 80 && !hasStructure) {
      imageParts.push(trimmed);
    } else {
      structureParts.push(trimmed);
    }
  }

  return { structureParts, imageParts };
}

/**
 * Parses teacher_guidance, context_hint, and image_description columns from the database.
 * Intelligently separates the target sentence structure formula from the image description prompt,
 * even when entered in either column or combined together.
 */
export function parseItemGuidanceAndContext(item: any): ParsedItemGuidance {
  const allStructures: string[] = [];
  const allImagePrompts: string[] = [];
  const contextHints: string[] = [];

  const rawTeacherGuidance = item?.teacher_guidance || '';
  const rawContextHint = item?.context_hint || '';
  const rawImageDesc = item?.image_description || '';

  // Process teacher_guidance column
  if (rawTeacherGuidance) {
    const res = splitTextIntoStructureAndImage(rawTeacherGuidance);
    allStructures.push(...res.structureParts);
    allImagePrompts.push(...res.imageParts);
  }

  // Process context_hint column
  if (rawContextHint) {
    if (rawContextHint.includes('/')) {
      contextHints.push(rawContextHint);
    }
    const res = splitTextIntoStructureAndImage(rawContextHint);
    allStructures.push(...res.structureParts);
    allImagePrompts.push(...res.imageParts);
  }

  // Process image_description column
  if (rawImageDesc) {
    const res = splitTextIntoStructureAndImage(rawImageDesc);
    allStructures.push(...res.structureParts);
    allImagePrompts.push(...res.imageParts);
  }

  // Clean deduplication (filter out substrings of longer descriptions)
  const filterSubstrings = (arr: string[]) => {
    const unique = Array.from(new Set(arr.map(s => s.trim()).filter(Boolean)));
    return unique.filter((str, idx) => {
      return !unique.some((other, otherIdx) => otherIdx !== idx && other.length > str.length && other.includes(str));
    });
  };

  const uniqueStructures = filterSubstrings(allStructures);
  const uniqueImages = filterSubstrings(allImagePrompts);

  const targetSentenceStructure = uniqueStructures.join('\n\n') || 
                                 item?.grammar_focus || 
                                 item?.exercise_guidance || 
                                 item?.unit_subtitle || 
                                 `Core: I + do + [ V.ไม่ผัน ]\nContext: [ to + V.ไม่ผัน ]\nConnect: [ even when I'm + คำคุณศัพท์ ]`;

  const targetImageDescription = uniqueImages.join('\n\n') || 
                                rawImageDesc || 
                                rawContextHint || 
                                '';

  return {
    targetSentenceStructure,
    targetImageDescription,
    contextHints: contextHints.join('\n'),
    rawTeacherGuidance,
    rawContextHint
  };
}

/**
 * Validates whether the student's answer has semantic relevance to the image description / context hint.
 * Prevents completely unrelated sentences (e.g. washing a car on a coffee picture) from passing.
 */
export function checkImageRelevance(item: any, studentAnswer: string): ImageRelevanceResult {
  if (!item || !studentAnswer) {
    return { isRelevant: true, matchedWords: [], topicThai: '', suggestedWords: '' };
  }

  const parsed = parseItemGuidanceAndContext(item);

  const contextCombined = [
    parsed.targetImageDescription,
    parsed.contextHints,
    item.image_description || '',
    item.model_answer || '',
    ...(item.acceptable_answers || [])
  ].join(' ').toLowerCase();

  const studentLower = studentAnswer.toLowerCase();

  // 1. Match semantic predefined themes using word boundaries for English triggers
  const matchedThemes = SEMANTIC_THEMES.filter(theme =>
    theme.triggers.some(trig => {
      const t = trig.toLowerCase();
      if (/^[a-z0-9\s]+$/i.test(t)) {
        return new RegExp(`\\b${t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(contextCombined);
      }
      return contextCombined.includes(t);
    })
  );

  // 2. Dynamic keywords extracted from model answer / acceptable answers
  const STOPWORDS = new Set([
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'our', 'their', 'am', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would',
    'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'a', 'an', 'the',
    'this', 'that', 'these', 'those', 'to', 'at', 'in', 'on', 'for', 'from', 'with',
    'by', 'about', 'into', 'through', 'after', 'before', 'under', 'over', 'and', 'but',
    'or', 'so', 'because', 'although', 'even', 'when', 'while', 'if', 'as', 'than',
    'though', 'however', 'not', 'no', 'too', 'very', 'really', 'right', 'now', 'still',
    'just', 'always', 'often', 'usually', 'sometimes', 'never', 'minute', 'minutes',
    'hour', 'hours', 'day', 'days', 'time', 'times'
  ]);

  // Feelings, states, emotions, and generic purpose words cannot alone prove image relevance
  const ANCILLARY_OR_STATE_WORDS = new Set([
    // Feelings & physical states (often in Connect: even when I'm ...)
    'sleepy', 'tired', 'busy', 'happy', 'sad', 'lazy', 'bored', 'hungry', 'thirsty',
    'exhausted', 'sick', 'drowsy', 'sleep', 'fine', 'well', 'good', 'bad', 'crazy', 'mad',
    'nervous', 'worried', 'afraid', 'scared', 'stressed',
    // Generic purpose & abstract verbs / objects
    'learn', 'learning', 'learned', 'things', 'thing', 'new',
    'save', 'saving', 'saved',
    'keep', 'keeping', 'kept',
    'stay', 'staying', 'stayed',
    'feel', 'feeling', 'felt',
    'make', 'making', 'made',
    'get', 'getting', 'got',
    'clean', 'cleaning', 'cleaned',
    'help', 'helping', 'helped',
    'work', 'working', 'worked',
    'need', 'needed', 'want', 'wanted', 'like', 'liked', 'try', 'trying', 'tried',
    'regularly', 'properly', 'carefully', 'quick', 'quickly', 'slow', 'slowly'
  ]);

  const rawContentWords: string[] = [];
  const dynamicKeywords = new Set<string>();
  const allReferenceAnswers = [item.model_answer || '', ...(item.acceptable_answers || [])];
  for (const ans of allReferenceAnswers) {
    // If answer contains a multi-clause contrast like "about to ... but I still ...",
    // the visual scene corresponds to the clause AFTER 'but' (the current physical action)!
    let visualClause = ans;
    if (/\b(about to|going to)\b.*\b(but|however)\b/i.test(ans)) {
      const parts = ans.split(/\b(but|however)\b/i);
      visualClause = parts.slice(1).join(' ');
    }

    const words = visualClause.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    for (const w of words) {
      if (w.length > 2 && !STOPWORDS.has(w)) {
        rawContentWords.push(w);
        for (const variant of getWordVariants(w)) {
          dynamicKeywords.add(variant);
        }
      }
    }
  }

  // Also extract English nouns/verbs from targetImageDescription if English text exists
  const descText = `${parsed.targetImageDescription} ${item.image_description || ''}`;
  if (/[a-zA-Z]{3,}/.test(descText)) {
    const descWords = descText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    for (const w of descWords) {
      if (w.length > 3 && !STOPWORDS.has(w)) {
        rawContentWords.push(w);
        for (const variant of getWordVariants(w)) {
          dynamicKeywords.add(variant);
        }
      }
    }
  }

  // 3. Combine all expected keywords
  const allExpectedKeywords = new Set<string>([...dynamicKeywords]);
  for (const th of matchedThemes) {
    for (const kw of th.keywords) {
      allExpectedKeywords.add(kw);
    }
  }

  // 4. Check if student answer contains any of the expected keywords
  const matchedWords: string[] = [];
  for (const kw of allExpectedKeywords) {
    const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(studentLower)) {
      matchedWords.push(kw);
    }
  }

  // Check multi-word action phrases
  const multiWordPhrases = ['turn off', 'switch off', 'turn on', 'switch on', 'coffee shop', 'work out', 'light switch', 'hair cut', 'car wash'];
  for (const phrase of multiWordPhrases) {
    if (allExpectedKeywords.has(phrase) || matchedThemes.some(t => t.keywords.includes(phrase))) {
      if (studentLower.includes(phrase)) {
        matchedWords.push(phrase);
      }
    }
  }

  // Filter out ancillary/state words: matching ONLY 'sleepy', 'tired', 'learn', 'save' is NOT sufficient!
  const nonGenericMatches = matchedWords.filter(w => !ANCILLARY_OR_STATE_WORDS.has(w.toLowerCase()));

  // Detect explicit unrelated entertainment/activity when image does not support it
  const unrelatedEntertainment = [
    'watch series', 'watch tv', 'watch movie', 'watch movies', 'watch show', 'watch shows',
    'watch video', 'watch videos', 'watch youtube', 'play game', 'play games', 'video game',
    'video games', 'scroll social media', 'scroll tiktok'
  ];
  const hasUnrelatedEntertainment = unrelatedEntertainment.some(phrase => studentLower.includes(phrase)) &&
    !matchedThemes.some(t => t.triggers.includes('tv') || t.triggers.includes('series') || t.triggers.includes('movie'));

  const isRelevant = nonGenericMatches.length > 0 && !hasUnrelatedEntertainment;
  const topicThai = matchedThemes[0]?.topicThai || 
                    (parsed.contextHints ? parsed.contextHints.split('/')[0].trim() : '') || 
                    (item.context_hint ? item.context_hint.split('/')[0].trim() : '') || 
                    'ในภาพ';
  const cleanCandidateWords = rawContentWords.filter(w => !ANCILLARY_OR_STATE_WORDS.has(w.toLowerCase())).length > 0
    ? Array.from(new Set(rawContentWords.filter(w => !ANCILLARY_OR_STATE_WORDS.has(w.toLowerCase()))))
    : (matchedThemes[0]?.keywords || Array.from(allExpectedKeywords)).filter(w => !ANCILLARY_OR_STATE_WORDS.has(w.toLowerCase()));

  const suggestedWords = cleanCandidateWords
    .filter(w => !['toggle', 'sweater', 'finger', 'wall', 'screw', 'indoor', 'plate', 'style', 'art', 'clean', 'look', 'make', 'do', 'have', 'be'].includes(w) && w.length > 2)
    .slice(0, 3)
    .join(', ');

  return {
    isRelevant,
    matchedWords,
    topicThai,
    suggestedWords
  };
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
- NO EXCLAMATION MARKS IN THAI (CRITICAL):
  * In Thai writing, we do NOT use exclamation marks ("!").
  * NEVER put "!" in Thai feedback, encouragement, or sentence endings (e.g. NEVER write "เก่งแล้วค่ะ!", "สู้ๆ นะคะ!", "ถูกต้องเลยค่ะ!", "ลองดูนะคะ!").
  * Always write "เก่งแล้วค่ะ", "สู้ๆ นะคะ", "ถูกต้องเลยค่ะ" without any "!" in Thai text!

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

4. GRAMMAR, VOCABULARY & IMAGE PROMPT ANALYSIS (STRICT ACTION MATCHING):
   - Compare the student's vocabulary (subjects, actions, feelings, objects) with the "Picture Description / Image Prompt" and "Model Answer".
   - The student's MAIN action verb and object MUST describe what the character is physically doing in the image (as defined in the Image Description and Model Answer).
   - If the image depicts someone at a desk with books/lamp, valid actions are reading and studying: 'read', 'read books', 'read a book', 'study', 'review the lesson', 'do homework'.
   - Abstract purposes like 'learn new things' or states like 'sleepy' are NOT physical actions. The student cannot substitute an activity that is absent from the picture (such as 'watch series', 'watch tv', 'play games', 'sleep', 'wash dishes', 'cook food').
   - If the student uses an action not depicted in the image:
     * MUST mark as INCORRECT (isCorrect: false).
     * Set statusText: "💡 ประโยคยังไม่สอดคล้องกับภาพค่ะ".
     * In feedbackPoints, explain clearly that the image shows reading books, not watching series, and advise them to adjust the action verb.
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
   - Verify that all key subjects, objects, animals, actions, and settings describing the PHYSICAL SCENE IN THE PICTURE match what is depicted in the "Picture Description & Scene Context Prompt" or the reference visual context.
   - If the image contains a specific entity and the student mentions an incorrect or conflicting entity in the visual scene (for example: image shows a DOG, but student writes "cat"; image shows COFFEE, but student writes "soup"; image shows a BICYCLE, but student writes "car"; image shows a HAIRCUT, but student writes "cooking"):
     * MUST mark as INCORRECT (isCorrect: false).
     * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
     * In feedbackPoints, explicitly explain the visual mismatch in Thai using Kru Whan female polite tone (ค่ะ/นะคะ) and the pronoun "นักเรียน":
       e.g., "• ในภาพเป็นสุนัข (dog) ไม่ใช่แมว (cat) นะคะ นักเรียนลองปรับคำศัพท์ให้ตรงกับสิ่งที่เกิดขึ้นในภาพดูนะคะ"

   - CRITICAL PEDAGOGICAL RULE FOR MULTI-CLAUSE & CONTRAST STRUCTURES (e.g. "I'm about to ..., but I still ...", "Although ..., ...", "Before ..., ...", "I plan to ..., so I need to ..."):
     * In sentence structures combining an upcoming/future action with a current action (such as: "I'm about to [Action A], but I still [Action B]"):
       1. Action B describes what the character is CURRENTLY doing or needs to do right now in the picture (e.g. "wrap the gift", "need to wrap the gift", "clean the room", "pack my bags"). THIS ACTION MUST MATCH THE PICTURE!
       2. Action A describes an UPCOMING, FUTURE, or PLANNED event (e.g. "study in 15 minutes", "study in fifteen minutes", "leave for work", "meet my friend", "take an exam", "go to bed") that has NOT happened yet!
       3. IT IS PHYSICALLY IMPOSSIBLE FOR A FUTURE/INTENDED ACTION TO BE VISIBLE IN A PICTURE OF THE PRESENT MOMENT!
       4. Therefore, the upcoming action in "I'm about to..." CAN BE ANY LOGICAL OR REAL-WORLD ACTIVITY!
       5. NEVER, EVER PENALIZE THE STUDENT OR CLAIM "คำกริยาที่นักเรียนเลือกใช้คือ 'study' ไม่สอดคล้องกับภาพที่กำลังห่อของขวัญ"! The character in the picture is wrapping a gift right now precisely because they are about to study in 15 minutes! This is 100% correct, logical, and natural English!
       6. Check visual matching ONLY against the clause that describes the current physical scene (e.g. "wrap the gift")!

   - NUMBERS AS WORDS VS DIGITS EQUIVALENCE (100% IDENTICAL):
     * Numbers written as words ("fifteen minutes", "two hours", "five dollars", "ten percent") and numbers written as digits ("15 minutes", "2 hours", "$5", "10%") are 100% EQUIVALENT and EQUALLY CORRECT!
     * Both "fifteen minutes" and "15 minutes" are completely valid and natural English. NEVER mark an answer as wrong or treat it differently just because the student wrote words instead of digits or vice versa!

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

8. PRAGMATIC APPROPRIATENESS & "MORE PROPER / NATURAL" ADVICE (PEDAGOGICAL NUANCE & ADVANCED TIPS):
   - In English, there are sentences where the grammar is strictly correct, and the student successfully applies the lesson's target formula, BUT the phrasing is slightly awkward, unnatural, or would be "MORE PROPER" if expressed differently.
   - GOLDEN RULE FOR THESE SITUATIONS:
     * DO NOT MARK THE SENTENCE AS INCORRECT!
     * MUST KEEP isCorrect: true, statusText: "ถูกต้องเลยค่ะ เก่งมากเลย 👏".
     * Provide encouraging praise in feedbackPoints for mastering the structure.
     * THEN, add a gentle, expert Kru Whan tip (คำแนะนำเพิ่มเติมเพื่อความเป็นธรรมชาติ) explaining why an alternative phrasing is more proper or native-like!
   
   - SPECIAL CASE A: "be about to + V" (กำลังจะ...ในอีกไม่ช้า / กำลังจะ...เดี๋ยวนี้แล้ว):
     * CRITICAL TEACHING RULE FROM KRU WHAN (EQUAL TO OR LESS THAN 15 MINUTES):
       - The grammatical expression "be about to + V" specifically indicates an action in the IMMEDIATE future that is EQUAL TO OR LESS THAN 15 MINUTES (ช่วงเวลาที่เท่ากับหรือน้อยกว่า 15 นาที เช่น in moments, in 5 minutes, in 10 minutes, in 15 minutes / fifteen minutes, right now).
       - If the student writes a timeframe EQUAL TO OR LESS THAN 15 MINUTES (including "15 minutes" and "fifteen minutes"):
         * The sentence is 100% correct! MUST MARK isCorrect: true.
         * You may praise their proper timeframe: "• การใช้ 'be about to' กับช่วงเวลาที่เท่ากับหรือน้อยกว่า 15 นาที (equal to or less than 15 minutes) ถูกต้องและเป็นธรรมชาติมากค่ะ"
       - If the student uses "be about to" with a timeframe GREATER THAN 15 MINUTES (such as "in 16 minutes", "in 20 minutes", "in twenty minutes", "in 30 minutes", "in thirty minutes", "in an hour", "in two hours", "tomorrow", "next week", "in a few days"):
         * MUST MARK AS INCORRECT: isCorrect: false!
         * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
         * In feedbackPoints, MUST advise clearly that the time range shouldn't be more than 15 mins:
           "• การใช้สำนวน 'be about to + V' (กำลังจะ...ในอีกไม่ช้า) ใช้สำหรับช่วงเวลาสั้นๆ ที่เท่ากับหรือน้อยกว่า 15 นาที (equal to or less than 15 minutes หรือในอีกไม่กี่อึดใจ) เท่านั้นนะคะ หากเป็นช่วงเวลาที่เกินกว่า 15 นาทีขึ้นไป (เช่น อีก 20 นาที, อีก 30 นาที, อีก 1 ชั่วโมง หรือพรุ่งนี้) จะไม่สามารถใช้ 'be about to' ได้ค่ะ แนะนำให้เปลี่ยนไปใช้ 'be going to + V' หรือ 'will + V' แทน หรือหากต้องการใช้ 'be about to' ให้ปรับช่วงเวลาไม่เกิน 15 นาทีนะคะ"
         * In "correctedSentence", provide the natural version (e.g. "I'm going to leave in 30 minutes, but I still need to wrap the gift." or "I'm about to leave in 15 minutes...").

   - SPECIAL CASE B: AWKWARD OR LESS PROPER CONSTRUCTIONS (e.g. "used to ... but now I do that"):
     * Example: "I used to take a picture of the scenery but now I do that."
       - Grammatically it parses, but "now I do that" is unnatural/improper repetition in English. Native speakers naturally say "now I do it regularly", "now I still do", or "now I enjoy taking photos".
       - In such cases:
         - MUST MARK isCorrect: true (do NOT penalize the student).
         - In feedbackPoints:
           "• โครงสร้างประโยคถูกต้องตามหลักไวยากรณ์แล้วค่ะ เก่งมากเลยนะคะ"
           "• คำแนะนำเพิ่มเติมเพื่อความเป็นธรรมชาติ: ท่อนหลังที่นักเรียนเขียนว่า 'now I do that' แม้จะเข้าใจความหมายได้ แต่เพื่อให้ประโยคสละสลวยและเป็นธรรมชาติเหมือนเจ้าของภาษา แนะนำให้ปรับเป็น 'now I do it regularly' หรือ 'now I enjoy doing so' จะเหมาะสมกว่านะคะ"
         - In "correctedSentence", provide the polished native version!

   - SPECIAL CASE C: OTHER GENERAL "CORRECT BUT MORE PROPER" USAGES ACROSS ALL UNITS:
     * Whenever a student writes a sentence that is technically correct in grammar and matches the image/context, but native speakers would phrase it more properly/idiomatically:
       - Keep isCorrect: true.
       - Always praise their effort first.
       - Offer the "more proper" suggestion as a bonus enhancement tip in feedbackPoints.

9. WHEN STUDENT ANSWER IS CORRECT (100% Valid & Meaningful):
   - Set "isCorrect": true
   - Set "statusText": "ถูกต้องเลยค่ะ เก่งมากเลย 👏"
   - In "feedbackPoints", praise the student, highlight how well their sentence fulfills the structure formula, and note how well it fits the visual scene.

10. WHEN STUDENT ANSWER NEEDS IMPROVEMENT:
   - Set "isCorrect": false
   - Set "statusText": "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
   - In "feedbackPoints", clearly explain the structure/grammar/punctuation/determiner/pronoun/gender/entity/reality issue with teacher guidance, provide gentle tips on natural usage, and encourage them.

11. THAI TRANSLATION & RECOMMENDED SENTENCE:
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

    const parsedGuidance = parseItemGuidanceAndContext(req.item);

    prompt = `Exercise Type: Picture Description & Sentence Construction (Exercise 3: Dual-Core Assessment)
${unitTitle ? `Unit Title: "${unitTitle}"\n` : ''}${unitSubtitle ? `Unit Lesson Subtitle & Pattern: "${unitSubtitle}"\n` : ''}${exerciseTitle ? `Exercise Title: "${exerciseTitle}"\n` : ''}${exerciseInstruction ? `Exercise Instructions: "${exerciseInstruction}"\n` : ''}${grammarFocus ? `Grammar Focus: "${grammarFocus}"\n` : ''}${structureRequired ? `Required Structure Blueprint: ${structureRequired}\n` : ''}

📋 QUIZ SPECIFICATION & REFERENCE DATA (FROM DATABASE COLUMNS teacher_guidance, context_hint, model_answer, acceptable_answers):

1. 🎯 TARGET SENTENCE STRUCTURE (สูตรโครงสร้างประโยคประจำข้อที่กำหนดให้ผู้เรียนใช้):
${parsedGuidance.targetSentenceStructure}

2. 🖼️ IMAGE DESCRIPTION PROMPT & VISUAL SCENE (คำอธิบายภาพและสิ่งที่เกิดขึ้นในภาพ):
${parsedGuidance.targetImageDescription || 'None provided'}

3. 💡 CONTEXT HINTS & KEYWORD CLUES (คำใบ้บริบทเพิ่มเติม):
${parsedGuidance.contextHints || 'None provided'}

4. 🎯 MODEL ANSWER & ACCEPTABLE ACTIONS (เฉลยตัวอย่างและกริยาการกระทำที่ถูกต้องตามภาพ):
- Teacher's Primary Model Answer: "${req.item.model_answer}"
${req.item.acceptable_answers ? `- Acceptable Variations: ${JSON.stringify(req.item.acceptable_answers)}` : ''}

CRITICAL: CORE PHYSICAL ACTION & OBJECT GROUNDING (กริยาการกระทำและสิ่งของหลักต้องตรงกับภาพ):
- The Model Answer, Acceptable Variations, and Image Description define the ACTUAL PHYSICAL ACTION and OBJECT depicted in the picture (e.g. reading books at a desk, drinking coffee in a cafe, turning off lights).
- The student's primary action verb and direct object MUST describe what the character is physically doing in the image (e.g. "read books", "read a book", "study", "review my notes", "do homework").
- If the student writes an action that is NOT depicted in the image and NOT equivalent in meaning to the Model Answer (e.g. writing an unrelated activity not visible in the picture):
  * MUST MARK AS INCORRECT: isCorrect: false!
  * Set statusText: "💡 ประโยคยังไม่สอดคล้องกับภาพค่ะ"
  * In feedbackPoints, explain clearly in polite Kru Whan Thai: state what the character in the picture is physically doing (matching "${req.item.model_answer}" and the image description), point out that they are not doing the student's activity, and kindly encourage the student to use a verb that matches the picture.
  * In correctedSentence, provide the Model Answer ("${req.item.model_answer}").
- NEVER mark an answer as correct just because an emotional/physical state adjective (like 'sleepy' or 'tired') or a purpose clause matches, if the main action verb contradicts what is visually happening in the picture!

5. 📌 RAW DATABASE VALUES (FOR FULL TEACHER CONTEXT):
- teacher_guidance column: "${req.item.teacher_guidance || 'None'}"
- context_hint column: "${req.item.context_hint || 'None'}"
- image_description column: "${req.item.image_description || 'None'}"

Student Answer to Evaluate: "${req.studentAnswer}"

Evaluation Steps for this Quiz (ACT STRICTLY LIKE A TEACHER GRADING A STUDENT'S EXERCISE):
The teacher has entered the sentence structure, image description prompt, model answer, and acceptable answers. You MUST examine the student's answer against BOTH core criteria:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITERION 1: SENTENCE STRUCTURE COMPLIANCE (ความถูกต้องตามสูตรโครงสร้างประโยค)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Check whether the student's answer strictly adheres to the TARGET SENTENCE STRUCTURE specified above ("${parsedGuidance.targetSentenceStructure}").
- If the student writes a sentence that fails to use or ignores the required formula (e.g., using active voice when passive voice S. + is/am/are + V.3 is taught, using wrong tense, missing required slots or connectors such as 'to + V', 'even when', 'so', 'but', etc.):
  * MUST mark as INCORRECT: isCorrect: false!
  * Set statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
  * In feedbackPoints, explain clearly as a teacher in polite Kru Whan Thai:
    - "• ในข้อนี้เรากำลังฝึกแต่งประโยคด้วยโครงสร้าง [ระบุสูตรโครงสร้างที่กำหนด] นะคะ"
    - Point out precisely what part of the structure the student missed or wrote incorrectly, and teach how to fix it to match the required formula.
  * In correctedSentence, provide a sentence that strictly adheres to the TARGET SENTENCE STRUCTURE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITERION 2: IMAGE RELEVANCE & ACTION CORRESPONDENCE (ความสอดคล้องกับภาพและการกระทำในภาพ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Check whether the student's answer accurately describes the PHYSICAL ACTION and SCENE depicted in the image and defined in the Model Answer ("${req.item.model_answer}") and Image Description ("${parsedGuidance.targetImageDescription}").
- If the student writes about an activity NOT shown in the picture (e.g. image shows reading books, but student writes about watching series, watching TV, playing video games, washing dishes, cooking food, sleeping, swimming, etc.):
  * MUST MARK AS INCORRECT: isCorrect: false!
  * Set statusText: "💡 ประโยคยังไม่สอดคล้องกับภาพค่ะ"
  * In feedbackPoints, explain clearly in polite Kru Whan Thai:
    "• ในภาพเป็นเหตุการณ์ [สิ่งที่เกิดขึ้นในภาพ เช่น กำลังอ่านหนังสือ] นะคะ แต่ประโยคของนักเรียนเกี่ยวกับ [สิ่งที่นักเรียนเขียน เช่น ดูซีรีส์] ซึ่งยังไม่สอดคล้องกับสิ่งที่เกิดขึ้นในภาพค่ะ ลองดูภาพแล้วแต่งประโยคใหม่ให้ตรงกับการกระทำในภาพนะคะ"
  * In correctedSentence, provide the teacher's model answer.

3. Translate what the student wrote into natural Thai and return it in "studentTranslation":
   - "customer" / "customers" MUST be translated as "ลูกค้า", NEVER "นักเรียน".
   - "they" / "them" referring to human beings (customers, guests, people) MUST be translated as "พวกเขา", NEVER "พวกมัน".
4. STRICT ANTI-HALLUCINATION CHECK:
   - Evaluate ONLY the words that the student actually wrote in "${req.studentAnswer}".
   - NEVER attribute words from the reference example (such as 'bags') to the student if the student did not write them!
   - NEVER say "คำว่า '...' ที่นักเรียนใช้" for words that do NOT exist in the student's answer!
5. STRICT PUNCTUATION MARKS & CLAUSE COMMAS:
   - Check for a comma (,) before coordinating conjunctions when connecting clauses (e.g. "..., so I make sure to...", "..., but...", "..., and..."). If the comma is omitted (e.g. "... at home so I make sure..."), MUST mark isCorrect: false, statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ", and advise to add a comma before 'so' (e.g. ", so").
   - Check for ending period / full stop (.). If missing, mark isCorrect: false.
   - Check first letter capitalization.
6. STRICT DETERMINERS & COLLOCATIONS:
   - Check that set phrases and chores include required determiners (e.g. "do the dishes" NOT "do dishes", "make the bed", "take out the trash"). If missing 'the', mark isCorrect: false and advise in feedbackPoints.
7. STRICT PRONOUN-ANTECEDENT AGREEMENT:
   - Pronouns must match plural/singular nouns they replace (e.g. referring back to plural "the dishes" requires "them", NOT "it"; referring back to singular "the car" requires "it", NOT "them"). If mismatched (e.g. "do the dishes ... so I make sure to do it"), MUST mark isCorrect: false and advise in feedbackPoints.
8. STRICT GRAMMATICAL CORRECTNESS:
   - Check 100% grammar accuracy: Subject-verb agreement (e.g. He is vs He are), verb forms (V.3 vs V.ing vs Base Verb), prepositions, articles (a/an/the), and spelling.
   - If any grammatical error exists, mark isCorrect: false and explain the rule kindly.
9. STRICT CHARACTER GENDER & PRONOUN VERIFICATION:
   - "I" / "I am" / "I'm" / "I do" is ALWAYS acceptable and correct (first-person perspective).
   - If the character depicted in the picture/context is MALE and student wrote "she", "her", or feminine pronouns: MUST mark isCorrect: false, and advise that the character is male so should use "he" (or "I") instead of "she".
   - If the character depicted in the picture/context is FEMALE and student wrote "he", "his", "him", or masculine pronouns: MUST mark isCorrect: false, and advise that the character is female so should use "she" (or "I") instead of "he".
10. STRICT IMAGE ELEMENT & ENTITY VERIFICATION:
   - Check that the animals, objects, actions, and settings describing the visual scene match the picture context ("${parsedGuidance.targetImageDescription || req.item.image_description || ''}").
   - For multi-clause or contrast structures like "I'm about to [Upcoming Action], but I still [Current Action in Image]":
     * ONLY the clause describing the current physical action (e.g. "need to wrap the gift") must match the picture!
     * The future/planned action in "I'm about to [Action]" (e.g. "study", "study in fifteen minutes", "study in 15 minutes", "leave", "take an exam") is an upcoming plan that has not happened yet and therefore is NOT in the image. DO NOT require it to be in the image, and NEVER claim words like 'study' don't match the picture!
   - Numbers as words vs digits ("fifteen minutes" vs "15 minutes") are 100% IDENTICAL and EQUALLY CORRECT.
   - If image has a dog and student writes "cat", image has coffee and student writes "wine", image has haircut and student writes "swimming" -> MUST mark isCorrect: false, statusText: "💡 ประโยคยังไม่สอดคล้องกับภาพค่ะ", and advise in feedbackPoints that the image shows [element in picture] not [student's word].
11. STRICT REAL-WORLD PLAUSIBILITY & COMMON SENSE CHECK:
   - Even if grammar is correct, the sentence MUST be reasonable, plausible, and possible in real life!
   - If student writes an unrealistic habit or frequency (e.g. "I have my hair cut everyday...", "I wash my car every 10 minutes...", "I eat dinner 10 times a night..."):
     * MUST mark isCorrect: false.
     * statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ".
     * In feedbackPoints, explain kindly that this frequency/action is not realistic in everyday life, and suggest a plausible alternative (e.g. once a month, on weekends).
12. PRAGMATIC APPROPRIATENESS & TIME-RANGE CHECKS (PEDAGOGICAL NUANCE & ADVANCED TIPS):
    - For "be about to + V" (เช่น I'm about to...):
      * CRITICAL TEACHING RULE: "be about to" is used for a time period that is EQUAL TO OR LESS THAN 15 MINUTES (ช่วงเวลาที่เท่ากับหรือน้อยกว่า 15 นาที เช่น 15 minutes, fifteen minutes, 10 minutes, in moments, right now).
      * If time is equal or less than 15 minutes -> 100% correct (isCorrect: true), praise their proper timeframe.
      * If student wrote a time range GREATER THAN 15 MINUTES (e.g. 16 minutes, 20 minutes, 30 minutes, an hour, tomorrow, next week, twenty minutes, etc.):
        - MUST mark isCorrect: false!
        - statusText: "💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ"
        - In feedbackPoints, explain clearly that the time range for 'be about to' shouldn't be more than 15 mins:
          "• สำนวน 'be about to + V' ใช้สำหรับช่วงเวลาที่เท่ากับหรือน้อยกว่า 15 นาที (equal to or less than 15 minutes) เท่านั้นนะคะ หากช่วงเวลาเกินกว่า 15 นาทีขึ้นไป แนะนำให้เปลี่ยนไปใช้ 'be going to' หรือ 'will' แทน หรือปรับช่วงเวลาให้ไม่เกิน 15 นาทีค่ะ"
        - In correctedSentence, provide the natural version.
    - For phrasing that is grammatically correct but awkward or would be "more proper" if rephrased (e.g. "I used to take a picture of the scenery but now I do that"):
      * KEEP isCorrect: true!
      * In feedbackPoints, praise the grammar first, then add advice:
        "• คำแนะนำเพิ่มเติมเพื่อความเป็นธรรมชาติ: ท่อนหลังที่ว่า 'now I do that' แนะนำให้ปรับเป็น 'now I do it regularly' หรือ 'now I enjoy doing so' จะสละสลวยกว่านะคะ"
      * In correctedSentence, provide the polished phrasing.
13. If the sentence is 100% grammatically correct, adheres strictly to the target sentence structure, logically matches the image elements and gender, and is plausible in real life:
    - Set isCorrect: true, statusText: "ถูกต้องเลยค่ะ เก่งมากเลย 👏", and praise their sentence in feedbackPoints.
14. If there are errors (image mismatch, structure mismatch, missing comma, determiner error, pronoun mismatch, grammatical error, unrealistic habit, entity mismatch, gender mismatch), explain kindly in feedbackPoints using the term "นักเรียน" and provide the best corrected sentence conforming to the target formula in "correctedSentence".
15. Use Kru Whan's female polite tone (ค่ะ/นะคะ/เลยค่ะ) throughout all feedbackPoints.`;
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

  // Always prefer the teacher's model answer as the correctedSentence if provided
  let finalCorrectedSentence = req.item.model_answer || parsed.correctedSentence || req.studentAnswer;

  let isCorrect = typeof parsed.isCorrect === 'boolean'
    ? parsed.isCorrect
    : (typeof parsed.score === 'number' ? parsed.score >= 95 : !parsed.statusText?.includes('ไม่สมบูรณ์') && !parsed.statusText?.includes('ไม่สอดคล้อง'));

  const rawFeedbackPoints: string[] = Array.isArray(parsed.feedbackPoints) ? parsed.feedbackPoints : [];
  let sanitizedFeedbackPoints = cleanFeedbackPoints(rawFeedbackPoints, req.studentAnswer);

  // Strict Image Relevance Enforcement for Picture Description (Exercise 3)
  if (req.exerciseType === 'picture_description') {
    const relevance = checkImageRelevance(req.item, req.studentAnswer);
    if (!relevance.isRelevant) {
      isCorrect = false;
      parsed.statusText = '💡 ประโยคยังไม่สอดคล้องกับภาพค่ะ';

      // Remove false praise
      sanitizedFeedbackPoints = sanitizedFeedbackPoints.filter(pt => !/(ถูกต้องเลยค่ะ|เก่งมาก)/.test(pt));

      const hasImageMismatchPt = sanitizedFeedbackPoints.some(pt =>
        /(ไม่สอดคล้องกับภาพ|ไม่ตรงกับภาพ|ไม่ตรงกับสิ่งที่เกิดขึ้นในภาพ|(?:ในภาพ|ภาพนี้|ภาพ).*เป็นเหตุการณ์)/.test(pt)
      );

      if (!hasImageMismatchPt) {
        const topicText = relevance.topicThai ? `ที่เกี่ยวกับ${relevance.topicThai}` : 'ที่ปรากฏในภาพ';
        sanitizedFeedbackPoints.unshift(
          `• ในภาพเป็นเหตุการณ์${topicText}นะคะ แต่ประโยคของนักเรียนยังไม่สอดคล้องกับสิ่งที่เกิดขึ้นในภาพค่ะ ลองดูภาพแล้วแต่งประโยคใหม่ให้ตรงกับภาพนะคะ`
        );
      }
    }
  }

  // CRITICAL SAFETY CHECK: Exact / Near Model Answer Match
  // If the student writes the teacher's model answer (or acceptable answer), it is BY DEFINITION correct!
  const normalizeForMatch = (s: string) => {
    let res = (s || '')
      .trim()
      .replace(/[.!?]+$/, '')
      .replace(/['’]/g, "'")
      .replace(/\s+/g, ' ')
      .toLowerCase();

    // Map common number words to digits so "fifteen minutes" and "15 minutes" match perfectly
    const numWordMap: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'twenty-five': '25',
      'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60'
    };

    for (const [word, digit] of Object.entries(numWordMap)) {
      const reg = new RegExp(`\\b${word}\\b`, 'g');
      res = res.replace(reg, digit);
    }
    return res;
  };

  const studentNorm = normalizeForMatch(req.studentAnswer);
  const modelNorm = normalizeForMatch(req.item.model_answer);
  const isMatchModel = modelNorm.length > 0 && (
    studentNorm === modelNorm ||
    (Array.isArray(req.item.acceptable_answers) && req.item.acceptable_answers.some((ans: string) => normalizeForMatch(ans) === studentNorm))
  );

  if (isMatchModel) {
    const hasEndingPunctuation = /[.!?]$/.test(req.studentAnswer.trim());
    if (hasEndingPunctuation) {
      isCorrect = true;
      sanitizedFeedbackPoints = ['ประโยคถูกต้องตามโครงสร้างที่กำหนดและสอดคล้องกับภาพเรียบร้อยแล้วค่ะ เก่งมากเลยนะคะ'];
    } else {
      isCorrect = false;
      sanitizedFeedbackPoints = ['• อย่าลืมใส่เครื่องหมายจุด Full stop (.) ท้ายประโยคด้วยนะคะ'];
    }
  }

  // Pedagogical Rule for "be about to":
  // "be about to" indicates immediate future <= 15 minutes.
  // If student uses "about to" with a timeframe > 15 minutes, enforce isCorrect = false.
  const hasAboutTo = /\babout to\b/i.test(req.studentAnswer);
  const isOver15Min = hasAboutTo && isTimeframeGreaterThan15Minutes(req.studentAnswer);

  if (isOver15Min) {
    isCorrect = false;
    parsed.statusText = '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ';
    const timeRangeAdvice = '• สำนวน "be about to + V" (กำลังจะ...ในอีกไม่ช้า) ใช้สำหรับช่วงเวลาสั้นๆ ที่เท่ากับหรือน้อยกว่า 15 นาที (equal to or less than 15 minutes หรือในอีกไม่กี่อึดใจ) เท่านั้นนะคะ หากเป็นช่วงเวลาที่เกินกว่า 15 นาที (เช่น in 20 minutes, in 30 minutes หรือ in an hour) จะไม่สามารถใช้ "be about to" ได้ค่ะ แนะนำให้เปลี่ยนไปใช้ "be going to + V" หรือ "will + V" แทน หรือหากต้องการใช้ "be about to" ให้ปรับช่วงเวลาไม่เกิน 15 นาทีนะคะ';

    sanitizedFeedbackPoints = sanitizedFeedbackPoints.filter(pt => !/(ถูกต้องเลยค่ะ|เก่งมาก)/.test(pt));
    const alreadyHasAdvice = sanitizedFeedbackPoints.some(pt => pt.includes('15') || pt.includes('about to'));
    if (!alreadyHasAdvice) {
      sanitizedFeedbackPoints.unshift(timeRangeAdvice);
    }
    if (finalCorrectedSentence && /\babout to\b/i.test(finalCorrectedSentence) && isTimeframeGreaterThan15Minutes(finalCorrectedSentence)) {
      finalCorrectedSentence = finalCorrectedSentence.replace(/\babout to\b/gi, 'going to');
    }
  }

  // Safety filter for multi-clause / contrast structures ("about to ... but I still ...")
  // Prevents the AI from wrongly claiming that an upcoming activity (like 'study', 'leave', 'sleep')
  // does not match a picture of someone wrapping a gift / doing chores right now.
  // CRITICAL: Only applies when the sentence actually has semantic relevance to the image!
  const isAboutToOrFuture = /\b(about to|going to)\b/i.test(req.studentAnswer);
  const isRelevantToImage = req.exerciseType !== 'picture_description' || checkImageRelevance(req.item, req.studentAnswer).isRelevant;

  if (isAboutToOrFuture && !isCorrect && !isOver15Min && isRelevantToImage) {
    const hasFalseUpcomingImageMismatch = sanitizedFeedbackPoints.some(pt =>
      /(ไม่สอดคล้องกับภาพ|ไม่ตรงกับภาพ|ไม่ตรงกับสิ่งที่เกิดขึ้นในภาพ)/.test(pt) &&
      /(study|leave|sleep|go|exam|work|read|meet|eat|drink|cook|drive|fifteen|minutes)/i.test(pt)
    );

    if (hasFalseUpcomingImageMismatch) {
      sanitizedFeedbackPoints = sanitizedFeedbackPoints.filter(pt =>
        !(/(ไม่สอดคล้องกับภาพ|ไม่ตรงกับภาพ|ไม่ตรงกับสิ่งที่เกิดขึ้นในภาพ)/.test(pt) &&
          /(study|leave|sleep|go|exam|work|read|meet|eat|drink|cook|drive|fifteen|minutes)/i.test(pt))
      );

      // If there are no other genuine syntax/grammar errors left:
      if (sanitizedFeedbackPoints.length === 0) {
        isCorrect = true;
        sanitizedFeedbackPoints = ['ประโยคถูกต้องตามโครงสร้างที่กำหนดและสอดคล้องกับภาพเรียบร้อยแล้วค่ะ เก่งมากเลยนะคะ'];
      }
    }
  }

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
    statusText: stripThaiExclamationMarks(sanitizeThaiStudentPronouns(isCorrect ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏' : (parsed.statusText || '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ'))),
    studentTranslation: cleanStudentTranslation(parsed.studentTranslation || '', req.studentAnswer),
    correctedSentence: finalCorrectedSentence,
    feedbackPoints: sanitizedFeedbackPoints,
    breakdown: cleanBreakdown,
    modelUsed: successfulModel
  };
}

/**
 * Strips exclamation marks from Thai text (e.g. "เก่งแล้วค่ะ!" -> "เก่งแล้วค่ะ").
 * In Thai language, exclamation marks are not used.
 */
function stripThaiExclamationMarks(text: string): string {
  if (!text) return '';
  return text
    .replace(/([ก-๙])\s*[!！]+/g, '$1')
    .replace(/(ค่ะ|นะคะ|เลยค่ะ|ครับ|นะครับ|จ้า|นะ)\s*[!！]+/g, '$1')
    .replace(/([ก-๙]+)\s*[!！]+$/g, '$1');
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

  return stripThaiExclamationMarks(result);
}

/**
 * Sanitizes and cleans feedback points to prevent hallucinated claims
 * and strip exclamation marks from Thai text.
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

    return stripThaiExclamationMarks(cleaned);
  });
}

/**
 * Sanitizes Thai pronouns to strictly use "นักเรียน" ONLY when Kru Whan addresses the user,
 * and NEVER replaces "คุณ" in general or the noun "ลูกค้า" (customer).
 */
function sanitizeThaiStudentPronouns(text: string): string {
  if (!text) return '';
  const sanitized = text
    .replace(/น้องๆ/g, 'นักเรียน')
    .replace(/น้อง/g, 'นักเรียน')
    .replace(/คุณลูกค้า/g, 'นักเรียน')
    .replace(/ประโยคของคุณ/g, 'ประโยคของนักเรียน')
    .replace(/คำตอบของคุณ/g, 'คำตอบของนักเรียน')
    .replace(/ข้อความของคุณ/g, 'ข้อความของนักเรียน')
    .replace(/การบ้านของคุณ/g, 'การบ้านของนักเรียน')
    .replace(/ของตัวคุณ/g, 'ของตัวนักเรียน')
    .replace(/ตัวคุณ/g, 'ตัวนักเรียน');
  return stripThaiExclamationMarks(sanitized);
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

  let localResult: EvaluationResult;
  if (req.exerciseType === 'translation') {
    localResult = evaluateTranslationLocally(req.item, lowerAnswer, cleanAnswer);
  } else if (req.exerciseType === 'guided_sentence') {
    localResult = evaluateGuidedSentenceLocally(req.item, lowerAnswer, cleanAnswer);
  } else {
    localResult = evaluatePictureDescriptionLocally(req.item, lowerAnswer, cleanAnswer);
  }

  return {
    ...localResult,
    statusText: stripThaiExclamationMarks(localResult.statusText),
    feedbackPoints: localResult.feedbackPoints?.map(pt => stripThaiExclamationMarks(pt)) || []
  };
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

  // 1. Strict Image Relevance Verification
  const relevance = checkImageRelevance(item, original);
  if (!relevance.isRelevant) {
    isCorrect = false;
    const topicText = relevance.topicThai ? `ที่เกี่ยวกับ${relevance.topicThai}` : 'ที่ปรากฏในภาพ';
    points.push(`• ในภาพเป็นเหตุการณ์${topicText}นะคะ แต่ประโยคที่นักเรียนแต่งยังไม่สอดคล้องกับสิ่งที่เกิดขึ้นในภาพค่ะ`);
    if (relevance.suggestedWords) {
      points.push(`• นักเรียนลองสังเกตภาพอีกครั้ง แล้วลองแต่งประโยคโดยเลือกใช้คำศัพท์ที่ตรงกับภาพ เช่น "${relevance.suggestedWords}" ดูนะคะ`);
    }
  }

  // Exact or near model answer match check (100% correct by definition)
  const normalizeForMatch = (s: string) => {
    let res = (s || '')
      .trim()
      .replace(/[.!?]+$/, '')
      .replace(/['’]/g, "'")
      .replace(/\s+/g, ' ')
      .toLowerCase();

    const numWordMap: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'twenty-five': '25',
      'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60'
    };

    for (const [word, digit] of Object.entries(numWordMap)) {
      const reg = new RegExp(`\\b${word}\\b`, 'g');
      res = res.replace(reg, digit);
    }
    return res;
  };

  const studentNorm = normalizeForMatch(original);
  const modelNorm = normalizeForMatch(item.model_answer);
  const isMatchModel = modelNorm.length > 0 && (
    studentNorm === modelNorm ||
    (Array.isArray(item.acceptable_answers) && item.acceptable_answers.some((ans: string) => normalizeForMatch(ans) === studentNorm))
  );

  if (isMatchModel) {
    const hasEndingPunc = /[.!?]$/.test(original.trim());
    if (hasEndingPunc) {
      return {
        isCorrect: true,
        statusText: 'ถูกต้องเลยค่ะ เก่งมากเลย 👏',
        correctedSentence: item.model_answer || original,
        feedbackPoints: ['• ประโยคถูกต้องตามโครงสร้างที่กำหนดและสอดคล้องกับภาพเรียบร้อยแล้วค่ะ เก่งมากเลยนะคะ'],
        breakdown: { core: true, context: true, connect: true }
      };
    } else {
      return {
        isCorrect: false,
        statusText: '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ',
        correctedSentence: item.model_answer || original,
        feedbackPoints: ['• อย่าลืมใส่เครื่องหมายจุด Full stop (.) ท้ายประโยคด้วยนะคะ'],
        breakdown: { core: true, context: true, connect: true }
      };
    }
  }

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

  // Nuance check: "be about to" is used for a time period equal to or less than 15 minutes
  const isAboutTo = /\b(about to)\b/i.test(normalizedLower);
  if (isAboutTo) {
    const isGreaterThan15Min = isTimeframeGreaterThan15Minutes(normalizedLower);

    if (isGreaterThan15Min) {
      isCorrect = false;
      points.push('• สำนวน "be about to + V" (กำลังจะ...ในอีกไม่ช้า) ใช้สำหรับช่วงเวลาสั้นๆ ที่เท่ากับหรือน้อยกว่า 15 นาที (equal to or less than 15 minutes หรือในอีกไม่กี่อึดใจ) เท่านั้นนะคะ หากเป็นช่วงเวลาที่เกินกว่า 15 นาที (เช่น in 20 minutes, in 30 minutes, in an hour) จะไม่สามารถใช้ "be about to" ได้ค่ะ แนะนำให้เปลี่ยนไปใช้ "be going to + V" หรือ "will + V" แทน หรือหากต้องการใช้ "be about to" ให้ปรับช่วงเวลาไม่เกิน 15 นาทีนะคะ');
      fixedSentence = fixedSentence.replace(/\babout to\b/gi, 'going to');
    }
  }

  // Nuance check: "used to ... but now I do that"
  if (/\bused to\b/i.test(normalizedLower) && /\bnow\s+(i|we|they|he|she)\s+do\s+that\b/i.test(normalizedLower)) {
    points.push('• คำแนะนำเพิ่มเติมเพื่อความเป็นธรรมชาติ: ท่อนหลังที่ว่า "now I do that" แม้จะสื่อสารเข้าใจได้ แต่เพื่อให้ประโยคสละสลวยเหมือนเจ้าของภาษา แนะนำให้ปรับเป็น "now I do it regularly" หรือ "now I still do so" จะฟังดูเป็นธรรมชาติกว่านะคะ');
    fixedSentence = fixedSentence.replace(/\bnow\s+i\s+do\s+that\b/gi, 'now I do it regularly');
  }

  const hasCore = /\b(i do|i am|he does|she does|i have|i will|he is|she is|i used to|used to|about to|be about to|they are|we are|it is)\b/i.test(normalizedLower);
  const hasContext = /\b(to\s+\w+|at|in|on|because|right now|with|for|before|after)\b/i.test(normalizedLower);
  const hasConnect = /\b(even when|because|when|although|so|but|however|to\s+\w+|and)\b/i.test(normalizedLower);

  if (relevance.isRelevant) {
    if (hasCore) {
      points.push('• โครงสร้าง Core (ประธาน + กริยาช่วย/กริยาหลัก) ถูกต้องค่ะ');
    } else {
      isCorrect = false;
      points.push('• ขาดโครงสร้าง Core (เช่น I do + กริยาไม่ผัน หรือ I am / He is / She is)');
    }

    if (hasContext) {
      points.push('• โครงสร้าง Context ถูกต้องค่ะ');
    } else {
      isCorrect = false;
      points.push('• ขาดโครงสร้าง Context (เช่น to + กริยาไม่ผัน หรือระบุสถานที่/เวลา)');
    }

    if (hasConnect) {
      points.push('• โครงสร้าง Connect ถูกต้องค่ะ');
    } else {
      isCorrect = false;
      points.push('• ขาดโครงสร้าง Connect (เช่น even when I\'m / because / but / to + กริยา)');
    }
  }

  const breakdown = {
    core: hasCore,
    context: hasContext,
    connect: hasConnect
  };

  return {
    isCorrect,
    statusText: isCorrect
      ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏'
      : (!relevance.isRelevant ? '💡 ประโยคยังไม่สอดคล้องกับภาพค่ะ' : '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ'),
    correctedSentence: item.model_answer || (fixedSentence.charAt(0).toUpperCase() + fixedSentence.slice(1)),
    feedbackPoints: points,
    breakdown
  };
}
