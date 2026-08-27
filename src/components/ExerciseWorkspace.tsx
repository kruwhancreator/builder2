'use client';

import { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ExternalLink,
  RefreshCw,
  GripHorizontal,
  RotateCcw,
  Sparkle
} from 'lucide-react';
import { EvaluationResult } from '@/lib/evaluator';
import { checkOfflineGrammarAndSpelling, checkGuidedSentenceExercise } from '@/lib/offline-checker';

interface ExerciseWorkspaceProps {
  chapter: string;
  chapterData: any;
}

export default function ExerciseWorkspace({ chapter, chapterData }: ExerciseWorkspaceProps) {
  // State per question item: answers, feedback, solution visibility, loading state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, { isCorrect: boolean; message: string; points: string[]; translation?: string; studentTranslation?: string }>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [dragSlots, setDragSlots] = useState<Record<string, string[]>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const toggleRevealSolution = (key: string) => {
    setRevealedSolutions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const unitNumber = chapterData.chapter || chapterData.unit_number || 1;

  // Extract exercise categories dynamically for guided_sentence
  const getExerciseCategories = (exercise: any) => {
    if (!exercise) return [];
    if (Array.isArray(exercise.categories) && exercise.categories.length > 0) {
      return exercise.categories.map((c: any, idx: number) => ({
        order: c.order || idx + 1,
        name: c.name || c.category_name || `หมวดที่ ${c.order || idx + 1}`,
        words: (c.words || c.word_bank || []).map((w: any) => typeof w === 'string' ? { en: w, th: '' } : { en: w.en || '', th: w.th || '' })
      }));
    }
    if (exercise.word_bank) {
      return Object.entries(exercise.word_bank).map(([catKey, words]: [string, any], idx: number) => ({
        order: idx + 1,
        name: catKey === 'action' ? 'กำลังทำอะไร' : catKey === 'purpose' ? 'เพื่ออะไร (to...)' : catKey === 'time' ? 'เมื่อไหร่' : catKey === 'reason' ? 'เพราะอะไร (because...)' : catKey,
        words: (Array.isArray(words) ? words : []).map((w: any) => typeof w === 'string' ? { en: w, th: '' } : { en: w.en || '', th: w.th || '' })
      }));
    }
    return [];
  };

  // Convert exercises into an ordered list respecting order_index or natural order
  const rawExercises = chapterData.exercises || {};
  const exercisesList: any[] = (Array.isArray(rawExercises) ? rawExercises : Object.entries(rawExercises).map(([code, ex]: [string, any]) => ({
    ...ex,
    code: ex.code || code,
    id: ex.id || code
  }))).sort((a: any, b: any) => {
    const orderA = typeof a.order_index === 'number' ? a.order_index : (parseInt((a.code || '').replace(/\D/g, ''), 10) || 99);
    const orderB = typeof b.order_index === 'number' ? b.order_index : (parseInt((b.code || '').replace(/\D/g, ''), 10) || 99);
    if (orderA !== orderB) return orderA - orderB;
    return (a.code || '').localeCompare(b.code || '');
  });

  const handleAnswerChange = (key: string, text: string) => {
    setAnswers(prev => ({ ...prev, [key]: text }));
  };

  // Reconstruct sentence from prompt static segments and placed slot words
  const reconstructSentence = (parts: string[], slots: string[]) => {
    let res = '';
    for (let i = 0; i < parts.length; i++) {
      res += parts[i];
      if (i < slots.length && slots[i]) {
        const slotVal = slots[i].trim();
        if (res.length > 0 && !res.endsWith(' ') && !slotVal.startsWith(' ')) {
          res += ' ';
        }
        res += slotVal;
      }
    }
    let finalStr = res.replace(/\s+/g, ' ').trim();
    if (finalStr && !finalStr.endsWith('.') && !finalStr.endsWith('?') && !finalStr.endsWith('!')) {
      finalStr += '.';
    }
    return finalStr;
  };

  const handleSlotInputChange = (key: string, parts: string[], slotIdx: number, val: string, totalSlots: number) => {
    const cur = [...(dragSlots[key] || Array(totalSlots).fill(''))];
    while (cur.length < totalSlots) cur.push('');
    cur[slotIdx] = val;
    setDragSlots(prev => ({ ...prev, [key]: cur }));
    const sentence = reconstructSentence(parts, cur);
    setAnswers(prev => ({ ...prev, [key]: sentence }));
  };

  const handleResetSlots = (key: string) => {
    setDragSlots(prev => ({ ...prev, [key]: [] }));
    setAnswers(prev => ({ ...prev, [key]: '' }));
  };

  // SMART OFFLINE GRAMMAR & SPELL CHECKER (NO AI CALL, 0ms LATENCY)
  const handleOfflineCheck = (item: any, key: string, exerciseType: string, categories?: any[]) => {
    const studentAns = answers[key] || '';
    const result = exerciseType === 'guided_sentence'
      ? checkGuidedSentenceExercise(item, studentAns, categories || [])
      : checkOfflineGrammarAndSpelling(item, studentAns, 'translation');

    setFeedbacks(prev => ({
      ...prev,
      [key]: {
        isCorrect: result.isCorrect,
        message: result.message,
        points: result.points,
        translation: result.translation
      }
    }));
  };

  // Handle AI Check (for picture_description or any exercise with use_ai_check)
  const handleAiCheck = async (item: any, key: string, idx: number, exercise: any) => {
    const studentAns = answers[key] || '';
    if (!studentAns.trim()) {
      setFeedbacks(prev => ({
        ...prev,
        [key]: {
          isCorrect: false,
          message: '❌ กรุณาพิมพ์คำตอบภาษาอังกฤษก่อนกดตรวจค่ะ',
          points: ['ยังไม่ได้พิมพ์คำตอบในช่องข้อความ']
        }
      }));
      return;
    }

    setAiLoading(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: exercise.type || 'picture_description',
          item: {
            ...item,
            image_description: item.image_description || '',
            context_hint: item.context_hint || '',
            teacher_guidance: item.teacher_guidance || item.context_hint || exercise?.guidance || exercise?.instruction || '',
            model_answer: item.model_answer || ''
          },
          studentAnswer: studentAns
        })
      });

      const data: EvaluationResult = await res.json();

      const isCorrect = typeof data.isCorrect === 'boolean'
        ? data.isCorrect
        : (data.score ? data.score >= 95 : false);

      const points: string[] = [];

      if (data.feedbackPoints && data.feedbackPoints.length > 0) {
        points.push(...data.feedbackPoints.map(p => `• ${p}`));
      }

      if (data.correctedSentence && data.correctedSentence.trim() !== studentAns.trim()) {
        points.push(`✨ ประโยคตัวอย่างที่แนะนำ: "${data.correctedSentence}"`);
      }

      const finalMessage = isCorrect
        ? 'ถูกต้องเลยค่ะ เก่งมากเลย 👏'
        : (data.statusText || '💡 โครงสร้างประโยคยังไม่สมบูรณ์ค่ะ');

      setFeedbacks(prev => ({
        ...prev,
        [key]: {
          isCorrect,
          message: finalMessage,
          studentTranslation: data.studentTranslation || '',
          points: points.length > 0 ? points : ['ประโยคถูกต้องตามโครงสร้างที่กำหนดค่ะ']
        }
      }));
    } catch (err) {
      console.error('AI check error:', err);
      // Fallback local check
      const raw = studentAns.trim();
      const hasUpper = /^[A-Z]/.test(raw);
      const hasPeriod = raw.endsWith('.');
      const hasIng = /\b\w+ing\b/i.test(raw);

      const points: string[] = [];
      if (!hasUpper) points.push('• ตัวแรกของประโยคต้องเป็นตัวพิมพ์ใหญ่');
      if (!hasPeriod) points.push('• อย่าลืมใส่จุด Full stop (.) ท้ายประโยค');
      if (!hasIng) points.push('• ต้องใช้คำกริยาเติม -ing (Present Continuous)');

      setFeedbacks(prev => ({
        ...prev,
        [key]: {
          isCorrect: points.length === 0,
          message: points.length === 0 
            ? '🎉 ตรวจสอบเบื้องต้นถูกต้องค่ะ!' 
            : '⚡ คำแนะนำเบื้องต้น:',
          points: points.length > 0 ? points : ['ประโยคมีโครงสร้างไวยากรณ์ถูกต้อง']
        }
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="workspace-main-container max-w-4xl mx-auto px-2 sm:px-4 py-6 font-sans">
      {/* ========================================================= */}
      {/* 1. UNIT HERO BANNER (UNIT DETAIL SECTION) */}
      {/* ========================================================= */}
      <section className="unit-hero-banner bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-md relative overflow-hidden">
        <p className="unit-hero-heading text-sm sm:text-base opacity-90 leading-relaxed font-medium mb-1.5">
          เฉลยแบบฝึกหัด Unit {unitNumber}
        </p>

        {chapterData.title && (
          <h1 className="unit-hero-title text-2xl sm:text-3xl font-extrabold font-heading mb-1.5">
            {chapterData.title}
          </h1>
        )}

        {chapterData.subtitle && (
          <h2 className="unit-hero-subtitle text-xl sm:text-2xl font-bold opacity-95 leading-relaxed font-heading">
            {chapterData.subtitle}
          </h2>
        )}
      </section>

      {/* ========================================================= */}
      {/* DYNAMIC EXERCISES LIST (IN CUSTOM CONFIGURED ORDER) */}
      {/* ========================================================= */}
      {exercisesList.map((exercise: any, exIdx: number) => {
        const exType = exercise.type || 'translation';
        const exKeyPrefix = exercise.code || `ex_${exIdx + 1}`;
        const exCategories = getExerciseCategories(exercise);

        // ==========================================
        // TYPE A: TRANSLATION / FIX ANSWER
        // ==========================================
        if (exType === 'translation') {
          return (
            <section key={exKeyPrefix} className="exercise-section exercise-translation-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
              <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
                <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
                  ✏️ {exercise.title || `Exercise ${exIdx + 1}: แปลประโยคภาษาอังกฤษ`}
                </h2>
                <div className="exercise-instruction-box bg-gradient-to-r from-rose-50 via-red-50/70 to-rose-50/40 text-rose-950 p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm mt-3 border border-rose-200/80 border-l-4 border-l-rose-500 shadow-2xs leading-relaxed">
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-white/90 border border-rose-200 px-2 py-0.5 rounded-md mr-1.5 shadow-2xs">
                    📌 คำแนะนำจากครูหวาน:
                  </span>
                  <span className="font-medium text-rose-900">
                    {exercise.instruction || exercise.guidance || `โปรดใช้คำศัพท์จาก Unit ${unitNumber} ในหนังสือ Sentence Builder 2 ในการตอบนะคะ ระบบจะตรวจคำตอบแบบเป๊ะๆ (รวมถึงการพิมพ์ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และจุด Full Stop . ด้านหลังด้วยน้า)`}
                  </span>
                </div>
              </div>

              <div className="quiz-items-list space-y-6">
                {exercise.items?.map((item: any, idx: number) => {
                  const key = `${exKeyPrefix}_${item.id || idx + 1}`;
                  const fb = feedbacks[key];

                  return (
                    <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                      <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3.5 font-heading">
                        {idx + 1}. {item.thai || item.thai_prompt}
                      </div>

                      <div className="quiz-input-wrapper mb-3">
                        <input
                          type="text"
                          value={answers[key] || ''}
                          onChange={(e) => handleAnswerChange(key, e.target.value)}
                          placeholder="พิมพ์ประโยคภาษาอังกฤษที่นี่..."
                          autoComplete="off"
                          className="quiz-answer-input w-full px-3.5 py-2.5 text-sm sm:text-base text-slate-900 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                        />
                      </div>

                      <div className="quiz-action-group flex flex-wrap items-center gap-2.5 mb-3">
                        <button
                          onClick={() => handleOfflineCheck(item, key, 'translation')}
                          className="btn-check-answer bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          🔍 ตรวจคำตอบ
                        </button>
                        {item.model_answer && (
                          <button
                            type="button"
                            onClick={() => toggleRevealSolution(key)}
                            className="btn-reveal-solution inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูเฉลย'}
                          </button>
                        )}
                      </div>

                      {/* Feedback Box */}
                      {fb && (
                        <div className={`feedback-result-box p-3.5 rounded-xl text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
                          fb.isCorrect 
                            ? 'feedback-correct bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                            : 'feedback-incorrect bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}>
                          <div className="feedback-message-title font-bold flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                            {fb.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{fb.message}</span>
                          </div>

                          {fb.points && fb.points.length > 0 && (
                            <ul className="feedback-points-list space-y-1 mt-1.5 pl-1">
                              {fb.points.map((pt, pIdx) => (
                                <li key={pIdx} className="feedback-point-item font-medium text-xs sm:text-sm leading-relaxed">
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* 💡 เฉลย Box */}
                      {revealedSolutions[key] && item.model_answer && (
                        <div className="solution-actual-answer-box mb-3 p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-[#1e40af] text-xs sm:text-sm animate-in fade-in duration-200">
                          <span className="font-bold block mb-1 text-slate-700">เฉลยคำตอบที่ถูกต้อง:</span>
                          <div className="font-mono font-bold bg-white px-3 py-2 rounded-lg border border-[#bfdbfe] text-[#1e3a8a] text-sm sm:text-base">
                            {item.model_answer}
                          </div>
                          {(item.thai || item.thai_prompt) && (
                            <div className="text-xs sm:text-sm font-medium text-emerald-800 mt-2 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                              <span className="font-bold text-emerald-950">📖 คำแปลโจทย์:</span>
                              <span>"{item.thai || item.thai_prompt}"</span>
                            </div>
                          )}
                          {item.acceptable_answers && item.acceptable_answers.length > 1 && (
                            <div className="mt-2 space-y-1">
                              <span className="text-xs font-semibold text-slate-500 block">คำตอบอื่นที่ใช้ได้:</span>
                              {item.acceptable_answers.filter((ans: string) => ans !== item.model_answer).map((ans: string, aIdx: number) => (
                                <div key={aIdx} className="font-mono bg-white/80 px-2.5 py-1 rounded border border-[#bfdbfe] text-slate-700 text-xs">
                                  • {ans}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        // ==========================================
        // TYPE B: GUIDED SENTENCE / CHOOSE PROVIDED WORD
        // ==========================================
        if (exType === 'guided_sentence') {
          return (
            <section key={exKeyPrefix} className="exercise-section exercise-guided-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
              <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
                <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
                  🧩 {exercise.title || `Exercise ${exIdx + 1}: เลือกคำจากตารางมาแต่งประโยค`}
                </h2>
                <div className="exercise-instruction-box bg-gradient-to-r from-rose-50 via-red-50/70 to-rose-50/40 text-rose-950 p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm mt-3 border border-rose-200/80 border-l-4 border-l-rose-500 shadow-2xs leading-relaxed">
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-white/90 border border-rose-200 px-2 py-0.5 rounded-md mr-1.5 shadow-2xs">
                    📌 คำแนะนำจากครูหวาน:
                  </span>
                  <span className="font-medium text-rose-900">
                    {exercise.instruction || exercise.guidance || `ให้เลือกคำจากตารางด้านล่างนี้ในหนังสือ Sentence Builder 2 มาเติมในช่องว่างให้สมบูรณ์ ตรวจเช็คการสะกดคำและเครื่องหมายให้ถูกต้องนะคะ`}
                  </span>
                </div>
              </div>

              <div className="quiz-items-list space-y-6">
                {exercise.items?.map((item: any, idx: number) => {
                  const key = `${exKeyPrefix}_${item.id || idx + 1}`;
                  const fb = feedbacks[key];
                  const blankRegex = /_{2,}/g;
                  const promptParts = (item.prompt || '').split(blankRegex);
                  const slotCount = Math.max(1, (item.prompt || '').match(blankRegex)?.length || 1);
                  const rawOrders: number[] = Array.isArray(item.required_orders) && item.required_orders.length > 0
                    ? item.required_orders
                    : [1];
                  const requiredOrders: number[] = rawOrders.slice(0, slotCount);
                  const currentSlots = dragSlots[key] || Array(slotCount).fill('');
                  const currentConstructed = answers[key] || '';

                  // Visible categories strictly for the active slots in this item
                  const visibleCategories = requiredOrders
                    .map(ord => exCategories.find((cat: any) => cat.order === ord))
                    .filter(Boolean) as typeof exCategories;

                  return (
                    <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                      {/* 1. Question Number Header */}
                      <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3 font-heading flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-100 text-[#1e3a8a] inline-flex items-center justify-center text-sm font-bold shadow-2xs">
                          {idx + 1}
                        </span>
                        <span>ข้อที่ {idx + 1}</span>
                      </div>

                      {/* 2. Fill-in-the-blank Typing Sentence Builder (No Word Bank) */}
                      <div className="sentence-builder-card bg-white border border-blue-200 rounded-2xl p-5 mb-4 shadow-2xs">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                          <span>✍️</span>
                          <span>พิมพ์เติมคำในช่องว่าง (Fill in the blanks):</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold text-slate-900 leading-loose">
                          {promptParts.map((part: string, pIdx: number) => {
                            const currentVal = currentSlots[pIdx] || '';
                            const slotOrder = requiredOrders[pIdx] ?? (pIdx + 1);
                            const targetCat = exCategories.find((c: any) => c.order === slotOrder);
                            const placeholderText = targetCat?.name ? `(${targetCat.name})` : `(ช่องที่ ${pIdx + 1})`;
                            const baseWidth = Math.max(140, (placeholderText.length + 4) * 10);
                            const dynamicWidth = Math.max(baseWidth, (currentVal.length + 3) * 11);

                            return (
                              <div key={pIdx} className="inline-flex items-center gap-2 flex-wrap">
                                {part && <span className="font-mono text-[#1e3a8a]">{part}</span>}
                                {pIdx < slotCount && (
                                  <input
                                    type="text"
                                    value={currentVal}
                                    onChange={(e) => handleSlotInputChange(key, promptParts, pIdx, e.target.value, slotCount)}
                                    placeholder={placeholderText}
                                    style={{ width: `${dynamicWidth}px`, minWidth: `${baseWidth}px` }}
                                    className="inline-block px-3 py-1.5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 focus:bg-white text-sm sm:text-base font-bold text-[#1e3a8a] text-center outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono shadow-2xs placeholder:text-blue-400/80 placeholder:font-sans placeholder:text-xs sm:placeholder:text-sm placeholder:font-semibold"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Constructed Sentence Preview */}
                        {currentConstructed && (
                          <div className="constructed-preview mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">
                              ประโยคของคุณ:
                            </span>
                            <span className="font-mono text-xs sm:text-sm font-bold text-[#1e3a8a] break-all bg-blue-50/60 px-3 py-1.5 rounded-xl border border-blue-200/60 flex-1">
                              {currentConstructed}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 4. Action Buttons */}
                      <div className="quiz-action-group flex flex-wrap items-center gap-2.5 mb-3">
                        <button
                          onClick={() => handleOfflineCheck(item, key, 'guided_sentence', exCategories)}
                          className="btn-check-answer bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          🔍 ตรวจคำตอบ
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRevealSolution(key)}
                          className="btn-reveal-solution inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                        >
                          💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูเฉลยคำตอบที่เป็นไปได้'}
                        </button>
                      </div>

                      {/* 5. Feedback Box */}
                      {fb && (
                        <div className={`feedback-result-box p-3.5 rounded-xl text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
                          fb.isCorrect 
                            ? 'feedback-correct bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                            : 'feedback-incorrect bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}>
                          <div className="feedback-message-title font-bold flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                            {fb.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{fb.message}</span>
                          </div>

                          {/* 📖 คำแปลประโยคภาษาไทย */}
                          {fb.translation && (
                            <div className="feedback-thai-translation my-2 p-2.5 bg-white/90 rounded-lg border border-emerald-200 text-xs sm:text-sm text-emerald-950 font-medium flex items-center gap-1.5 shadow-2xs">
                              <span className="font-bold text-emerald-900 shrink-0">📖 คำแปล:</span>
                              <span>"{fb.translation}"</span>
                            </div>
                          )}

                          {fb.points && fb.points.length > 0 && (
                            <ul className="feedback-points-list space-y-1 mt-1.5 pl-1">
                              {fb.points.map((pt, pIdx) => (
                                <li key={pIdx} className="feedback-point-item font-medium text-xs sm:text-sm leading-relaxed">
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* 6. 💡 ดูเฉลยคำตอบที่เป็นไปได้ (Revealed Solution Matrix) */}
                      {revealedSolutions[key] &&
                        (() => {
                          const maxRows = Math.max(1, ...exCategories.map((c: any) => (c.words || []).length));
                          const possibleSentences: Array<{ en: string; th: string }> = [];
                          const seenEn = new Set<string>();

                          for (let r = 0; r < maxRows; r++) {
                            const chosenWords: string[] = [];
                            const chosenTh: Record<number, string> = {};

                            for (const ord of requiredOrders) {
                              const cat = exCategories.find((c: any) => c.order === ord);
                              const w = cat?.words[r];
                              if (w && w.en) {
                                chosenWords.push(w.en);
                                chosenTh[ord] = w.th || w.en;
                              }
                            }

                            if (chosenWords.length === slotCount) {
                              let s = '';
                              promptParts.forEach((part: string, pIdx: number) => {
                                s += part;
                                if (pIdx < chosenWords.length) {
                                  s += chosenWords[pIdx];
                                }
                              });
                              const cleanSentence = s.replace(/\s+/g, ' ').trim();
                              const normalizedKey = cleanSentence.toLowerCase();

                              if (!seenEn.has(normalizedKey)) {
                                seenEn.add(normalizedKey);

                                let thSent = '';
                                if (item.thai_template) {
                                  let tpl = item.thai_template;
                                  for (const ord of requiredOrders) {
                                    if (chosenTh[ord]) {
                                      tpl = tpl.replace(new RegExp(`\\{${ord}\\}`, 'g'), chosenTh[ord]);
                                    }
                                  }
                                  thSent = tpl;
                                } else {
                                  thSent = requiredOrders.map(ord => chosenTh[ord] || '').filter(Boolean).join(' ');
                                }

                                possibleSentences.push({ en: cleanSentence, th: thSent });
                              }
                            }
                          }

                          return (
                            <div className="possible-solutions-box mb-3 p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-xs sm:text-sm animate-in fade-in duration-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-[#1e3a8a]">
                                  💡 ตัวอย่างคำตอบที่ถูกต้อง ({possibleSentences.length} รูปแบบ):
                                </span>
                                <span className="text-[11px] text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full font-medium">
                                  เลือกตอบแบบใดก็ได้
                                </span>
                              </div>
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {possibleSentences.map((ans, aIdx) => (
                                  <div key={aIdx} className="bg-white p-2.5 rounded-lg border border-[#bfdbfe] shadow-2xs space-y-1">
                                    <div className="font-mono font-bold text-[#1e3a8a]">
                                      • {ans.en}
                                    </div>
                                    {ans.th && (
                                      <div className="text-emerald-800 text-xs font-medium pl-3 flex items-center gap-1">
                                        <span>📖</span>
                                        <span>{ans.th}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        // ==========================================
        // TYPE C: PICTURE DESCRIPTION
        // ==========================================
        if (exType === 'picture_description') {
          return (
            <section key={exKeyPrefix} className="exercise-section exercise-picture-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
              <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
                <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
                  🖼️ {exercise.title || `Exercise ${exIdx + 1}: ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect`}
                </h2>
                <div className="exercise-instruction-box bg-gradient-to-r from-rose-50 via-red-50/70 to-rose-50/40 text-rose-950 p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm mt-3 border border-rose-200/80 border-l-4 border-l-rose-500 shadow-2xs leading-relaxed">
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-white/90 border border-rose-200 px-2 py-0.5 rounded-md mr-1.5 shadow-2xs">
                    📌 คำแนะนำจากครูหวาน:
                  </span>
                  <span className="font-medium text-rose-900">
                    {exercise.instruction || exercise.guidance || `แบบฝึกหัดนี้ใช้จินตนาการแต่งประโยคจากภาพได้เลยนะคะ ไม่มีถูกไม่มีผิด! ลองแต่งประโยคตามโครงสร้าง 3 กล่องด้านล่างได้เลยค่ะ`}
                  </span>
                </div>
              </div>

              <div className="quiz-items-list space-y-6 mt-6">
                {exercise.items?.map((item: any, idx: number) => {
                  const key = `${exKeyPrefix}_${item.id || idx + 1}`;
                  const fb = feedbacks[key];
                  const isLoading = aiLoading[key];

                  return (
                    <div key={key} className="quiz-item-card flex flex-col bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                      <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3 font-heading">
                        ภาพที่ {idx + 1} :
                      </div>

                      {/* Render uploaded image if available */}
                      {item.image_url && (
                        <div className="quiz-image-preview self-center w-full mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xs max-w-md">
                          <img
                            src={item.image_url}
                            alt={`ภาพที่ ${idx + 1}`}
                            className="w-full h-auto max-h-72 object-contain rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="quiz-input-wrapper mb-3">
                        <input
                          type="text"
                          value={answers[key] || ''}
                          onChange={(e) => handleAnswerChange(key, e.target.value)}
                          placeholder={`แต่งประโยคจากภาพที่ ${idx + 1} ที่นี่...`}
                          autoComplete="off"
                          className="quiz-answer-input w-full px-3.5 py-2.5 text-sm sm:text-base text-slate-900 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                        />
                      </div>

                      <div className="quiz-action-group flex flex-wrap items-center gap-2.5 mb-3">
                        <button
                          onClick={() => handleAiCheck(item, key, idx, exercise)}
                          disabled={isLoading}
                          className="btn-ai-check bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>กำลัง AI ตรวจทาน...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>✨ ตรวจสอบประโยคของฉัน</span>
                            </>
                          )}
                        </button>
                        {item.model_answer && (
                          <button
                            type="button"
                            onClick={() => toggleRevealSolution(key)}
                            className="btn-reveal-solution inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูตัวอย่างประโยคเฉลย'}
                          </button>
                        )}
                      </div>

                      {/* Feedback Box */}
                      {fb && (
                        <div className={`feedback-result-box p-3.5 rounded-xl text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
                          fb.isCorrect 
                            ? 'feedback-correct bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                            : 'feedback-incorrect bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}>
                          <div className="feedback-message-title font-bold flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                            {fb.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{fb.message}</span>
                          </div>

                          {/* 📖 คำแปลประโยคของนักเรียน */}
                          {fb.studentTranslation && (
                            <div className="feedback-student-translation my-2 p-2.5 bg-white/95 rounded-lg border border-slate-200 text-xs sm:text-sm">
                              <span className="font-bold text-slate-800">📖 คำแปลประโยคของคุณ:</span>
                              <span className="ml-1.5 text-slate-700 font-medium">"{fb.studentTranslation}"</span>
                            </div>
                          )}

                          {fb.points && fb.points.length > 0 && (
                            <ul className="feedback-points-list space-y-1.5 mt-2 pl-0.5">
                              {fb.points.map((pt, pIdx) => {
                                const cleanPt = pt.replace(/^[\s•\-\*]+/, '').trim();
                                return (
                                  <li key={pIdx} className="feedback-point-item font-medium text-xs sm:text-sm leading-relaxed flex items-start gap-2">
                                    <span className="text-blue-600 font-bold shrink-0">•</span>
                                    <span>{cleanPt}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* 💡 ดูเฉลยตัวอย่าง Box */}
                      {revealedSolutions[key] && item.model_answer && (
                        <div className="solution-actual-answer-box mb-3 p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-[#1e40af] text-xs sm:text-sm animate-in fade-in duration-200">
                          <span className="font-bold block mb-1 text-slate-700">ตัวอย่างประโยคที่ถูกต้อง:</span>
                          <div className="font-mono font-bold bg-white px-3 py-2 rounded-lg border border-[#bfdbfe] text-[#1e3a8a] text-sm sm:text-base">
                            {item.model_answer}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}

/**
 * DropSlot Component for Drag & Drop Sentence Builder
 */
function DropSlot({
  slotIdx,
  value,
  categoryHint,
  onPlace,
  onRemove
}: {
  slotIdx: number;
  value?: string;
  categoryHint?: string;
  onPlace: (word: string) => void;
  onRemove: () => void;
}) {
  const [isOver, setIsOver] = useState(false);

  if (value) {
    return (
      <span
        onClick={onRemove}
        title="คลิกเพื่อนำคำนี้ออก"
        className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm sm:text-base font-bold shadow-xs cursor-pointer hover:from-rose-500 hover:to-red-600 transition-all select-none group"
      >
        <span>{value}</span>
        <span className="text-white/80 group-hover:text-white text-xs font-mono ml-0.5">✕</span>
      </span>
    );
  }

  return (
    <span
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const word = e.dataTransfer.getData('text/plain');
        if (word) onPlace(word);
      }}
      className={`inline-flex items-center justify-center min-w-[130px] px-3.5 py-1 border-2 border-dashed rounded-xl text-xs sm:text-sm font-semibold transition-all select-none ${
        isOver
          ? 'border-[#2563eb] bg-blue-100 text-[#2563eb] scale-105 shadow-xs'
          : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 cursor-pointer'
      }`}
    >
      {categoryHint ? `(${categoryHint})` : '(เลือกคำศัพท์)'}
    </span>
  );
}


