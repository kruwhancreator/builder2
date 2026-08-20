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
  const [feedbacks, setFeedbacks] = useState<Record<string, { isCorrect: boolean; message: string; points: string[]; translation?: string }>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [dragSlots, setDragSlots] = useState<Record<string, string[]>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const toggleRevealSolution = (key: string) => {
    setRevealedSolutions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const unitNumber = chapterData.chapter || chapterData.unit_number || 1;
  const ex1 = chapterData.exercises?.['ex-1'];
  const ex2 = chapterData.exercises?.['ex-2'];
  const ex3 = chapterData.exercises?.['ex-3'];

  // Normalize categories for Exercise 2
  const ex2Categories: Array<{ order: number; name: string; words: Array<{ en: string; th?: string }> }> = ex2
    ? Array.isArray(ex2.categories)
      ? ex2.categories.map((c: any, idx: number) => ({
          order: c.order || idx + 1,
          name: c.name || c.category_name || `หมวดที่ ${idx + 1}`,
          words: (c.words || c.word_bank || []).map((w: any) => typeof w === 'string' ? { en: w, th: '' } : { en: w.en || '', th: w.th || '' })
        }))
      : ex2.word_bank
        ? Object.entries(ex2.word_bank).map(([catKey, words]: [string, any], idx: number) => ({
            order: idx + 1,
            name: catKey === 'action' ? 'กำลังทำอะไร' : catKey === 'purpose' ? 'เพื่ออะไร (to...)' : catKey === 'time' ? 'เมื่อไหร่' : catKey === 'reason' ? 'เพราะอะไร (because...)' : catKey,
            words: (Array.isArray(words) ? words : []).map((w: any) => typeof w === 'string' ? { en: w, th: '' } : { en: w.en || '', th: w.th || '' })
          }))
        : []
    : [];

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

  const handlePlaceSlotWord = (key: string, parts: string[], slotIdx: number, word: string, totalSlots: number) => {
    const cur = [...(dragSlots[key] || Array(totalSlots).fill(''))];
    cur[slotIdx] = word;
    setDragSlots(prev => ({ ...prev, [key]: cur }));
    const sentence = reconstructSentence(parts, cur);
    setAnswers(prev => ({ ...prev, [key]: sentence }));
  };

  const handleAutoPlaceWord = (key: string, parts: string[], word: string, totalSlots: number, targetSlotIdx?: number) => {
    const cur = [...(dragSlots[key] || Array(totalSlots).fill(''))];
    const existingIdx = cur.indexOf(word);
    if (existingIdx !== -1) {
      cur[existingIdx] = '';
    } else {
      let putIdx = targetSlotIdx !== undefined && targetSlotIdx < totalSlots ? targetSlotIdx : -1;
      if (putIdx === -1 || cur[putIdx]) {
        putIdx = cur.findIndex(s => !s);
      }
      if (putIdx === -1) putIdx = 0;
      cur[putIdx] = word;
    }
    setDragSlots(prev => ({ ...prev, [key]: cur }));
    const sentence = reconstructSentence(parts, cur);
    setAnswers(prev => ({ ...prev, [key]: sentence }));
  };

  const handleRemoveSlotWord = (key: string, parts: string[], slotIdx: number, totalSlots: number) => {
    const cur = [...(dragSlots[key] || Array(totalSlots).fill(''))];
    cur[slotIdx] = '';
    setDragSlots(prev => ({ ...prev, [key]: cur }));
    const sentence = reconstructSentence(parts, cur);
    setAnswers(prev => ({ ...prev, [key]: sentence }));
  };

  const handleResetSlots = (key: string) => {
    setDragSlots(prev => ({ ...prev, [key]: [] }));
    setAnswers(prev => ({ ...prev, [key]: '' }));
  };

  // SMART OFFLINE GRAMMAR & SPELL CHECKER (NO AI CALL, 0ms LATENCY)
  const handleOfflineCheck = (item: any, key: string, exType: 'ex-1' | 'ex-2') => {
    const studentAns = answers[key] || '';
    const result = exType === 'ex-2'
      ? checkGuidedSentenceExercise(item, studentAns, ex2Categories)
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

  // Handle AI Check (Ex 3)
  const handleAiCheck = async (item: any, key: string, idx: number) => {
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
          exerciseType: 'picture_description',
          item: {
            ...item,
            image_description: item.image_description,
            context_hint: item.context_hint,
            teacher_guidance: item.teacher_guidance || ex3?.guidance || '',
            model_answer: item.model_answer
          },
          studentAnswer: studentAns
        })
      });

      const data: EvaluationResult = await res.json();

      const isScoreGood = data.score >= 80;
      const points: string[] = [];

      if (data.feedbackPoints && data.feedbackPoints.length > 0) {
        points.push(...data.feedbackPoints.map(p => `• ${p}`));
      }

      if (data.correctedSentence && data.correctedSentence.trim() !== studentAns.trim()) {
        points.push(`✨ ประโยคตัวอย่างที่แนะนำ: "${data.correctedSentence}"`);
      }

      // Clean any percentage format if present from status text
      const cleanStatus = (data.statusText || (isScoreGood ? 'ยอดเยี่ยมมากค่ะ! ประโยคถูกต้องตามโครงสร้าง 👏' : 'เกือบสมบูรณ์แล้วค่ะ ลองปรับตามคำแนะนำดูนะคะ'))
        .replace(/\s*\(\d+%\)/g, '');

      setFeedbacks(prev => ({
        ...prev,
        [key]: {
          isCorrect: isScoreGood,
          message: cleanStatus,
          points: points.length > 0 ? points : ['ประโยคถูกต้องตามโครงสร้างที่กำหนด']
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
        {/* Unit Heading: เฉลยแบบฝึกหัด Unit X (using subtitle style: smaller than title and subtitle) */}
        <p className="unit-hero-heading text-sm sm:text-base opacity-90 leading-relaxed font-medium mb-1.5">
          เฉลยแบบฝึกหัด Unit {unitNumber}
        </p>

        {/* Unit Title: units.title (using current heading style: text-2xl sm:text-3xl font-extrabold) */}
        {chapterData.title && (
          <h1 className="unit-hero-title text-2xl sm:text-3xl font-extrabold font-heading mb-1.5">
            {chapterData.title}
          </h1>
        )}

        {/* Unit Subtitle: units.subtitle (using current title style: text-xl sm:text-2xl font-bold) */}
        {chapterData.subtitle && (
          <h2 className="unit-hero-subtitle text-xl sm:text-2xl font-bold opacity-95 leading-relaxed font-heading">
            {chapterData.subtitle}
          </h2>
        )}
      </section>

      {/* ========================================================= */}
      {/* 2. EXERCISE 1 SECTION */}
      {/* ========================================================= */}
      {ex1 && (
        <section className="exercise-section exercise-1-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
              ✏️ {ex1.title || 'Exercise 1: แปลประโยคภาษาอังกฤษ'}
            </h2>
            <div className="exercise-instruction-box bg-[#eff6ff] text-[#1e40af] p-3 rounded-lg text-xs sm:text-sm mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex1.instruction || ex1.guidance || `โปรดใช้คำศัพท์จาก Unit ${unitNumber} ในหนังสือ Sentence Builder 2 ในการตอบนะคะ ระบบจะตรวจคำตอบแบบเป๊ะๆ (รวมถึงการพิมพ์ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และจุด Full Stop . ด้านหลังด้วยน้า)`}
            </div>
          </div>

          <div className="quiz-items-list space-y-6">
            {ex1.items?.map((item: any, idx: number) => {
              const key = `ex1_${item.id || idx + 1}`;
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

                  <div className="quiz-action-group flex flex-wrap gap-2.5 mb-3">
                    <button
                      onClick={() => handleOfflineCheck(item, key, 'ex-1')}
                      className="btn-check-answer bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      🔍 ตรวจคำตอบ
                    </button>
                  </div>

                  {/* Feedback Box */}
                  {fb && (
                    <>
                      <div className={`feedback-result-box p-3.5 rounded-lg text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
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

                      {/* 🔎 ดูเฉลย Button (shown below incorrect feedback) */}
                      {!fb.isCorrect && item.model_answer && (
                        <div className="reveal-solution-section mb-3">
                          <button
                            type="button"
                            onClick={() => toggleRevealSolution(key)}
                            className="btn-reveal-solution inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูเฉลย'}
                          </button>

                          {revealedSolutions[key] && (
                            <div className="solution-actual-answer-box mt-2.5 p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-[#1e40af] text-xs sm:text-sm animate-in fade-in duration-200">
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
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 4. EXERCISE 2 SECTION */}
      {/* ========================================================= */}
      {ex2 && (
        <section className="exercise-section exercise-2-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
              🧩 {ex2.title || 'Exercise 2: เลือกคำจากตารางมาแต่งประโยค'}
            </h2>
            <div className="exercise-instruction-box bg-[#eff6ff] text-[#1e40af] p-3 rounded-lg text-xs sm:text-sm mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex2.instruction || ex2.guidance || `ให้เลือกคำจากตารางด้านล่างนี้ในหนังสือ Sentence Builder 2 มาเติมในช่องว่างให้สมบูรณ์ ตรวจเช็คการสะกดคำและเครื่องหมายให้ถูกต้องนะคะ`}
            </div>
          </div>

          <div className="quiz-items-list space-y-6">
            {ex2.items?.map((item: any, idx: number) => {
              const key = `ex2_${item.id || idx + 1}`;
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
                .map(ord => ex2Categories.find(cat => cat.order === ord))
                .filter(Boolean) as typeof ex2Categories;

              return (
                <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                  {/* 1. Question Number Header */}
                  <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3 font-heading flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-[#1e3a8a] inline-flex items-center justify-center text-sm font-bold shadow-2xs">
                      {idx + 1}
                    </span>
                    <span>ข้อที่ {idx + 1}</span>
                  </div>

                  {/* 2. Word Bank in Columns (Easy to read!) */}
                  <div className="word-bank-container bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-2xs">
                    <div className="text-xs font-bold text-slate-600 mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="flex items-center gap-1.5 text-[#1e3a8a]">
                        <span>🏷️</span>
                        <span className="font-bold">Word Bank (แตะหรือลากคำศัพท์มาวางในประโยคด้านล่าง):</span>
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">
                        {visibleCategories.length} หมวดหมู่
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 ${visibleCategories.length === 2 ? 'sm:grid-cols-2' : visibleCategories.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-3`}>
                      {visibleCategories.map((cat, cIdx) => (
                        <div key={cat.order} className="category-col-card bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-start">
                          <div className="text-xs font-bold text-[#1e3a8a] mb-2.5 pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {cat.order}
                            </span>
                            <span className="truncate">{cat.name}</span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            {cat.words.map((wObj, wIdx) => {
                              const isSelected = currentSlots.includes(wObj.en);
                              return (
                                <div
                                  key={wIdx}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', wObj.en);
                                  }}
                                  onClick={() => handleAutoPlaceWord(key, promptParts, wObj.en, slotCount, cIdx)}
                                  className={`word-chip-pill px-3 py-2 rounded-lg text-xs sm:text-sm font-bold border transition-all cursor-pointer select-none flex items-center justify-between gap-1.5 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs opacity-90'
                                      : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-300 hover:border-blue-400 shadow-2xs hover:shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <GripHorizontal className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                    <span className="truncate">{wObj.en}</span>
                                  </div>
                                  {wObj.th && (
                                    <span className={`text-[11px] font-normal shrink-0 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                      {wObj.th}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Drag & Drop Sentence Builder Dropzone (Below Word Bank) */}
                  <div className="sentence-builder-dropzone bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-4 mb-4 transition-all shadow-2xs">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2.5 flex items-center gap-1.5">
                      <GripHorizontal className="w-3.5 h-3.5 text-blue-500" />
                      <span>ประโยคที่กำลังแต่ง (Interactive Sentence):</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
                      {promptParts.map((part: string, pIdx: number) => (
                        <div key={pIdx} className="inline-flex items-center gap-2 flex-wrap">
                          {part && <span className="font-mono text-[#1e3a8a]">{part}</span>}
                          {pIdx < slotCount && (
                            <DropSlot
                              slotIdx={pIdx}
                              value={currentSlots[pIdx] || ''}
                              categoryHint={visibleCategories[pIdx]?.name || `หมวดที่ ${pIdx + 1}`}
                              onPlace={(word) => handlePlaceSlotWord(key, promptParts, pIdx, word, slotCount)}
                              onRemove={() => handleRemoveSlotWord(key, promptParts, pIdx, slotCount)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="quiz-action-group flex flex-wrap gap-2.5 mb-3">
                    <button
                      onClick={() => handleOfflineCheck(item, key, 'ex-2')}
                      className="btn-check-answer bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      🔍 ตรวจคำตอบ
                    </button>
                  </div>

                  {/* Feedback Box */}
                  {fb && (
                    <>
                      <div className={`feedback-result-box p-4 rounded-xl text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
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

                        {/* Translation Box (when correct answer is checked) */}
                        {fb.isCorrect && fb.translation && (
                          <div className="feedback-translation-box mt-3 pt-3 border-t border-emerald-200/80 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                            <span className="font-extrabold text-emerald-950">📖 คำแปล:</span>
                            <span className="font-semibold text-emerald-900 bg-white/90 px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
                              "{fb.translation}"
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 💡 ดูเฉลย Button */}
                      <div className="reveal-solution-section mb-3 mt-1">
                        <button
                          type="button"
                          onClick={() => toggleRevealSolution(key)}
                          className="btn-reveal-solution inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                        >
                          💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูเฉลยคำตอบที่เป็นไปได้ทั้งหมด'}
                        </button>

                        {revealedSolutions[key] && (() => {
                          const firstCat = ex2Categories.find(c => c.order === requiredOrders[0]);
                          const rowCount = firstCat ? firstCat.words.length : 3;
                          const allSolutions: Array<{ en: string; th: string }> = [];

                          for (let r = 0; r < rowCount; r++) {
                            const chosenEnWords: string[] = [];
                            const chosenThWords: Record<number, string> = {};

                            for (const ord of requiredOrders) {
                              const cat = ex2Categories.find(c => c.order === ord);
                              const wObj = cat?.words[r];
                              if (wObj) {
                                chosenEnWords.push(wObj.en);
                                chosenThWords[ord] = wObj.th || wObj.en;
                              }
                            }

                            if (chosenEnWords.length === slotCount) {
                              const enSentence = reconstructSentence(promptParts, chosenEnWords);
                              let thSentence = '';
                              if (item.thai_template) {
                                let tpl = item.thai_template;
                                for (const ord of requiredOrders) {
                                  if (chosenThWords[ord]) {
                                    tpl = tpl.replace(new RegExp(`\\{${ord}\\}`, 'g'), chosenThWords[ord]);
                                  }
                                }
                                thSentence = tpl;
                              } else {
                                thSentence = requiredOrders.map(ord => chosenThWords[ord] || '').filter(Boolean).join(' ');
                              }
                              allSolutions.push({ en: enSentence, th: thSentence });
                            }
                          }

                          return (
                            <div className="solution-actual-answer-box mt-2.5 p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-[#1e40af] text-xs sm:text-sm animate-in fade-in duration-200">
                              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-blue-200/80">
                                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                                  💡 เฉลยคำตอบที่ถูกต้อง ({allSolutions.length} รูปแบบที่เลือกแต่งได้):
                                </span>
                                <span className="text-[11px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                  เลือกตอบแบบใดก็ได้
                                </span>
                              </div>

                              <div className="space-y-2.5">
                                {allSolutions.map((sol, sIdx) => (
                                  <div key={sIdx} className="solution-item-card bg-white p-3 rounded-lg border border-[#bfdbfe] shadow-2xs">
                                    <div className="font-mono font-bold text-[#1e3a8a] text-sm sm:text-base">
                                      {sIdx + 1}. {sol.en}
                                    </div>
                                    {sol.th && (
                                      <div className="text-xs sm:text-sm font-medium text-emerald-800 mt-1 flex items-center gap-1.5">
                                        <span className="font-bold text-emerald-950">📖 คำแปล:</span>
                                        <span>"{sol.th}"</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 5. EXERCISE 3 SECTION */}
      {/* ========================================================= */}
      {ex3 && (
        <section className="exercise-section exercise-3-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
              🖼️ {ex3.title || 'Exercise 3: ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect'}
            </h2>
            <div className="exercise-instruction-box bg-[#eff6ff] text-[#1e40af] p-3 rounded-lg text-xs sm:text-sm mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex3.instruction || ex3.guidance || `แบบฝึกหัดนี้ใช้จินตนาการแต่งประโยคจากภาพได้เลยนะคะ ไม่มีถูกไม่มีผิด! ลองแต่งประโยคตามโครงสร้าง 3 กล่องด้านล่างได้เลยค่ะ`}
            </div>
          </div>

          <div className="quiz-items-list space-y-6 mt-6">
            {ex3.items?.map((item: any, idx: number) => {
              const key = `ex3_${item.id || idx + 1}`;
              const fb = feedbacks[key];
              const isLoading = aiLoading[key];

              return (
                <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                  <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3 font-heading">
                    ภาพที่ {idx + 1} :
                  </div>

                  {/* Render uploaded image if available */}
                  {item.image_url && (
                    <div className="quiz-image-preview mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xs max-w-md">
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

                  <div className="quiz-action-group flex flex-wrap gap-2.5 mb-3">
                    <button
                      onClick={() => handleAiCheck(item, key, idx)}
                      disabled={isLoading}
                      className="btn-ai-check bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
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
                  </div>

                  {/* Feedback Box */}
                  {fb && (
                    <div className={`feedback-result-box p-3.5 rounded-lg text-xs sm:text-sm transition-all animate-in fade-in duration-200 ${
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

                  {/* 💡 ดูเฉลยตัวอย่าง Button for Exercise 3 */}
                  {item.model_answer && (
                    <div className="reveal-solution-section mb-1 mt-2.5">
                      <button
                        type="button"
                        onClick={() => toggleRevealSolution(key)}
                        className="btn-reveal-solution inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                      >
                        💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูตัวอย่างประโยคเฉลย'}
                      </button>

                      {revealedSolutions[key] && (
                        <div className="solution-actual-answer-box mt-2.5 p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-[#1e40af] text-xs sm:text-sm animate-in fade-in duration-200">
                          <span className="font-bold block mb-1 text-slate-700">ตัวอย่างประโยคที่ถูกต้อง:</span>
                          <div className="font-mono font-bold bg-white px-3 py-2 rounded-lg border border-[#bfdbfe] text-[#1e3a8a] text-sm sm:text-base">
                            {item.model_answer}
                          </div>
                          {(item.image_description || item.context_hint) && (
                            <div className="text-xs sm:text-sm font-medium text-emerald-800 mt-2 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                              <span className="font-bold text-emerald-950">📖 บริบทภาพ/คำแปล:</span>
                              <span>"{item.image_description || item.context_hint}"</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
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


