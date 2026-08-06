'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Sparkles, 
  ExternalLink,
  BookOpen,
  FormInput,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { EvaluationResult } from '@/lib/evaluator';

interface ExerciseWorkspaceProps {
  chapter: string;
  exerciseId: string;
  chapterData: any;
}

export default function ExerciseWorkspace({ chapter, exerciseId, chapterData }: ExerciseWorkspaceProps) {
  const currentExercise = chapterData.exercises[exerciseId] || chapterData.exercises['ex-1'];

  // State per question item: answers, feedback, solution visibility, loading state
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, { isCorrect: boolean; message: string; points: string[] }>>({});
  const [showSolutions, setShowSolutions] = useState<Record<number, boolean>>({});
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setAnswers({});
    setFeedbacks({});
    setShowSolutions({});
    setAiLoading({});
  }, [exerciseId, chapter]);

  const items = currentExercise?.items || [];

  const handleAnswerChange = (itemId: number, text: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: text }));
  };

  const toggleSolution = (itemId: number) => {
    setShowSolutions(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // OFFLINE GRAMMAR CHECKER FOR EXERCISE 1 & EXERCISE 2 (NO AI API CALL)
  const checkOfflineGrammar = (item: any, studentAns: string) => {
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
    const lower = raw.toLowerCase();
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

  // Check button click handler
  const handleCheck = async (item: any, idx: number) => {
    const studentAns = answers[item.id] || '';

    // Exercise 1 & Exercise 2: Pure Offline Grammar Check (No AI)
    if (exerciseId === 'ex-1' || exerciseId === 'ex-2' || currentExercise.type !== 'picture_description') {
      const result = checkOfflineGrammar(item, studentAns);
      setFeedbacks(prev => ({ ...prev, [item.id]: result }));
      return;
    }

    // Exercise 3: Picture Description (Uses AI / Gemini)
    if (!studentAns.trim()) {
      setFeedbacks(prev => ({
        ...prev,
        [item.id]: {
          isCorrect: false,
          message: '❌ กรุณาพิมพ์คำตอบภาษาอังกฤษก่อนกดตรวจค่ะ',
          points: ['ยังไม่ได้พิมพ์คำตอบในช่องข้อความ']
        }
      }));
      return;
    }

    setAiLoading(prev => ({ ...prev, [item.id]: true }));

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: currentExercise.type,
          itemIndex: idx,
          exerciseId,
          studentAnswer: studentAns.trim(),
          chapter
        })
      });

      if (!res.ok) throw new Error('API Request failed');

      const data: EvaluationResult = await res.json();

      setFeedbacks(prev => ({
        ...prev,
        [item.id]: {
          isCorrect: data.score >= 80,
          message: data.statusText || (data.score >= 80 ? '🎉 ประโยคถูกต้องตามโครงสร้าง!' : '⚡ มีบางจุดต้องปรับปรุง'),
          points: data.feedbackPoints || []
        }
      }));
    } catch (err) {
      console.error(err);
      setFeedbacks(prev => ({
        ...prev,
        [item.id]: {
          isCorrect: false,
          message: '⚡ ตรวจทานด้วยระบบสำรองเรียบร้อยแล้ว',
          points: ['ประโยคตามโครงสร้าง Core + Context + Connect']
        }
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Exercise Navigation Tabs */}
      <div className="bg-white rounded-xl p-1.5 mb-6 flex flex-wrap sm:flex-nowrap gap-1.5 border border-slate-200 shadow-xs">
        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-1`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-1'
              ? 'bg-[#1e3a8a] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Exercise 1: แปลประโยค</span>
        </Link>

        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-2`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-2'
              ? 'bg-[#2563eb] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FormInput className="w-3.5 h-3.5" />
          <span>Exercise 2: เติมคำแต่งประโยค</span>
        </Link>

        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-3`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-3'
              ? 'bg-[#8b5cf6] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Exercise 3: แต่งจากภาพ</span>
        </Link>
      </div>

      {/* Header Card (Matching sentence_builder_unit1_answers.html) */}
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-md relative overflow-hidden">
        <span className="inline-block bg-white/20 backdrop-blur-xs text-white text-xs font-medium px-3.5 py-1 rounded-full mb-2">
          📘 หนังสือ Sentence Builder 2
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading mb-1">
          เฉลยแบบฝึกหัด Unit {chapterData.chapter}: {currentExercise.title}
        </h1>
        <p className="text-sm opacity-90">
          พัฒนาทักษะการแต่งประโยคภาษาอังกฤษอย่างมั่นใจ ไวยากรณ์เป๊ะ!
        </p>
      </div>

      {/* Teacher Persona Card */}
      <div className="bg-white border-l-4 border-[#2563eb] rounded-xl p-4 sm:p-5 shadow-xs mb-6 flex items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 text-[#1e3a8a] flex items-center justify-center text-2xl shrink-0 border-2 border-[#2563eb]">
          👩‍🏫
        </div>
        <div className="text-xs sm:text-sm text-[#1e293b] leading-relaxed">
          <span className="font-bold text-[#1e3a8a] block mb-0.5">ครูหวาน อิงลิช ออน แอร์:</span>
          &ldquo;สวัสดีค่ะนักเรียนคนเก่ง! วันนี้ครูหวานทำระบบเฉลยและตรวจแบบฝึกหัด Unit {chapterData.chapter} มาให้นะคะ พิมพ์คำตอบแล้วกดตรวจได้เลย ครูมีคำแนะนำให้อย่างละเอียดถ้าพิมพ์ผิดจุดไหน พยายามทำให้เต็มที่นะคะ! 💖&rdquo;
        </div>
      </div>

      {/* Exercise Main Container */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
        <div className="border-b-2 border-blue-50 pb-4 mb-6">
          <h2 className="text-xl font-bold text-[#1e3a8a] font-heading flex items-center gap-2">
            {exerciseId === 'ex-1' && '✏️ Exercise 1: แต่งประโยคภาษาอังกฤษ'}
            {exerciseId === 'ex-2' && '🧩 Exercise 2: เลือกคำจากที่มีให้มาแต่งประโยค'}
            {exerciseId === 'ex-3' && '🖼️ Exercise 3: ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect'}
          </h2>

          <div className="bg-[#eff6ff] text-[#1e40af] p-3 rounded-lg text-xs mt-3 border-l-4 border-[#2563eb]">
            📌 <b>คำแนะนำจากครูหวาน:</b>{' '}
            {exerciseId === 'ex-1' && 'โปรดใช้คำศัพท์จาก Unit 1 ในหนังสือ Sentence Builder 2 ในการตอบนะคะ ระบบจะตรวจคำตอบแบบเป๊ะๆ (รวมถึงการพิมพ์ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และจุด Full Stop . ด้านหลังด้วยน้า)'}
            {exerciseId === 'ex-2' && 'ให้เลือกคำจากตารางด้านล่างนี้ในหนังสือ Sentence Builder 2 มาเติมในช่องว่างให้สมบูรณ์ ตรวจเช็คการสะกดคำและเครื่องหมายให้ถูกต้องนะคะ'}
            {exerciseId === 'ex-3' && 'แบบฝึกหัดนี้ใช้จินตนาการแต่งประโยคจากภาพได้เลยนะคะ ไม่มีถูกไม่มีผิด! ลองแต่งประโยคตามโครงสร้าง 3 กล่องด้านล่างได้เลยค่ะ'}
          </div>
        </div>

        {/* Vocab Reference Table for Exercise 2 */}
        {exerciseId === 'ex-2' && currentExercise.word_bank && (
          <div className="overflow-x-auto my-4 rounded-xl border border-indigo-100 bg-[#faf5ff] p-4">
            <span className="text-xs font-bold text-[#1e3a8a] uppercase block mb-2">
              📋 ตารางคำศัพท์อ้างอิง (Word Bank Reference):
            </span>
            <table className="w-full text-xs text-left border-collapse bg-white rounded-lg overflow-hidden shadow-2xs">
              <thead>
                <tr className="bg-[#1e3a8a] text-white font-semibold">
                  <th className="p-2.5">กำลังทำอะไร (Action)</th>
                  <th className="p-2.5">เพื่ออะไร (Purpose: to...)</th>
                  <th className="p-2.5">เมื่อไหร่ (Time)</th>
                  <th className="p-2.5">เพราะอะไร (Reason: because...)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-2.5 font-medium">
                    • making breakfast<br />
                    • cleaning my room<br />
                    • adjusting my schedule
                  </td>
                  <td className="p-2.5 font-medium">
                    • to save money<br />
                    • to find my keys<br />
                    • to fit my schedule / meeting
                  </td>
                  <td className="p-2.5 font-medium">
                    • now<br />
                    • right now<br />
                    • at the moment
                  </td>
                  <td className="p-2.5 font-medium">
                    • because it is cheap<br />
                    • because it is messy<br />
                    • because it is necessary / healthy
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3 Structure Cards for Exercise 3 */}
        {exerciseId === 'ex-3' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="bg-white border border-[#2563eb] rounded-xl p-3.5 shadow-2xs">
              <span className="font-bold text-[#1e3a8a] text-xs block border-b border-blue-100 pb-1 mb-1">
                🔵 Core (ส่วนหลัก)
              </span>
              <p className="text-xs text-slate-700">
                <b>ฉันกำลังทำอะไร:</b><br />
                <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-[11px]">I am + V.ing / The man is...</code>
              </p>
            </div>

            <div className="bg-white border border-emerald-500 rounded-xl p-3.5 shadow-2xs">
              <span className="font-bold text-emerald-800 text-xs block border-b border-emerald-100 pb-1 mb-1">
                🟢 Context (บริบท)
              </span>
              <p className="text-xs text-slate-700">
                <b>เพื่ออะไร:</b> <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-[11px]">to + V.inf</code><br />
                <b>เมื่อไหร่/สถานที่:</b> <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-[11px]">now / at the cafe</code>
              </p>
            </div>

            <div className="bg-white border border-amber-500 rounded-xl p-3.5 shadow-2xs">
              <span className="font-bold text-amber-800 text-xs block border-b border-amber-100 pb-1 mb-1">
                🟠 Connect (ส่วนเชื่อม)
              </span>
              <p className="text-xs text-slate-700">
                <b>เพราะอะไร:</b><br />
                <code className="bg-slate-100 text-[#0369a1] px-1.5 py-0.5 rounded font-mono text-[11px]">because it is + Adjective</code>
              </p>
            </div>
          </div>
        )}

        {/* Question Cards List */}
        <div className="space-y-6 mt-6">
          {items.map((item: any, idx: number) => {
            const fb = feedbacks[item.id];
            const isSolVisible = showSolutions[item.id];
            const isLoading = aiLoading[item.id];

            return (
              <div key={item.id || idx} className="bg-[#f8fafc] border border-slate-200 rounded-xl p-5 shadow-2xs">
                {/* Question Prompt Title */}
                <div className="text-base font-bold text-[#1e3a8a] mb-2 font-heading">
                  {exerciseId === 'ex-1' && `${idx + 1}. ${item.thai}`}
                  {exerciseId === 'ex-2' && `${idx + 1}. ${item.prompt}`}
                  {exerciseId === 'ex-3' && `ภาพที่ ${idx + 1}: ${item.image_description}`}
                </div>

                {/* Context hint for Ex 3 */}
                {exerciseId === 'ex-3' && item.context_hint && (
                  <p className="text-xs text-slate-600 mb-3 bg-amber-50 p-2 rounded border border-amber-200">
                    💡 คำใบ้บริบทภาพ: <span className="font-semibold text-slate-800">{item.context_hint}</span>
                  </p>
                )}

                {/* English Input Field */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={answers[item.id] || ''}
                    onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                    placeholder="พิมพ์ประโยคภาษาอังกฤษที่นี่..."
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all bg-white font-sans"
                  />
                  {exerciseId === 'ex-2' && (
                    <div className="text-[11px] text-slate-500 italic mt-1">
                      คำแนะนำ: พิมพ์ประโยคฉบับเต็ม + อย่าลืมจุด Full stop (.) หลังจบประโยค
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => handleCheck(item, idx)}
                    disabled={isLoading}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลัง AI ตรวจทาน...</span>
                      </>
                    ) : (
                      <>
                        {exerciseId === 'ex-3' ? <Sparkles className="w-3.5 h-3.5" /> : <span>🔍</span>}
                        <span>{exerciseId === 'ex-3' ? '✨ ตรวจสอบประโยคของฉัน' : '🔍 ตรวจคำตอบ'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => toggleSolution(item.id)}
                    className="bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-800 border border-slate-300 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isSolVisible ? '🙈 ซ่อนเฉลย' : '💡 ดูเฉลย'}</span>
                  </button>

                  {exerciseId === 'ex-3' && (
                    <a
                      href="https://quillbot.com/grammar-check"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>🌐 ตรวจ Grammar ด้วย QuillBot</span>
                    </a>
                  )}
                </div>

                {/* Feedback Box (Matching sentence_builder_unit1_answers.html) */}
                {fb && (
                  <div className={`p-3.5 rounded-lg text-xs transition-all animate-in fade-in duration-200 mb-3 ${
                    fb.isCorrect 
                      ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' 
                      : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                      {fb.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{fb.message}</span>
                    </div>

                    {fb.points && fb.points.length > 0 && (
                      <ul className="space-y-1 mt-1.5 pl-1">
                        {fb.points.map((pt, pIdx) => (
                          <li key={pIdx} className="font-medium text-[11px] leading-relaxed">
                            {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Solution Box (Matching sentence_builder_unit1_answers.html) */}
                {isSolVisible && (
                  <div className="p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg text-[#1e40af] text-xs transition-all animate-in fade-in duration-200">
                    <span className="font-bold block mb-1">
                      {item.acceptable_answers && item.acceptable_answers.length > 1 ? 'เฉลยที่เป็นไปได้ทั้งหมด:' : 'เฉลย:'}
                    </span>
                    
                    {item.model_answer && (
                      <div className="font-mono bg-white px-2.5 py-1 rounded border border-[#bfdbfe] text-[#1e3a8a] font-bold mb-1">
                        {item.model_answer}
                      </div>
                    )}

                    {item.acceptable_answers?.map((acc: string, aIdx: number) => (
                      <div key={aIdx} className="font-mono bg-white px-2.5 py-1 rounded border border-[#bfdbfe] text-slate-700 my-0.5">
                        {aIdx + 1}) {acc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
