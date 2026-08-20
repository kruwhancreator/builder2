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
  const ex2Categories: Array<{ order: number; name: string; words: string[] }> = ex2
    ? Array.isArray(ex2.categories)
      ? ex2.categories.map((c: any, idx: number) => ({
          order: c.order || idx + 1,
          name: c.name || c.category_name || `หมวดที่ ${idx + 1}`,
          words: c.words || c.word_bank || []
        }))
      : ex2.word_bank
        ? Object.entries(ex2.word_bank).map(([catKey, words]: [string, any], idx: number) => ({
            order: idx + 1,
            name: catKey === 'action' ? 'กำลังทำอะไร' : catKey === 'purpose' ? 'เพื่ออะไร (to...)' : catKey === 'time' ? 'เมื่อไหร่' : catKey === 'reason' ? 'เพราะอะไร (because...)' : catKey,
            words: Array.isArray(words) ? words : []
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

      setFeedbacks(prev => ({
        ...prev,
        [key]: {
          isCorrect: isScoreGood,
          message: isScoreGood 
            ? `🎉 ${data.statusText || 'ยอดเยี่ยมมากค่ะ! ประโยคถูกต้องตามหลักภาษาอังกฤษและบริบทภาพ 👏'}`
            : `⚡ ${data.statusText || 'เกือบสมบูรณ์แล้วค่ะ ลองปรับตามคำแนะนำดูนะคะ:'}`,
          points: points.length > 0 ? points : ['ประโยคถูกต้องตามโครงสร้าง Present Continuous']
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
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex1.instruction || `โปรดใช้คำศัพท์จาก Unit ${unitNumber} ในหนังสือ Sentence Builder 2 ในการตอบนะคะ ระบบจะตรวจคำตอบแบบเป๊ะๆ (รวมถึงการพิมพ์ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และจุด Full Stop . ด้านหลังด้วยน้า)`}
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
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex2.instruction || `ให้เลือกคำจากตารางด้านล่างนี้ในหนังสือ Sentence Builder 2 มาเติมในช่องว่างให้สมบูรณ์ ตรวจเช็คการสะกดคำและเครื่องหมายให้ถูกต้องนะคะ`}
            </div>
          </div>

          {/* Dynamic Vocab Reference Table */}
          {ex2Categories.length > 0 && (
            <div className="vocab-reference-wrapper overflow-x-auto my-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <table className="vocab-reference-table w-full text-xs sm:text-sm text-left border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
                <thead>
                  <tr className="vocab-table-header bg-[#1e3a8a] text-white font-semibold font-heading">
                    {ex2Categories.map((cat, cIdx) => (
                      <th key={cIdx} className="p-3.5 border-b border-indigo-100 font-bold">
                        {cat.order}. {cat.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="vocab-table-body divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr className="vocab-table-row">
                    {ex2Categories.map((cat, cIdx) => (
                      <td key={cIdx} className="p-3.5 leading-relaxed align-top">
                        {cat.words.map((w, wIdx) => (
                          <div key={wIdx} className="py-0.5">• {w}</div>
                        ))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="quiz-items-list space-y-6 mt-6">
            {ex2.items?.map((item: any, idx: number) => {
              const key = `ex2_${item.id || idx + 1}`;
              const fb = feedbacks[key];

              // Parse blanks from prompt (e.g. "I do ____________________.")
              const blankRegex = /_{2,}/g;
              const promptParts = (item.prompt || '').split(blankRegex);
              const slotCount = Math.max(1, (item.prompt || '').match(blankRegex)?.length || 1);
              const currentSlots = dragSlots[key] || Array(slotCount).fill('');
              const currentConstructed = answers[key] || '';

              // Progressive Word Bank: Only show categories required for this item
              const requiredOrders: number[] = item.required_orders || ex2Categories.slice(0, slotCount).map(c => c.order);
              const displayedCategories = ex2Categories.filter(c => requiredOrders.includes(c.order));

              return (
                <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                  <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3 font-heading flex flex-wrap items-center justify-between gap-2">
                    <span>{idx + 1}. {item.prompt}</span>
                    {currentSlots.some(Boolean) && (
                      <button
                        type="button"
                        onClick={() => handleResetSlots(key)}
                        className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>ล้างคำตอบ</span>
                      </button>
                    )}
                  </div>

                  {/* 1. INTERACTIVE DRAG & DROP SENTENCE SLOTS ZONE */}
                  <div className="sentence-builder-dropzone bg-white rounded-2xl border-2 border-indigo-100 p-4 sm:p-5 mb-4 shadow-2xs">
                    <div className="text-[11px] sm:text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <GripHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ลากหรือแตะคำศัพท์จาก Word Bank มาวางในช่องว่าง:</span>
                    </div>

                    <div className="sentence-tokens-row flex flex-wrap items-center gap-2 text-base sm:text-lg font-bold text-slate-800 font-heading leading-loose">
                      {promptParts.map((part: string, pIdx: number) => {
                        const expectedCat = displayedCategories[pIdx] || ex2Categories[pIdx];
                        return (
                          <span key={pIdx} className="inline-flex items-center gap-2">
                            {part.trim() && <span>{part.trim()}</span>}
                            {pIdx < slotCount && (
                              <DropSlot
                                slotIdx={pIdx}
                                value={currentSlots[pIdx]}
                                categoryHint={expectedCat ? expectedCat.name : undefined}
                                onPlace={(word: string) => handlePlaceSlotWord(key, promptParts, pIdx, word, slotCount)}
                                onRemove={() => handleRemoveSlotWord(key, promptParts, pIdx, slotCount)}
                              />
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {/* Live Sentence Preview */}
                    {currentConstructed && (
                      <div className="assembled-sentence-preview mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="text-slate-500 font-semibold">ประโยคที่ต่อได้:</span>
                        <span className="font-bold text-[#1e3a8a] bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                          {currentConstructed}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. PROGRESSIVE WORD BANK CHIPS (ONLY SHOWS REQUIRED ORDERS FOR THIS QUIZ) */}
                  {displayedCategories.length > 0 && (
                    <div className="word-bank-chips-panel bg-slate-100/80 rounded-2xl p-4 border border-slate-200 mb-4">
                      <div className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
                        <span>📚 Word Bank (แตะหรือลากคำศัพท์เพื่อวาง):</span>
                        <span className="text-[11px] font-medium text-slate-500">
                          แสดง {displayedCategories.length} หมวดหมู่สำหรับข้อนี้
                        </span>
                      </div>

                      <div className="categories-stack space-y-3">
                        {displayedCategories.map((cat, cIdx) => (
                          <div key={cat.order || cIdx} className="category-group flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                              {cat.order}. {cat.name}:
                            </span>
                            <div className="chips-row flex flex-wrap gap-1.5">
                              {cat.words.map((word: string, wIdx: number) => {
                                const isUsed = currentSlots.includes(word);
                                return (
                                  <button
                                    key={wIdx}
                                    type="button"
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', word)}
                                    onClick={() => handleAutoPlaceWord(key, promptParts, word, slotCount, cIdx)}
                                    className={`word-chip px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all shadow-2xs flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none ${
                                      isUsed
                                        ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300/40 shadow-xs'
                                        : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-300 hover:border-blue-400'
                                    }`}
                                  >
                                    <GripHorizontal className={`w-3 h-3 ${isUsed ? 'text-white/70' : 'text-slate-400'}`} />
                                    <span>{word}</span>
                                    {isUsed && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

                      {/* 💡 ดูเฉลย Button (shown below incorrect feedback) */}
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
      {/* 5. EXERCISE 3 SECTION */}
      {/* ========================================================= */}
      {ex3 && (
        <section className="exercise-section exercise-3-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
              🖼️ {ex3.title || 'Exercise 3: ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect'}
            </h2>
            <div className="exercise-instruction-box bg-[#eff6ff] text-[#1e40af] p-3 rounded-lg text-xs sm:text-sm mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              🌟 <b>ข้อแนะนำพิเศษจากครูหวาน:</b> {ex3.instruction || `แบบฝึกหัดนี้ใช้จินตนาการแต่งประโยคจากภาพได้เลยนะคะ ไม่มีถูกไม่มีผิด! ลองแต่งประโยคตามโครงสร้าง 3 กล่องด้านล่างได้เลยค่ะ`}
            </div>
          </div>

          {/* 3 Structure Cards */}
          <div className="structure-cards-grid grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="structure-card structure-core-card bg-white border border-[#2563eb] rounded-xl p-3.5 shadow-2xs">
              <span className="structure-card-title font-bold text-[#1e3a8a] text-xs sm:text-sm block border-b border-blue-100 pb-1 mb-1 font-heading">
                🔵 Core (ส่วนหลัก)
              </span>
              <p className="structure-card-body text-xs text-slate-700">
                <b>ฉันกำลังทำอะไร:</b><br />
                <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-xs">I am + V.ing</code>
              </p>
            </div>

            <div className="structure-card structure-context-card bg-white border border-emerald-500 rounded-xl p-3.5 shadow-2xs">
              <span className="structure-card-title font-bold text-emerald-800 text-xs sm:text-sm block border-b border-emerald-100 pb-1 mb-1 font-heading">
                🟢 Context (บริบท)
              </span>
              <p className="structure-card-body text-xs text-slate-700">
                <b>เพื่ออะไร:</b> <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-xs">to + V.inf</code><br />
                <b>เมื่อไหร่:</b> <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-xs">now / right now</code>
              </p>
            </div>

            <div className="structure-card structure-connect-card bg-white border border-amber-500 rounded-xl p-3.5 shadow-2xs">
              <span className="structure-card-title font-bold text-amber-800 text-xs sm:text-sm block border-b border-amber-100 pb-1 mb-1 font-heading">
                🟠 Connect (ส่วนเชื่อม)
              </span>
              <p className="structure-card-body text-xs text-slate-700">
                <b>เพราะอะไร:</b><br />
                <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-xs">because it is + Adj</code>
              </p>
            </div>
          </div>

          <div className="quiz-items-list space-y-6 mt-6">
            {ex3.items?.map((item: any, idx: number) => {
              const key = `ex3_${item.id || idx + 1}`;
              const fb = feedbacks[key];
              const isLoading = aiLoading[key];

              return (
                <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                  <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-2 font-heading">
                    ภาพที่ {idx + 1}: {item.image_description}
                  </div>

                  {item.context_hint && (
                    <p className="quiz-context-hint text-xs text-slate-600 mb-3 bg-amber-50 p-2.5 rounded border border-amber-200 font-medium">
                      💡 คำใบ้บริบทภาพ: <span className="font-bold text-slate-800">{item.context_hint}</span>
                    </p>
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

                    <a
                      href="https://quillbot.com/grammar-check"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-quillbot-check bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>🌐 ตรวจ Grammar ด้วย QuillBot</span>
                    </a>
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
      {categoryHint ? `+ วางคำ (${categoryHint})` : '+ วางคำที่นี่'}
    </span>
  );
}


