'use client';

import { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Sparkles, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { EvaluationResult } from '@/lib/evaluator';

interface ExerciseWorkspaceProps {
  chapter: string;
  chapterData: any;
}

export default function ExerciseWorkspace({ chapter, chapterData }: ExerciseWorkspaceProps) {
  // State per question item: answers, feedback, solution visibility, loading state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, { isCorrect: boolean; message: string; points: string[] }>>({});
  const [showSolutions, setShowSolutions] = useState<Record<string, boolean>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const unitNumber = chapterData.chapter || chapterData.unit_number || 1;
  const ex1 = chapterData.exercises?.['ex-1'];
  const ex2 = chapterData.exercises?.['ex-2'];
  const ex3 = chapterData.exercises?.['ex-3'];

  const handleAnswerChange = (key: string, text: string) => {
    setAnswers(prev => ({ ...prev, [key]: text }));
  };

  const toggleSolution = (key: string) => {
    setShowSolutions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // PURE OFFLINE GRAMMAR CHECKER FOR EX 1 & EX 2 (NO AI CALL)
  const checkOfflineGrammar = (item: any, studentAns: string, exType: 'ex-1' | 'ex-2') => {
    const raw = (studentAns || '').trim();
    if (!raw) {
      return {
        isCorrect: false,
        message: '❌ กรุณาพิมพ์คำตอบภาษาอังกฤษก่อนกดตรวจค่ะ',
        points: ['ยังไม่ได้พิมพ์คำตอบในช่องข้อความ']
      };
    }

    const points: string[] = [];
    let isValid = true;

    // 1. Capital letter check (first letter must be uppercase)
    const firstChar = raw.charAt(0);
    const isCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
    if (!isCapital) {
      isValid = false;
      const targetUpper = item.model_answer ? item.model_answer.charAt(0) : 'I';
      points.push(`• ตัวแรกของประโยคต้องเป็นตัวพิมพ์ใหญ่ (Capital letter) เช่น "${targetUpper}..."`);
    }

    // 2. Full stop (.) check at the end
    const hasFullStop = raw.endsWith('.');
    if (!hasFullStop) {
      isValid = false;
      points.push('• อย่าลืมใส่เครื่องหมายจุด Full Stop (.) ด้านหลังสุดของประโยคด้วยนะคะ');
    }

    // 3. Common spelling checks
    if (/\bmakeing\b/i.test(raw)) {
      isValid = false;
      points.push('• สะกดคำผิด: "makeing" ควรแก้เป็น "making" (ตัด e ออกก่อนเติม -ing)');
    }
    if (/\bhom\b/i.test(raw)) {
      isValid = false;
      points.push('• สะกดคำผิด: "hom" ควรแก้เป็น "home"');
    }
    if (/\bwalikng\b/i.test(raw)) {
      isValid = false;
      points.push('• สะกดคำผิด: "walikng" ควรแก้เป็น "walking"');
    }
    if (/\bhesitateing\b/i.test(raw)) {
      isValid = false;
      points.push('• สะกดคำผิด: "hesitateing" ควรแก้เป็น "hesitating"');
    }

    // 4. Fixed Answer Key Matching
    const normalize = (str: string) => str.trim().toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ');
    const normalizedStudent = normalize(raw);

    const modelTarget = item.model_answer ? normalize(item.model_answer) : '';
    const acceptableTargets = (item.acceptable_answers || []).map((a: string) => normalize(a));
    const allTargets = [modelTarget, ...acceptableTargets].filter(Boolean);

    const matchesFixedAnswer = allTargets.some(target => target === normalizedStudent);

    if (!matchesFixedAnswer) {
      isValid = false;
      points.push(`• คำตอบยังไม่ตรงตามเฉลยในหนังสือ (เฉลยเป้าหมายหลัก: "${item.model_answer}")`);
    }

    if (isValid) {
      return {
        isCorrect: true,
        message: '🎉 ถูกต้องสมบูรณ์แบบค่ะ! ไวยากรณ์ ตัวพิมพ์ใหญ่ จุด Full Stop และคำศัพท์ถูกต้องเป๊ะมาก 👏',
        points: ['คำตอบตรงตามเฉลยในหนังสือ Sentence Builder 2']
      };
    }

    return {
      isCorrect: false,
      message: '❌ ยังไม่ถูกต้องค่ะ ลองตรวจสอบคำแนะนำจากครูหวานด้านล่างแล้วลองใหม่อีกครั้งนะคะ:',
      points
    };
  };

  // Handle Offline Check (Ex 1 & Ex 2)
  const handleOfflineCheck = (item: any, key: string, exType: 'ex-1' | 'ex-2') => {
    const studentAns = answers[key] || '';
    const result = checkOfflineGrammar(item, studentAns, exType);
    setFeedbacks(prev => ({ ...prev, [key]: result }));
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
        {/* Unit Heading: เฉลยแบบฝึกหัด Unit X */}
        <h1 className="unit-hero-heading text-2xl sm:text-3xl font-extrabold font-heading mb-1.5">
          เฉลยแบบฝึกหัด Unit {unitNumber}
        </h1>

        {/* Unit Title: units.title */}
        {chapterData.title && (
          <h2 className="unit-hero-title text-xl sm:text-2xl font-bold opacity-95 mb-1 font-heading">
            {chapterData.title}
          </h2>
        )}

        {/* Unit Subtitle: units.subtitle */}
        {chapterData.subtitle && (
          <p className="unit-hero-subtitle text-sm sm:text-base opacity-90 leading-relaxed font-medium">
            {chapterData.subtitle}
          </p>
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
              const isSolVisible = showSolutions[key];

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

                    <button
                      onClick={() => toggleSolution(key)}
                      className="btn-toggle-solution bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-800 border border-slate-300 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>{isSolVisible ? '🙈 ซ่อนเฉลย' : '💡 ดูเฉลย'}</span>
                    </button>
                  </div>

                  {/* Feedback Box */}
                  {fb && (
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
                  )}

                  {/* Solution Box */}
                  {isSolVisible && (
                    <div className="solution-display-box p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg text-[#1e40af] text-xs sm:text-sm transition-all animate-in fade-in duration-200">
                      <span className="solution-label font-bold block mb-1">เฉลย:</span>
                      <div className="solution-model-text font-mono bg-white px-3 py-1.5 rounded border border-[#bfdbfe] text-[#1e3a8a] font-bold">
                        {item.model_answer}
                      </div>
                      {item.acceptable_answers && item.acceptable_answers.length > 1 && (
                        <div className="solution-alternatives-group mt-2 space-y-1">
                          <span className="solution-alternatives-label font-semibold text-slate-600 block text-xs">คำตอบอื่นที่เป็นไปได้:</span>
                          {item.acceptable_answers.map((acc: string, aIdx: number) => (
                            <div key={aIdx} className="solution-alternative-item font-mono bg-white px-2.5 py-1 rounded border border-[#bfdbfe] text-slate-700 text-xs">
                              {aIdx + 1}) {acc}
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
      )}

      {/* ========================================================= */}
      {/* 4. EXERCISE 2 SECTION */}
      {/* ========================================================= */}
      {ex2 && (
        <section className="exercise-section exercise-2-section bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="exercise-header-box border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="exercise-title text-xl sm:text-2xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
              🧩 {ex2.title || 'Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค'}
            </h2>
            <div className="exercise-instruction-box bg-[#eff6ff] text-[#1e40af] p-3 rounded-lg text-xs sm:text-sm mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex2.instruction || `ให้เลือกคำจากตารางด้านล่างนี้ในหนังสือ Sentence Builder 2 มาเติมในช่องว่างให้สมบูรณ์ ตรวจเช็คการสะกดคำและเครื่องหมายให้ถูกต้องนะคะ`}
            </div>
          </div>

          {/* Vocab Reference Table */}
          <div className="vocab-reference-wrapper overflow-x-auto my-4 rounded-xl border border-[#e0e7ff] bg-[#faf5ff] p-4 shadow-2xs">
            <table className="vocab-reference-table w-full text-xs sm:text-sm text-left border-collapse bg-white rounded-lg overflow-hidden border border-[#e0e7ff]">
              <thead>
                <tr className="vocab-table-header bg-[#1e3a8a] text-white font-semibold font-heading">
                  <th className="th-action p-3 border-b border-indigo-100">กำลังทำอะไร</th>
                  <th className="th-purpose p-3 border-b border-indigo-100">เพื่ออะไร (to...)</th>
                  <th className="th-time p-3 border-b border-indigo-100">เมื่อไหร่</th>
                  <th className="th-reason p-3 border-b border-indigo-100">เพราะอะไร (because...)</th>
                </tr>
              </thead>
              <tbody className="vocab-table-body divide-y divide-slate-100 text-slate-700 font-medium">
                <tr className="vocab-table-row">
                  <td className="td-action p-3 leading-relaxed">
                    • making breakfast<br />
                    • cleaning my room<br />
                    • adjusting my schedule
                  </td>
                  <td className="td-purpose p-3 leading-relaxed">
                    • to save money<br />
                    • to find my keys<br />
                    • to fit the meeting / schedule
                  </td>
                  <td className="td-time p-3 leading-relaxed">
                    • now<br />
                    • right now<br />
                    • at the moment
                  </td>
                  <td className="td-reason p-3 leading-relaxed">
                    • because it is cheap<br />
                    • because it is messy<br />
                    • because it is necessary / healthy
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="quiz-items-list space-y-6 mt-6">
            {ex2.items?.map((item: any, idx: number) => {
              const key = `ex2_${item.id || idx + 1}`;
              const fb = feedbacks[key];
              const isSolVisible = showSolutions[key];

              return (
                <div key={key} className="quiz-item-card bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                  <div className="quiz-question-prompt text-base sm:text-lg font-bold text-[#1e3a8a] mb-2 font-heading">
                    {idx + 1}. {item.prompt}
                  </div>

                  <div className="quiz-input-wrapper mb-3">
                    <input
                      type="text"
                      value={answers[key] || ''}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      placeholder="พิมพ์ประโยคภาษาอังกฤษฉบับเต็มที่นี่..."
                      autoComplete="off"
                      className="quiz-answer-input w-full px-3.5 py-2.5 text-sm sm:text-base text-slate-900 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                    />
                    <div className="quiz-input-hint text-xs text-slate-500 italic mt-1 font-medium">
                      คำแนะนำ: พิมพ์ประโยคฉบับเต็ม + อย่าลืมจุด Full stop (.) หลังจบประโยค
                    </div>
                  </div>

                  <div className="quiz-action-group flex flex-wrap gap-2.5 mb-3">
                    <button
                      onClick={() => handleOfflineCheck(item, key, 'ex-2')}
                      className="btn-check-answer bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      🔍 ตรวจคำตอบ
                    </button>

                    <button
                      onClick={() => toggleSolution(key)}
                      className="btn-toggle-solution bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-800 border border-slate-300 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>{isSolVisible ? '🙈 ซ่อนเฉลย' : '💡 ดูเฉลย'}</span>
                    </button>
                  </div>

                  {/* Feedback Box */}
                  {fb && (
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
                  )}

                  {/* Solution Box */}
                  {isSolVisible && (
                    <div className="solution-display-box p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg text-[#1e40af] text-xs sm:text-sm transition-all animate-in fade-in duration-200">
                      <span className="solution-label font-bold block mb-1">เฉลยที่เป็นไปได้ทั้งหมด:</span>
                      {item.model_answer && (
                        <div className="solution-model-text font-mono bg-white px-3 py-1.5 rounded border border-[#bfdbfe] text-[#1e3a8a] font-bold mb-1">
                          • {item.model_answer}
                        </div>
                      )}
                      {item.acceptable_answers?.map((acc: string, aIdx: number) => (
                        <div key={aIdx} className="solution-alternative-item font-mono bg-white px-2.5 py-1 rounded border border-[#bfdbfe] text-slate-700 text-xs">
                          • {acc}
                        </div>
                      ))}
                    </div>
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
