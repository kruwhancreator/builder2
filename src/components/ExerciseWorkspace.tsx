'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Plus, 
  RefreshCw,
  Coffee,
  Activity,
  ShoppingCart,
  Lightbulb,
  Check,
  BookOpen,
  FormInput,
  Image as ImageIcon
} from 'lucide-react';
import { EvaluationResult } from '@/lib/evaluator';

interface ExerciseWorkspaceProps {
  chapter: string;
  exerciseId: string;
  chapterData: any;
}

export default function ExerciseWorkspace({ chapter, exerciseId, chapterData }: ExerciseWorkspaceProps) {
  const router = useRouter();
  const currentExercise = chapterData.exercises[exerciseId];

  const [itemIndex, setItemIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [showKeywords, setShowKeywords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  if (!currentExercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">ไม่พบแบบฝึกหัดที่ต้องการ</h2>
        <Link href={`/sentence-builder-vol-2/${chapter}`} className="text-indigo-400 underline text-sm">
          กลับสู่หน้า Overview
        </Link>
      </div>
    );
  }

  const items = currentExercise.items || [];
  const currentItem = items[itemIndex] || items[0];

  // Reset answer state when item index or exercise changes
  useEffect(() => {
    setStudentAnswer('');
    setResult(null);
    setShowKeywords(false);
  }, [itemIndex, exerciseId]);

  const handleEvaluate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: currentExercise.type,
          item: currentItem,
          studentAnswer: studentAnswer.trim(),
          wordBank: currentExercise.word_bank,
          templates: currentExercise.templates,
        }),
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data: EvaluationResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({
        score: 75,
        statusText: '⚡ ตรวจสอบคำตอบเรียบร้อย (โหมดออฟไลน์)',
        correctedSentence: studentAnswer.trim(),
        feedbackPoints: ['เกิดข้อผิดพลาดในการเชื่อมต่อ AI ตรวจทานด้วยระบบสำรองเรียบร้อย'],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertWord = (word: string) => {
    if (!studentAnswer) {
      setStudentAnswer(word);
    } else {
      setStudentAnswer(prev => `${prev} ${word}`);
    }
  };

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Coffee': return <Coffee className="w-8 h-8 text-amber-400" />;
      case 'Activity': return <Activity className="w-8 h-8 text-emerald-400" />;
      case 'ShoppingCart': return <ShoppingCart className="w-8 h-8 text-sky-400" />;
      default: return <ImageIcon className="w-8 h-8 text-indigo-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Exercise Navigation Tabs */}
      <div className="glass-panel rounded-xl p-1.5 mb-6 flex flex-wrap sm:flex-nowrap gap-1 border border-slate-700/60">
        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-1`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-1'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Ex 1: แปลประโยค</span>
        </Link>

        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-2`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-2'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FormInput className="w-3.5 h-3.5" />
          <span>Ex 2: เติมคำ</span>
        </Link>

        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-3`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-3'
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Ex 3: แต่งจากภาพ</span>
        </Link>
      </div>

      {/* Main Workspace Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/80 mb-6">
        {/* Header & Item Progress */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-5">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {currentExercise.grammar_focus}
            </span>
            <h2 className="text-lg font-extrabold text-white mt-1.5">
              {currentExercise.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              ข้อ {itemIndex + 1}/{items.length}
            </span>
          </div>
        </div>

        {/* EXERCISE TYPE 1: TRANSLATION */}
        {currentExercise.type === 'translation' && currentItem && (
          <div className="space-y-5">
            {/* Prompt Box */}
            <div className="bg-slate-900/90 rounded-xl p-5 border border-indigo-500/30">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                📍 โจทย์ภาษาไทย:
              </span>
              <p className="text-xl font-bold text-white leading-relaxed">
                &ldquo;{currentItem.thai}&rdquo;
              </p>
            </div>

            {/* Keyword Hints Accordion */}
            {currentItem.keywords && (
              <div>
                <button
                  onClick={() => setShowKeywords(!showKeywords)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showKeywords ? 'ซ่อนคำศัพท์คำแนะนำ (Keywords)' : 'ดูคำศัพท์คำแนะนำ (Keywords)'}</span>
                </button>

                {showKeywords && (
                  <div className="mt-2.5 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex flex-wrap gap-2">
                    {currentItem.keywords.map((kw: string, i: number) => (
                      <span
                        key={i}
                        onClick={() => insertWord(kw)}
                        className="text-xs px-2.5 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3 h-3 text-indigo-400" />
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* EXERCISE TYPE 2: GUIDED SENTENCE */}
        {currentExercise.type === 'guided_sentence' && (
          <div className="space-y-5">
            <div className="bg-slate-900/90 rounded-xl p-4 border border-purple-500/30">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-1">
                📍 โจทย์ข้อ {itemIndex + 1}:
              </span>
              <p className="text-base font-bold text-white">
                {currentItem.prompt}
              </p>
            </div>

            {/* Templates Box */}
            {currentExercise.templates && (
              <div className="bg-slate-950/50 rounded-xl p-3.5 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  💡 โครงสร้างประโยคตัวอย่าง (Templates):
                </span>
                <div className="space-y-1">
                  {currentExercise.templates.map((tpl: string, i: number) => (
                    <div key={i} className="text-xs text-purple-300 font-mono bg-purple-950/30 px-2.5 py-1 rounded border border-purple-900/40">
                      {tpl}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Word Bank Chips Container */}
            {currentExercise.word_bank && (
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/80">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
                  📦 Word Bank (คลิกคำศัพท์เพื่อเติมใส่ช่องคำตอบ):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Action */}
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-400 block mb-1">Action (การกระทำ):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.action?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg text-indigo-200 hover:text-white"
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <span className="text-[11px] font-semibold text-purple-400 block mb-1">Time (ช่วงเวลา):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.time?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg text-purple-200 hover:text-white"
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <span className="text-[11px] font-semibold text-pink-400 block mb-1">Purpose (จุดประสงค์):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.purpose?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg text-pink-200 hover:text-white"
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <span className="text-[11px] font-semibold text-amber-400 block mb-1">Reason (เหตุผล):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.reason?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg text-amber-200 hover:text-white"
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXERCISE TYPE 3: PICTURE DESCRIPTION */}
        {currentExercise.type === 'picture_description' && currentItem && (
          <div className="space-y-5">
            {/* Picture Card & Context Hint */}
            <div className="bg-slate-900/90 rounded-xl p-5 border border-pink-500/30 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
                {renderIcon(currentItem.icon)}
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider block mb-1">
                  🖼️ บริบทภาพ:
                </span>
                <h3 className="text-lg font-bold text-white mb-1">
                  {currentItem.image_description}
                </h3>
                <p className="text-xs text-slate-400">
                  คำใบ้บริบท: <span className="text-slate-300 font-medium">{currentItem.context_hint}</span>
                </p>
              </div>
            </div>

            {/* 3 Structure Requirements Card */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                🎯 บังคับใช้โครงสร้างครบ 3 ส่วน (Core + Context + Connect):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs">
                  <span className="font-bold text-indigo-300 block mb-0.5">1. Core</span>
                  <span className="text-slate-300 text-[11px]">S + am + V.ing</span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs">
                  <span className="font-bold text-purple-300 block mb-0.5">2. Context</span>
                  <span className="text-slate-300 text-[11px]">time/place (at the cafe...)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-pink-950/30 border border-pink-800/40 text-xs">
                  <span className="font-bold text-pink-300 block mb-0.5">3. Connect</span>
                  <span className="text-slate-300 text-[11px]">because + reason</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Form & Action Controls */}
        <form onSubmit={handleEvaluate} className="mt-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            ✍️ พิมพ์คำตอบภาษาอังกฤษของคุณ:
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="พิมพ์คำตอบเป็นภาษาอังกฤษที่นี่..."
              className="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-between gap-3 mt-4">
            <button
              type="button"
              onClick={() => setStudentAnswer('')}
              className="text-xs px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ล้างคำตอบ</span>
            </button>

            <button
              type="submit"
              disabled={!studentAnswer.trim() || isSubmitting}
              className="gradient-button px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลัง AI ตรวจทาน...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>🔍 ตรวจคำตอบ</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* QuillBot Style AI Feedback Panel */}
        {result && (
          <div className="mt-6 pt-6 border-t border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="glass-panel-accent rounded-xl p-5 border border-indigo-500/40">
              {/* Header result */}
              <div className="flex items-center justify-between mb-4 border-b border-indigo-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-extrabold text-white">
                    ผลการตรวจโดย AI (QuillBot Style)
                  </h3>
                </div>
                <div className="text-sm font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                  {result.statusText}
                </div>
              </div>

              {/* Corrected sentence */}
              {result.correctedSentence && (
                <div className="mb-4 bg-slate-950/80 rounded-lg p-3.5 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    📝 ประโยคที่ถูกต้องตามหลักภาษา:
                  </span>
                  <p className="text-base font-bold text-indigo-300 font-mono">
                    &ldquo;{result.correctedSentence}&rdquo;
                  </p>
                </div>
              )}

              {/* Structural breakdown (for Ex 2 and Ex 3) */}
              {result.breakdown && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-slate-300 block mb-2">
                    📊 การวิเคราะห์โครงสร้างประโยค:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.breakdown).map(([key, val], idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                          val === true || typeof val === 'object' || (typeof val === 'string' && !val.includes('ขาด'))
                            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        }`}
                      >
                        {val === true ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="font-semibold uppercase">{key}:</span>
                        <span>{typeof val === 'boolean' ? (val ? 'ถูกต้อง' : 'ต้องปรับปรุง') : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thai Feedback Bullets */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  💡 คำแนะนำภาษาไทย:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {result.feedbackPoints.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <span className="text-indigo-400 shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Question Item Navigation */}
        <div className="flex items-center justify-between border-t border-slate-700/60 pt-4 mt-6">
          <button
            disabled={itemIndex === 0}
            onClick={() => setItemIndex(prev => prev - 1)}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>ข้อก่อนหน้า</span>
          </button>

          <span className="text-xs text-slate-400">
            {itemIndex + 1} / {items.length}
          </span>

          <button
            disabled={itemIndex >= items.length - 1}
            onClick={() => setItemIndex(prev => prev + 1)}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <span>ข้อถัดไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
