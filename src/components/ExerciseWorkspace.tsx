'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RefreshCw,
  Clock,
  ArrowLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import type { EvaluationResult } from '@/lib/evaluator';
import type { Chapter, Exercise, ExerciseItem } from '@/lib/types';
import { assemblePromptSentence } from '@/lib/offline-checker';

interface ExerciseWorkspaceProps {
  chapter: string;
  chapterData: Chapter;
  selectedExercise?: string;
}

export default function ExerciseWorkspace({ chapterData, selectedExercise }: ExerciseWorkspaceProps) {
  // State per question item: answers, feedback, solution visibility, loading state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, { isCorrect: boolean; message: string; points: string[]; translation?: string; studentTranslation?: string; pending?: boolean; method?: string }>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [dragSlots, setDragSlots] = useState<Record<string, string[]>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const requests = useRef<Record<string, AbortController>>({});
  const draftReady = useRef(false);
  const draftKey = `sb_draft_${chapterData.book}_${chapterData.chapter}`;
  const contentVersion = JSON.stringify(chapterData.exercises);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
        if (draft?.version === contentVersion && draft.answers && draft.slots) {
          setAnswers(draft.answers); setDragSlots(draft.slots);
        }
      } catch { /* Private browsing or expired draft: start empty. */ }
      draftReady.current = true;
    });
    const pending = requests.current;
    return () => { active = false; Object.values(pending).forEach(r => r.abort()); };
  }, [draftKey, contentVersion]);
  useEffect(() => {
    if (!draftReady.current) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ version: contentVersion, answers, slots: dragSlots })); } catch { /* Storage is optional. */ }
  }, [answers, dragSlots, draftKey, contentVersion]);
  const clearFeedback = (key: string) => {
    requests.current[key]?.abort();
    delete requests.current[key];
    setAiLoading(prev => ({ ...prev, [key]: false }));
    setFeedbacks(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const toggleRevealSolution = (key: string) => {
    setRevealedSolutions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const unitNumber = chapterData.chapter || chapterData.unit_number || 1;

  // Extract exercise categories dynamically for guided_sentence
  const getExerciseCategories = (exercise: Exercise) => {
    if (!exercise) return [];
    if (Array.isArray(exercise.categories) && exercise.categories.length > 0) {
      return exercise.categories.map((c, idx) => ({
        order: c.order || idx + 1,
        name: c.name || c.category_name || `หมวดที่ ${c.order || idx + 1}`,
        words: (c.words || c.word_bank || []).map(w => typeof w === 'string' ? { en: w, th: '' } : { en: w.en || '', th: w.th || '' })
      }));
    }
    if (exercise.word_bank) {
      return Object.entries(exercise.word_bank).map(([catKey, words], idx) => ({
        order: idx + 1,
        name: catKey === 'action' ? 'กำลังทำอะไร' : catKey === 'purpose' ? 'เพื่ออะไร (to...)' : catKey === 'time' ? 'เมื่อไหร่' : catKey === 'reason' ? 'เพราะอะไร (because...)' : catKey,
        words: (Array.isArray(words) ? words : []).map(w => typeof w === 'string' ? { en: w, th: '' } : { en: w.en || '', th: w.th || '' })
      }));
    }
    return [];
  };

  // Convert exercises into an ordered list respecting order_index or natural order
  const rawExercises = chapterData.exercises || {};
  const exercisesList: Exercise[] = (Array.isArray(rawExercises) ? rawExercises : Object.entries(rawExercises).map(([code, ex]) => ({
    ...ex,
    code: ex.code || code,
    id: ex.id || code
  }))).sort((a: Exercise, b: Exercise) => {
    const orderA = typeof a.order_index === 'number' ? a.order_index : (parseInt((a.code || '').replace(/\D/g, ''), 10) || 99);
    const orderB = typeof b.order_index === 'number' ? b.order_index : (parseInt((b.code || '').replace(/\D/g, ''), 10) || 99);
    if (orderA !== orderB) return orderA - orderB;
    return (a.code || '').localeCompare(b.code || '');
  });

  const handleAnswerChange = (key: string, text: string) => {
    clearFeedback(key);
    setAnswers(prev => ({ ...prev, [key]: text }));
  };

  // Reconstruct sentence from prompt static segments and placed slot words using intelligent abbreviation & punctuation detector
  const reconstructSentence = (parts: string[], slots: string[]) => {
    return assemblePromptSentence(parts, slots);
  };

  const handleSlotInputChange = (key: string, parts: string[], slotIdx: number, val: string, totalSlots: number) => {
    clearFeedback(key);
    const cur = [...(dragSlots[key] || Array(totalSlots).fill(''))];
    while (cur.length < totalSlots) cur.push('');
    cur[slotIdx] = val;
    setDragSlots(prev => ({ ...prev, [key]: cur }));
    const sentence = reconstructSentence(parts, cur);
    setAnswers(prev => ({ ...prev, [key]: sentence }));
  };

  // Cooldown countdown effect (decrement every 1 second)
  useEffect(() => {
    const hasActive = Object.values(cooldowns).some(c => c > 0);
    if (!hasActive) return;

    const timer = setInterval(() => {
      setCooldowns(prev => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v > 1) {
            next[k] = v - 1;
            changed = true;
          } else if (v === 1) {
            next[k] = 0;
            changed = true;
          }
        }
        return changed ? { ...prev, ...next } : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldowns]);

  const handleAiCheck = async (item: ExerciseItem, key: string, _idx: number, exercise: Exercise) => {
    if (requests.current[key] || (cooldowns[key] || 0) > 0) return;
    const answer = answers[key] || '';
    if (!answer.trim()) {
      setFeedbacks(prev => ({ ...prev, [key]: { isCorrect: false, pending: true, message: 'กรุณาพิมพ์คำตอบก่อนส่งตรวจค่ะ', points: [] } }));
      return;
    }
    const controller = new AbortController(); requests.current[key] = controller;
    setAiLoading(prev => ({ ...prev, [key]: true }));
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch('/api/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ bookName: chapterData.book, chapter: unitNumber, exerciseId: exercise.code,
          itemId: item.id, studentAnswer: answer }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) setCooldowns(prev => ({ ...prev, [key]: Number(response.headers.get('Retry-After')) || 60 }));
        throw new Error(data.error || 'ระบบยังตรวจคำตอบไม่ได้ค่ะ กรุณาลองใหม่');
      }
      if (requests.current[key] !== controller) return;
      const result = data as EvaluationResult;
      const points = [...result.feedbackPoints];
      if (result.correctedSentence) points.push(`ตัวอย่างการปรับประโยค: "${result.correctedSentence}"`);
      setFeedbacks(prev => ({ ...prev, [key]: { isCorrect: result.isCorrect, pending: result.verdict === 'needs_review',
        message: result.statusText, points, translation: result.studentTranslation, studentTranslation: result.studentTranslation,
        method: result.isLiveGemini ? 'ตรวจด้วย AI' : result.verdict === 'needs_review' ? 'รอการตรวจความหมาย' : 'ตรวจตามกติกาแบบฝึกหัด' } }));
    } catch (error) {
      if (requests.current[key] !== controller) return;
      setFeedbacks(prev => ({ ...prev, [key]: { isCorrect: false, pending: true,
        message: controller.signal.aborted ? 'การตรวจใช้เวลานานเกินไปค่ะ ลองใหม่อีกครั้งนะคะ' : error instanceof Error ? error.message : 'ระบบยังตรวจคำตอบไม่ได้ค่ะ',
        points: ['ยังไม่ตัดสินว่าคำตอบถูกหรือผิดค่ะ สามารถส่งคำตอบเดิมเพื่อลองตรวจอีกครั้งได้'] } }));
    } finally {
      clearTimeout(timeout);
      if (requests.current[key] === controller) { delete requests.current[key]; setAiLoading(prev => ({ ...prev, [key]: false })); }
    }
  };

  const bookSlug = chapterData.slug || chapterData.book || 'sentence-builder-vol-2';
  const bookTitle = chapterData.book_title || (bookSlug === 'sentence-builder-vol-2' ? 'Sentence Builder Vol. 2' : bookSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()));

  return (
    <div className="workspace-main-container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 font-sans">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold">
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
          <Link href={`/${bookSlug}`} className="hover:text-[#2563eb] flex items-center gap-1 transition-colors shrink-0">
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <span className="hidden xs:inline">หน้าหลัก</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <Link href={`/${bookSlug}`} className="hover:text-[#2563eb] truncate max-w-[130px] sm:max-w-xs transition-colors">
            {bookTitle}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-[#1e3a8a] font-bold shrink-0">
            Unit {unitNumber}
          </span>
        </div>

        <Link 
          href={`/${bookSlug}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs shrink-0 transition-all hover:border-blue-300 min-h-[36px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span><span className="hidden sm:inline">กลับสู่</span>สารบัญ</span>
        </Link>
      </nav>

      {/* ========================================================= */}
      {/* 1. UNIT HERO BANNER (UNIT DETAIL SECTION) */}
      {/* ========================================================= */}
      <section className="unit-hero-banner bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 sm:mb-8 shadow-md relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-xs text-sky-200 text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-2.5 border border-white/20">
          <span>เฉลยแบบฝึกหัด Unit {unitNumber}</span>
        </div>

        {chapterData.title && (
          <h1 className="unit-hero-title text-xl sm:text-3xl md:text-4xl font-extrabold font-heading mb-2 leading-snug">
            {chapterData.title}
          </h1>
        )}

        {chapterData.subtitle && (
          <h2 className="unit-hero-subtitle text-base sm:text-xl md:text-2xl font-bold opacity-95 leading-relaxed font-heading">
            {chapterData.subtitle}
          </h2>
        )}
      </section>

      {/* ========================================================= */}
      {/* DYNAMIC EXERCISES LIST (IN CUSTOM CONFIGURED ORDER) */}
      <nav aria-label="เลือกแบบฝึกหัด" className="flex flex-wrap gap-2 mb-5">
        <Link className="px-3 py-2 rounded-lg border bg-white" href={`/${bookSlug}/chapter-${unitNumber}`}>ทั้งหมด</Link>
        {exercisesList.map(ex => <Link key={ex.code} aria-current={selectedExercise === ex.code ? 'page' : undefined}
          className="px-3 py-2 rounded-lg border bg-white text-blue-800" href={`/${bookSlug}/chapter-${unitNumber}/${ex.code}`}>{ex.title}</Link>)}
      </nav>
      <p className="mb-4 text-sm text-slate-600">ตรวจแล้ว {Object.keys(feedbacks).length} ข้อในหน้านี้ · บันทึกคำตอบที่พิมพ์ไว้บนอุปกรณ์นี้อัตโนมัติ</p>

      {/* ========================================================= */}
      {exercisesList.filter(ex => !selectedExercise || ex.code === selectedExercise).map((exercise: Exercise, exIdx: number) => {
        const exType = exercise.type || (exercise.code === 'ex-2' || (exercise.categories && exercise.categories.length > 0) || exercise.word_bank ? 'guided_sentence' : (exercise.code === 'ex-3' ? 'picture_description' : 'translation'));
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
                {exercise.items?.map((item: ExerciseItem, idx: number) => {
                  const key = `${exKeyPrefix}_${item.id || idx + 1}`;
                  const fb = feedbacks[key];

                  return (
                    <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                      <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3.5 font-heading">
                        {idx + 1}. {item.thai || item.thai_prompt}
                      </div>

                      <div className="quiz-input-wrapper mb-3">
                        <input
                          maxLength={1500}
                          aria-label={`คำตอบข้อที่ ${idx + 1}`}
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
                          onClick={() => handleAiCheck(item, key, idx, exercise)}
                          disabled={aiLoading[key] || (cooldowns[key] || 0) > 0}
                          className="btn-check-answer bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer min-h-[42px]"
                        >
                          🔍 ตรวจคำตอบ
                        </button>
                        {item.model_answer && (
                          <button
                            type="button"
                            onClick={() => toggleRevealSolution(key)}
                            className="btn-reveal-solution inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer min-h-[42px]"
                          >
                            💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูเฉลย'}
                          </button>
                        )}
                      </div>

                      {/* Feedback Box */}
                      {fb && (
                        <div role="status" aria-live="polite" className={`feedback-result-box p-3.5 rounded-xl text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
                          fb.pending ? 'bg-amber-50 text-amber-900 border border-amber-200' : fb.isCorrect 
                            ? 'feedback-correct bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                            : 'feedback-incorrect bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}>
                          <div className="feedback-message-title font-bold flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                            {fb.pending ? <Clock className="w-4 h-4 shrink-0" /> : fb.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{fb.message}{fb.method && <small className="block font-normal mt-1">{fb.method}</small>}</span>
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
                              <span>&quot;{item.thai || item.thai_prompt}&quot;</span>
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
                {exercise.items?.map((item: ExerciseItem, idx: number) => {
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

                  return (
                    <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 sm:p-5 shadow-2xs overflow-hidden max-w-full">
                      {/* 1. Question Number Header */}
                      <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3 font-heading flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-100 text-[#1e3a8a] inline-flex items-center justify-center text-sm font-bold shadow-2xs">
                          {idx + 1}
                        </span>
                        <span>ข้อที่ {idx + 1}</span>
                      </div>

                      {/* 2. Fill-in-the-blank Typing Sentence Builder (No Word Bank) */}
                      <div className="sentence-builder-card bg-white border border-blue-200 rounded-2xl p-3.5 sm:p-5 mb-4 shadow-2xs overflow-hidden max-w-full">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                          <span>✍️</span>
                          <span>พิมพ์เติมคำในช่องว่าง (Fill in the blanks):</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold text-slate-900 leading-loose max-w-full">
                          {(() => {
                            // Compute trailing punctuation for each input slot
                            const trailingPuncs: string[] = [];
                            for (let i = 0; i < slotCount; i++) {
                              const nextPart = promptParts[i + 1] || '';
                              const m = nextPart.match(/^([,.\?!;:])/);
                              trailingPuncs.push(m ? m[1] : '');
                            }

                            return promptParts.map((part: string, pIdx: number) => {
                              const currentVal = currentSlots[pIdx] || '';
                              const slotOrder = requiredOrders[pIdx] ?? (pIdx + 1);
                              const targetCat = exCategories.find(c => c.order === slotOrder);
                              const placeholderText = targetCat?.name ? `(${targetCat.name})` : `(ช่องที่ ${pIdx + 1})`;
                              const baseWidth = Math.max(100, (placeholderText.length + 2) * 9);
                              const dynamicWidth = Math.max(baseWidth, (currentVal.length + 2) * 10);

                              // If previous slot took our leading punctuation, strip it
                              let cleanPart = part;
                              if (pIdx > 0 && trailingPuncs[pIdx - 1]) {
                                cleanPart = cleanPart.replace(new RegExp('^\\s*' + '\\' + trailingPuncs[pIdx - 1]), '');
                              }
                              const textContent = cleanPart.trim();
                              const trailingPunc = trailingPuncs[pIdx] || '';
                              // Detector: If choice already ends with '.' (e.g. 3 p.m. or 6 a.m.) and trailing punctuation is '.', hide the redundant outer dot
                              const shouldHideTrailingPunc = trailingPunc === '.' && currentVal.trim().endsWith('.');

                              return (
                                <Fragment key={pIdx}>
                                  {textContent && (
                                    <span className="font-mono text-[#1e3a8a]">{textContent}</span>
                                  )}
                                  {pIdx < slotCount && (
                                    <span className="inline-flex items-center max-w-full min-w-0 shrink">
                                      <input
                          maxLength={1500}
                          aria-label={`ข้อที่ ${idx + 1} ช่องที่ ${pIdx + 1}`}
                                        type="text"
                                        value={currentVal}
                                        onChange={(e) => handleSlotInputChange(key, promptParts, pIdx, e.target.value, slotCount)}
                                        placeholder={placeholderText}
                                        style={{ width: `${dynamicWidth}px`, maxWidth: (trailingPunc && !shouldHideTrailingPunc) ? 'calc(100% - 1.25rem)' : '100%' }}
                                        className="inline-block px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 focus:bg-white text-sm sm:text-base font-bold text-[#1e3a8a] text-center outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono shadow-2xs placeholder:text-blue-400/80 placeholder:font-sans placeholder:text-xs sm:placeholder:text-sm placeholder:font-semibold max-w-full min-w-[80px] sm:min-w-[120px]"
                                      />
                                      {trailingPunc && !shouldHideTrailingPunc && (
                                        <span className="font-mono font-bold text-[#1e3a8a] text-base ml-1 select-none shrink-0">
                                          {trailingPunc}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </Fragment>
                              );
                            });
                          })()}
                        </div>

                        {/* Constructed Sentence Preview */}
                        {currentConstructed && (
                          <div className="constructed-preview mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">
                              ประโยคของนักเรียน:
                            </span>
                            <span className="font-mono text-xs sm:text-sm font-bold text-[#1e3a8a] break-words bg-blue-50/60 px-3 py-1.5 rounded-xl border border-blue-200/60 flex-1 w-full sm:w-auto">
                              {currentConstructed}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 4. Action Buttons */}
                      <div className="quiz-action-group flex flex-wrap items-center gap-2.5 mb-3">
                        <button
                          onClick={() => handleAiCheck(item, key, idx, exercise)}
                          disabled={aiLoading[key] || (cooldowns[key] || 0) > 0}
                          className="btn-check-answer bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer min-h-[42px]"
                        >
                          🔍 ตรวจคำตอบ
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRevealSolution(key)}
                          className="btn-reveal-solution inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer min-h-[42px]"
                        >
                          💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูเฉลยคำตอบที่เป็นไปได้'}
                        </button>
                      </div>

                      {/* 5. Feedback Box */}
                      {fb && (
                        <div role="status" aria-live="polite" className={`feedback-result-box p-3.5 rounded-xl text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
                          fb.pending ? 'bg-amber-50 text-amber-900 border border-amber-200' : fb.isCorrect 
                            ? 'feedback-correct bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                            : 'feedback-incorrect bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}>
                          <div className="feedback-message-title font-bold flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                            {fb.pending ? <Clock className="w-4 h-4 shrink-0" /> : fb.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{fb.message}{fb.method && <small className="block font-normal mt-1">{fb.method}</small>}</span>
                          </div>

                          {/* 📖 คำแปลประโยคภาษาไทย */}
                          {fb.translation && (
                            <div className="feedback-thai-translation my-2 p-2.5 bg-white/90 rounded-lg border border-emerald-200 text-xs sm:text-sm text-emerald-950 font-medium flex items-center gap-1.5 shadow-2xs">
                              <span className="font-bold text-emerald-900 shrink-0">📖 คำแปล:</span>
                              <span>&quot;{fb.translation}&quot;</span>
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
                          const maxRows = Math.max(1, ...exCategories.map(c => (c.words || []).length));
                          const possibleSentences: Array<{ en: string; th: string }> = [];
                          const seenEn = new Set<string>();

                          for (let r = 0; r < maxRows; r++) {
                            const chosenWords: string[] = [];
                            const chosenTh: Record<number, string> = {};

                            for (const ord of requiredOrders) {
                              const cat = exCategories.find(c => c.order === ord);
                              const w = cat?.words[r];
                              if (w && w.en) {
                                chosenWords.push(w.en);
                                chosenTh[ord] = w.th || w.en;
                              }
                            }

                            if (chosenWords.length === slotCount) {
                              const cleanSentence = assemblePromptSentence(promptParts, chosenWords);
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
                    {exercise.instruction || exercise.guidance || `แบบฝึกหัดนี้ให้นักเรียนดูภาพแล้วแต่งประโยคภาษาอังกฤษให้สอดคล้องกับภาพ โดยใช้โครงสร้าง Core + Context + Connect ให้ถูกต้องนะคะ`}
                  </span>
                </div>
              </div>

              <div className="quiz-items-list space-y-6 mt-6">
                {exercise.items?.map((item: ExerciseItem, idx: number) => {
                  const key = `${exKeyPrefix}_${item.id || idx + 1}`;
                  const fb = feedbacks[key];
                  const isLoading = aiLoading[key];

                  return (
                    <div key={key} className="quiz-item-card flex flex-col bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                      <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-3 font-heading">
                        ภาพที่ {idx + 1} :
                      </div>

                      {!item.image_url && <p className="mb-3 text-sm text-slate-600">ยังไม่มีภาพบนเว็บค่ะ โปรดดูภาพข้อที่ {idx + 1} ในหนังสือประกอบ</p>}
                      {/* Render uploaded image if available */}
                      {item.image_url && (
                        <div className="quiz-image-preview self-center w-full mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xs max-w-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url}
                            alt={item.context_hint || `ภาพประกอบข้อที่ ${idx + 1}`}
                            className="w-full h-auto max-h-72 object-contain rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="quiz-input-wrapper mb-3">
                        <input
                          maxLength={1500}
                          aria-label={`คำตอบข้อที่ ${idx + 1}`}
                          type="text"
                          value={answers[key] || ''}
                          onChange={(e) => handleAnswerChange(key, e.target.value)}
                          placeholder={`แต่งประโยคจากภาพที่ ${idx + 1} ที่นี่...`}
                          autoComplete="off"
                          className="quiz-answer-input w-full px-3.5 py-2.5 text-sm sm:text-base text-slate-900 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                        />
                      </div>

                      <div className="quiz-action-group flex flex-wrap items-center gap-2.5 mb-3">
                        {(() => {
                          const isCooldown = (cooldowns[key] || 0) > 0;
                          const isButtonDisabled = isLoading || isCooldown;
                          return (
                            <button
                              onClick={() => handleAiCheck(item, key, idx, exercise)}
                              disabled={isButtonDisabled}
                              className={`btn-ai-check px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs min-h-[42px] ${
                                isCooldown 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-90'
                                  : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                              }`}
                            >
                              {isLoading ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>กำลังตรวจทาน...</span>
                                </>
                              ) : isCooldown ? (
                                <>
                                  <Clock className="w-4 h-4 animate-pulse text-amber-600" />
                                  <span>⏳ รออีก {cooldowns[key]} วิ...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>✨ ตรวจสอบประโยคของฉัน</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                        {item.model_answer && (
                          <button
                            type="button"
                            onClick={() => toggleRevealSolution(key)}
                            className="btn-reveal-solution inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer min-h-[42px]"
                          >
                            💡 {revealedSolutions[key] ? 'ซ่อนเฉลย' : 'ดูตัวอย่างประโยคเฉลย'}
                          </button>
                        )}
                      </div>

                      {/* Feedback Box */}
                      {fb && (
                        <div role="status" aria-live="polite" className={`feedback-result-box p-3.5 rounded-xl text-xs sm:text-sm transition-all animate-in fade-in duration-200 mb-3 ${
                          fb.pending ? 'bg-amber-50 text-amber-900 border border-amber-200' : fb.isCorrect 
                            ? 'feedback-correct bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                            : 'feedback-incorrect bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}>
                          <div className="feedback-message-title font-bold flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                            {fb.pending ? <Clock className="w-4 h-4 shrink-0" /> : fb.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span>{fb.message}{fb.method && <small className="block font-normal mt-1">{fb.method}</small>}</span>
                          </div>

                          {/* 📖 คำแปลประโยคของนักเรียน */}
                          {fb.studentTranslation && (
                            <div className="feedback-student-translation my-2 p-2.5 bg-white/95 rounded-lg border border-slate-200 text-xs sm:text-sm">
                              <span className="font-bold text-slate-800">📖 คำแปลประโยคของนักเรียน:</span>
                              <span className="ml-1.5 text-slate-700 font-medium">&quot;{fb.studentTranslation}&quot;</span>
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


