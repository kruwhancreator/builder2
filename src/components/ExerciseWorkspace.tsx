'use client';

import { useState, useEffect } from 'react';
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

  const ex1 = chapterData.exercises['ex-1'];
  const ex2 = chapterData.exercises['ex-2'];
  const ex3 = chapterData.exercises['ex-3'];

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
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 1. Header Banner */}
      <div className="text-center mb-8">
        <span className="inline-block bg-[#2563eb]/10 text-[#1e3a8a] text-sm sm:text-base font-extrabold px-4 py-1.5 rounded-full mb-3 border border-[#2563eb]/20 shadow-2xs font-heading">
          Sentence Builder 2 • Unit {chapterData.chapter}
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1e3a8a] tracking-tight mb-2 font-heading leading-tight">
          เฉลยแบบฝึกหัด {chapterData.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 font-medium">
          {chapterData.subtitle}
        </p>
        <p className="text-sm sm:text-base text-slate-500 mt-1">
          พัฒนาทักษะการแต่งประโยคภาษาอังกฤษอย่างมั่นใจ ไวยากรณ์เป๊ะ!
        </p>
      </div>

      {/* 2. Teacher Persona Greeting Card */}
      <div className="bg-white border-l-5 border-[#2563eb] rounded-2xl p-5 sm:p-6 shadow-xs mb-8 flex items-start sm:items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 text-[#1e3a8a] flex items-center justify-center text-3xl shrink-0 border-2 border-[#2563eb]">
          👩‍🏫
        </div>
        <div className="text-sm sm:text-base text-[#1e293b] leading-relaxed">
          <span className="font-bold text-[#1e3a8a] block mb-1 font-heading text-base sm:text-lg">ครูหวาน อิงลิช ออน แอร์:</span>
          &ldquo;สวัสดีค่ะนักเรียนคนเก่ง! วันนี้ครูหวานทำระบบเฉลยและตรวจแบบฝึกหัด Unit {chapterData.chapter} มาให้นะคะ พิมพ์คำตอบแล้วกดตรวจได้เลย ครูมีคำแนะนำให้อย่างละเอียดถ้าพิมพ์ผิดจุดไหน พยายามทำให้เต็มที่นะคะ! 💖&rdquo;
        </div>
      </div>

      {/* ========================================================= */}
      {/* EXERCISE 1 SECTION */}
      {/* ========================================================= */}
      {ex1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] font-heading flex items-center gap-2.5">
              ✏️ {ex1.title || 'Exercise 1: แต่งประโยคภาษาอังกฤษ'}
            </h2>
            <div className="bg-[#eff6ff] text-[#1e40af] p-4 rounded-xl text-sm sm:text-base mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex1.instruction || `โปรดใช้คำศัพท์จาก Unit ${chapterData.chapter} ในหนังสือ Sentence Builder 2 ในการตอบนะคะ ระบบจะตรวจคำตอบแบบเป๊ะๆ (รวมถึงการพิมพ์ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และจุด Full Stop . ด้านหลังด้วยน้า)`}
            </div>
          </div>

          <div className="space-y-6">
            {ex1.items?.map((item: any, idx: number) => {
              const key = `ex1_${item.id || idx + 1}`;
              const fb = feedbacks[key];
              const isSolVisible = showSolutions[key];

              return (
                <div key={key} className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
                  <div className="text-lg sm:text-xl font-bold text-[#1e3a8a] mb-4 font-heading">
                    {idx + 1}. {item.thai}
                  </div>

                  <div className="mb-3.5">
                    <input
                      type="text"
                      value={answers[key] || ''}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      placeholder="พิมพ์ประโยคภาษาอังกฤษที่นี่..."
                      autoComplete="off"
                      className="w-full px-4 py-3 text-base sm:text-lg text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 mb-3.5">
                    <button
                      onClick={() => handleOfflineCheck(item, key, 'ex-1')}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                    >
                      🔍 ตรวจคำตอบ
                    </button>

                    <button
                      onClick={() => toggleSolution(key)}
                      className="bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-800 border border-slate-300 px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>{isSolVisible ? '🙈 ซ่อนเฉลย' : '💡 ดูเฉลย'}</span>
                    </button>
                  </div>

                  {/* Feedback Box */}
                  {fb && (
                    <div className={`p-4 rounded-xl text-sm sm:text-base transition-all animate-in fade-in duration-200 mb-3 ${
                      fb.isCorrect 
                        ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                        : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                    }`}>
                      <div className="font-bold flex items-center gap-2 mb-1.5 text-base sm:text-lg">
                        {fb.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                        )}
                        <span>{fb.message}</span>
                      </div>

                      {fb.points && fb.points.length > 0 && (
                        <ul className="space-y-1.5 mt-2 pl-1">
                          {fb.points.map((pt, pIdx) => (
                            <li key={pIdx} className="font-semibold text-sm sm:text-base leading-relaxed">
                              {pt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Solution Box */}
                  {isSolVisible && (
                    <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-[#1e40af] text-sm sm:text-base transition-all animate-in fade-in duration-200">
                      <span className="font-bold block mb-1.5 text-base">เฉลย:</span>
                      <div className="font-mono bg-white px-4 py-2 rounded-lg border border-[#bfdbfe] text-[#1e3a8a] font-bold text-base sm:text-lg">
                        {item.model_answer}
                      </div>
                      {item.acceptable_answers && item.acceptable_answers.length > 1 && (
                        <div className="mt-2.5 space-y-1.5">
                          <span className="font-semibold text-slate-600 block text-xs sm:text-sm">คำตอบอื่นที่เป็นไปได้:</span>
                          {item.acceptable_answers.map((acc: string, aIdx: number) => (
                            <div key={aIdx} className="font-mono bg-white px-3 py-1.5 rounded-lg border border-[#bfdbfe] text-slate-700 text-xs sm:text-sm">
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
        </div>
      )}

      {/* ========================================================= */}
      {/* EXERCISE 2 SECTION */}
      {/* ========================================================= */}
      {ex2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] font-heading flex items-center gap-2.5">
              🧩 {ex2.title || 'Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค'}
            </h2>
            <div className="bg-[#eff6ff] text-[#1e40af] p-4 rounded-xl text-sm sm:text-base mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              📌 <b>คำแนะนำจากครูหวาน:</b> {ex2.instruction || `ให้เลือกคำจากตารางด้านล่างนี้ในหนังสือ Sentence Builder 2 มาเติมในช่องว่างให้สมบูรณ์ ตรวจเช็คการสะกดคำและเครื่องหมายให้ถูกต้องนะคะ`}
            </div>
          </div>

          {/* Vocab Reference Table */}
          <div className="overflow-x-auto my-5 rounded-xl border border-[#e0e7ff] bg-[#faf5ff] p-4 shadow-2xs">
            <table className="w-full text-sm sm:text-base text-left border-collapse bg-white rounded-lg overflow-hidden border border-[#e0e7ff]">
              <thead>
                <tr className="bg-[#1e3a8a] text-white font-semibold font-heading">
                  <th className="p-3.5 border-b border-indigo-100">กำลังทำอะไร</th>
                  <th className="p-3.5 border-b border-indigo-100">เพื่ออะไร (to...)</th>
                  <th className="p-3.5 border-b border-indigo-100">เมื่อไหร่</th>
                  <th className="p-3.5 border-b border-indigo-100">เพราะอะไร (because...)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                <tr>
                  <td className="p-3.5 leading-relaxed">
                    • making breakfast<br />
                    • cleaning my room<br />
                    • adjusting my schedule
                  </td>
                  <td className="p-3.5 leading-relaxed">
                    • to save money<br />
                    • to find my keys<br />
                    • to fit the meeting / schedule
                  </td>
                  <td className="p-3.5 leading-relaxed">
                    • now<br />
                    • right now<br />
                    • at the moment
                  </td>
                  <td className="p-3.5 leading-relaxed">
                    • because it is cheap<br />
                    • because it is messy<br />
                    • because it is necessary / healthy
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-6 mt-6">
            {ex2.items?.map((item: any, idx: number) => {
              const key = `ex2_${item.id || idx + 1}`;
              const fb = feedbacks[key];
              const isSolVisible = showSolutions[key];

              return (
                <div key={key} className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
                  <div className="text-lg sm:text-xl font-bold text-[#1e3a8a] mb-2.5 font-heading">
                    {idx + 1}. {item.prompt}
                  </div>

                  <div className="mb-3.5">
                    <input
                      type="text"
                      value={answers[key] || ''}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      placeholder="พิมพ์ประโยคภาษาอังกฤษฉบับเต็มที่นี่..."
                      autoComplete="off"
                      className="w-full px-4 py-3 text-base sm:text-lg text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                    />
                    <div className="text-xs sm:text-sm text-slate-500 italic mt-1.5 font-medium">
                      คำแนะนำ: พิมพ์ประโยคฉบับเต็ม + อย่าลืมจุด Full stop (.) หลังจบประโยค
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-3.5">
                    <button
                      onClick={() => handleOfflineCheck(item, key, 'ex-2')}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                    >
                      🔍 ตรวจคำตอบ
                    </button>

                    <button
                      onClick={() => toggleSolution(key)}
                      className="bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-800 border border-slate-300 px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>{isSolVisible ? '🙈 ซ่อนเฉลย' : '💡 ดูเฉลย'}</span>
                    </button>
                  </div>

                  {/* Feedback Box */}
                  {fb && (
                    <div className={`p-4 rounded-xl text-sm sm:text-base transition-all animate-in fade-in duration-200 mb-3 ${
                      fb.isCorrect 
                        ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                        : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                    }`}>
                      <div className="font-bold flex items-center gap-2 mb-1.5 text-base sm:text-lg">
                        {fb.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                        )}
                        <span>{fb.message}</span>
                      </div>

                      {fb.points && fb.points.length > 0 && (
                        <ul className="space-y-1.5 mt-2 pl-1">
                          {fb.points.map((pt, pIdx) => (
                            <li key={pIdx} className="font-semibold text-sm sm:text-base leading-relaxed">
                              {pt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Solution Box */}
                  {isSolVisible && (
                    <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-[#1e40af] text-sm sm:text-base transition-all animate-in fade-in duration-200">
                      <span className="font-bold block mb-1.5 text-base">เฉลยที่เป็นไปได้ทั้งหมด:</span>
                      {item.model_answer && (
                        <div className="font-mono bg-white px-4 py-2 rounded-lg border border-[#bfdbfe] text-[#1e3a8a] font-bold mb-1.5 text-base sm:text-lg">
                          • {item.model_answer}
                        </div>
                      )}
                      {item.acceptable_answers?.map((acc: string, aIdx: number) => (
                        <div key={aIdx} className="font-mono bg-white px-3 py-1.5 rounded-lg border border-[#bfdbfe] text-slate-700 text-xs sm:text-sm">
                          • {acc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXERCISE 3 SECTION */}
      {/* ========================================================= */}
      {ex3 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
          <div className="border-b-2 border-blue-50 pb-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] font-heading flex items-center gap-2.5">
              🖼️ {ex3.title || 'Exercise 3: ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect'}
            </h2>
            <div className="bg-[#eff6ff] text-[#1e40af] p-4 rounded-xl text-sm sm:text-base mt-3 border-l-4 border-[#2563eb] leading-relaxed">
              🌟 <b>ข้อแนะนำพิเศษจากครูหวาน:</b> {ex3.instruction || `แบบฝึกหัดนี้ใช้จินตนาการแต่งประโยคจากภาพได้เลยนะคะ ไม่มีถูกไม่มีผิด! ลองแต่งประโยคตามโครงสร้าง 3 กล่องด้านล่างได้เลยค่ะ`}
            </div>
          </div>

          {/* 3 Structure Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
            <div className="bg-white border-2 border-[#2563eb] rounded-2xl p-4 shadow-2xs">
              <span className="font-bold text-[#1e3a8a] text-sm sm:text-base block border-b border-blue-100 pb-1.5 mb-1.5 font-heading">
                🔵 Core (ส่วนหลัก)
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <b>ฉันกำลังทำอะไร:</b><br />
                <code className="bg-slate-100 text-[#0369a1] px-2 py-0.5 rounded font-mono text-xs sm:text-sm font-bold">I am + V.ing</code>
              </p>
            </div>

            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xs">
              <span className="font-bold text-emerald-800 text-sm sm:text-base block border-b border-emerald-100 pb-1.5 mb-1.5 font-heading">
                🟢 Context (บริบท)
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <b>เพื่ออะไร:</b> <code className="bg-slate-100 text-[#0369a1] px-2 py-0.5 rounded font-mono text-xs sm:text-sm font-bold">to + V.inf</code><br />
                <b>เมื่อไหร่:</b> <code className="bg-slate-100 text-[#0369a1] px-2 py-0.5 rounded font-mono text-xs sm:text-sm font-bold">now / right now</code>
              </p>
            </div>

            <div className="bg-white border-2 border-amber-500 rounded-2xl p-4 shadow-2xs">
              <span className="font-bold text-amber-800 text-sm sm:text-base block border-b border-amber-100 pb-1.5 mb-1.5 font-heading">
                🟠 Connect (ส่วนเชื่อม)
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <b>เพราะอะไร:</b><br />
                <code className="bg-slate-100 text-[#0369a1] px-2 py-0.5 rounded font-mono text-xs sm:text-sm font-bold">because it is + Adj</code>
              </p>
            </div>
          </div>

          <div className="space-y-6 mt-6">
            {ex3.items?.map((item: any, idx: number) => {
              const key = `ex3_${item.id || idx + 1}`;
              const fb = feedbacks[key];
              const isLoading = aiLoading[key];

              return (
                <div key={key} className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
                  <div className="text-lg sm:text-xl font-bold text-[#1e3a8a] mb-2.5 font-heading">
                    ภาพที่ {idx + 1}: {item.image_description}
                  </div>

                  {item.context_hint && (
                    <p className="text-xs sm:text-sm text-slate-600 mb-3.5 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                      💡 คำใบ้บริบทภาพ: <span className="font-bold text-slate-800">{item.context_hint}</span>
                    </p>
                  )}

                  <div className="mb-3.5">
                    <input
                      type="text"
                      value={answers[key] || ''}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      placeholder={`แต่งประโยคจากภาพที่ ${idx + 1} ที่นี่...`}
                      autoComplete="off"
                      className="w-full px-4 py-3 text-base sm:text-lg text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 mb-3.5">
                    <button
                      onClick={() => handleAiCheck(item, key, idx)}
                      disabled={isLoading}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>กำลัง AI ตรวจทาน...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>✨ ตรวจสอบประโยคของฉัน</span>
                        </>
                      )}
                    </button>

                    <a
                      href="https://quillbot.com/grammar-check"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 transition-all shadow-2xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>🌐 ตรวจ Grammar ด้วย QuillBot</span>
                    </a>
                  </div>

                  {/* Feedback Box */}
                  {fb && (
                    <div className={`p-4 rounded-xl text-sm sm:text-base transition-all animate-in fade-in duration-200 ${
                      fb.isCorrect 
                        ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                        : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                    }`}>
                      <div className="font-bold flex items-center gap-2 mb-1.5 text-base sm:text-lg">
                        {fb.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                        )}
                        <span>{fb.message}</span>
                      </div>

                      {fb.points && fb.points.length > 0 && (
                        <ul className="space-y-1.5 mt-2 pl-1">
                          {fb.points.map((pt, pIdx) => (
                            <li key={pIdx} className="font-semibold text-sm sm:text-base leading-relaxed">
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
        </div>
      )}
    </div>
  );
}
