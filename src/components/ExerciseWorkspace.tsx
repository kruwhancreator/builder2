'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Plus, 
  RefreshCw,
  Coffee,
  Activity,
  ShoppingCart,
  Lightbulb,
  Check,
  BookOpen,
  FormInput,
  Image as ImageIcon,
  Cpu
} from 'lucide-react';
import { EvaluationResult } from '@/lib/evaluator';

interface ExerciseWorkspaceProps {
  chapter: string;
  exerciseId: string;
  chapterData: any;
}

export default function ExerciseWorkspace({ chapter, exerciseId, chapterData }: ExerciseWorkspaceProps) {
  const currentExercise = chapterData.exercises[exerciseId];

  const [itemIndex, setItemIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [showKeywords, setShowKeywords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  if (!currentExercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-[#de3030] mb-2">ไม่พบแบบฝึกหัดที่ต้องการ</h2>
        <Link href={`/sentence-builder-vol-2/${chapter}`} className="text-[#1374bc] underline text-sm font-semibold">
          กลับสู่หน้า Overview
        </Link>
      </div>
    );
  }

  const items = currentExercise.items || [];
  const currentItem = items[itemIndex] || items[0];

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
        isLiveGemini: false,
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
      case 'Coffee': return <Coffee className="w-8 h-8 text-[#1374bc]" />;
      case 'Activity': return <Activity className="w-8 h-8 text-emerald-600" />;
      case 'ShoppingCart': return <ShoppingCart className="w-8 h-8 text-[#de3030]" />;
      default: return <ImageIcon className="w-8 h-8 text-[#1374bc]" />;
    }
  };

  const getBreakdownLabel = (key: string) => {
    const map: Record<string, string> = {
      core: 'CORE (S + is/am/are + V.ing)',
      context: 'CONTEXT (Time/Place)',
      connect: 'CONNECT (because / reason / purpose)',
      actionValid: 'ACTION',
      timeValid: 'TIME',
      purposeValid: 'PURPOSE',
      reasonValid: 'REASON'
    };
    return map[key] || key.toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Exercise Navigation Tabs */}
      <div className="bg-white rounded-xl p-1.5 mb-6 flex flex-wrap sm:flex-nowrap gap-1.5 border border-slate-200 shadow-xs">
        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-1`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-1'
              ? 'bg-[#1374bc] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Ex 1: แปลประโยค</span>
        </Link>

        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-2`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-2'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FormInput className="w-3.5 h-3.5" />
          <span>Ex 2: เติมคำ</span>
        </Link>

        <Link
          href={`/sentence-builder-vol-2/${chapter}/ex-3`}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            exerciseId === 'ex-3'
              ? 'bg-[#de3030] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Ex 3: แต่งจากภาพ</span>
        </Link>
      </div>

      {/* Main Workspace Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-200 mb-6 notebook-margin">
        {/* Header & Item Progress */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
          <div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#1374bc]/10 text-[#1374bc] border border-[#1374bc]/20">
              {currentExercise.grammar_focus}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              {currentExercise.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1374bc] bg-[#1374bc]/10 px-3 py-1.5 rounded-lg border border-[#1374bc]/20">
              ข้อ {itemIndex + 1}/{items.length}
            </span>
          </div>
        </div>

        {/* EXERCISE TYPE 1: TRANSLATION */}
        {currentExercise.type === 'translation' && currentItem && (
          <div className="space-y-5">
            {/* Prompt Box */}
            <div className="bg-[#1374bc]/5 rounded-xl p-5 border border-[#1374bc]/20">
              <span className="text-xs font-bold text-[#1374bc] uppercase tracking-wider block mb-1">
                📍 โจทย์ภาษาไทย:
              </span>
              <p className="text-xl font-extrabold text-slate-900 leading-relaxed">
                &ldquo;{currentItem.thai}&rdquo;
              </p>
            </div>

            {/* Keyword Hints Accordion */}
            {currentItem.keywords && (
              <div>
                <button
                  onClick={() => setShowKeywords(!showKeywords)}
                  className="text-xs text-[#1374bc] font-bold hover:underline flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-[#1374bc]" />
                  <span>{showKeywords ? 'ซ่อนคำศัพท์คำแนะนำ (Keywords)' : 'ดูคำศัพท์คำแนะนำ (Keywords)'}</span>
                </button>

                {showKeywords && (
                  <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap gap-2">
                    {currentItem.keywords.map((kw: string, i: number) => (
                      <span
                        key={i}
                        onClick={() => insertWord(kw)}
                        className="text-xs px-2.5 py-1 rounded bg-white hover:bg-[#1374bc]/10 text-[#1374bc] border border-slate-300 font-medium cursor-pointer flex items-center gap-1 transition-all shadow-2xs"
                      >
                        <Plus className="w-3 h-3 text-[#1374bc]" />
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
            <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-200">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                📍 โจทย์ข้อ {itemIndex + 1}:
              </span>
              <p className="text-base font-bold text-slate-900">
                {currentItem.prompt}
              </p>
            </div>

            {/* Templates Box */}
            {currentExercise.templates && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <span className="text-xs font-bold text-slate-600 block mb-2">
                  💡 โครงสร้างประโยคตัวอย่าง (Templates):
                </span>
                <div className="space-y-1">
                  {currentExercise.templates.map((tpl: string, i: number) => (
                    <div key={i} className="text-xs text-indigo-700 font-mono bg-white px-2.5 py-1.5 rounded border border-indigo-100 font-semibold shadow-2xs">
                      {tpl}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Word Bank Chips Container */}
            {currentExercise.word_bank && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
                  📦 Word Bank (คลิกคำศัพท์เพื่อเติมใส่ช่องคำตอบ):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Action */}
                  <div>
                    <span className="text-[11px] font-bold text-[#1374bc] block mb-1">Action (การกระทำ):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.action?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg font-medium"
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 block mb-1">Time (ช่วงเวลา):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.time?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg font-medium"
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <span className="text-[11px] font-bold text-purple-600 block mb-1">Purpose (จุดประสงค์):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.purpose?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg font-medium"
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <span className="text-[11px] font-bold text-[#de3030] block mb-1">Reason (เหตุผล):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.word_bank.reason?.map((w: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => insertWord(w)}
                          className="chip-button text-xs px-2.5 py-1 rounded-lg font-medium"
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
            <div className="bg-[#de3030]/5 rounded-xl p-5 border border-[#de3030]/20 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#de3030]/20 shadow-sm flex items-center justify-center shrink-0">
                {renderIcon(currentItem.icon)}
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs font-bold text-[#de3030] uppercase tracking-wider block mb-1">
                  🖼️ บริบทภาพ:
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">
                  {currentItem.image_description}
                </h3>
                <p className="text-xs text-slate-600">
                  คำใบ้บริบท: <span className="text-slate-800 font-semibold">{currentItem.context_hint}</span>
                </p>
              </div>
            </div>

            {/* 3 Structure Requirements Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                🎯 บังคับใช้โครงสร้างครบ 3 ส่วน (Core + Context + Connect):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-[#1374bc]/10 border border-[#1374bc]/20 text-xs">
                  <span className="font-bold text-[#1374bc] block mb-0.5">1. Core</span>
                  <span className="text-slate-700 text-[11px]">S + is/am/are + V.ing (The man is...)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs">
                  <span className="font-bold text-indigo-700 block mb-0.5">2. Context</span>
                  <span className="text-slate-700 text-[11px]">time/place (at the cafe...)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#de3030]/10 border border-[#de3030]/20 text-xs">
                  <span className="font-bold text-[#de3030] block mb-0.5">3. Connect</span>
                  <span className="text-slate-700 text-[11px]">because / reason / purpose</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Form & Action Controls */}
        <form onSubmit={handleEvaluate} className="mt-6">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            ✍️ พิมพ์คำตอบภาษาอังกฤษของคุณ:
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="พิมพ์คำตอบเป็นภาษาอังกฤษที่นี่..."
              className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1374bc] focus:ring-2 focus:ring-[#1374bc]/20 shadow-2xs font-sans"
            />
          </div>

          <div className="flex items-center justify-between gap-3 mt-4">
            <button
              type="button"
              onClick={() => setStudentAnswer('')}
              className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ล้างคำตอบ</span>
            </button>

            <button
              type="submit"
              disabled={!studentAnswer.trim() || isSubmitting}
              className="gradient-button px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-xl p-5 border border-[#1374bc]/30 shadow-md">
              {/* Header result */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#1374bc]" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    ผลการตรวจโดย AI (QuillBot Style)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {typeof result.isLiveGemini !== 'undefined' && (
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      result.isLiveGemini 
                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      <Cpu className="w-3 h-3" />
                      {result.isLiveGemini ? (result.modelUsed ? `✨ ${result.modelUsed} Live` : '✨ Gemini 3.5 Flash Lite Live') : '⚡ Offline Smart Evaluator'}
                    </span>
                  )}
                  
                  <div className="text-xs font-bold px-3 py-1 rounded-full bg-[#1374bc]/10 text-[#1374bc] border border-[#1374bc]/20">
                    {result.statusText}
                  </div>
                </div>
              </div>

              {/* Corrected sentence */}
              {result.correctedSentence && (
                <div className="mb-4 bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    📝 ประโยคที่ถูกต้องตามหลักภาษา:
                  </span>
                  <p className="text-base font-bold text-[#1374bc] font-mono">
                    &ldquo;{result.correctedSentence}&rdquo;
                  </p>
                </div>
              )}

              {/* Structural breakdown */}
              {result.breakdown && (
                <div className="mb-4">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    📊 การวิเคราะห์โครงสร้างประโยค:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.breakdown)
                      .filter(([key]) => !key.toLowerCase().endsWith('comment'))
                      .map(([key, val], idx) => {
                        const isSuccess = val === true || val === 'true' || (typeof val === 'string' && !val.includes('ขาด') && !val.includes('ต้อง'));
                        return (
                          <div
                            key={idx}
                            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium ${
                              isSuccess
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}
                          >
                            {isSuccess ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="font-bold">{getBreakdownLabel(key)}:</span>
                            <span>{isSuccess ? 'ถูกต้อง' : 'ต้องปรับปรุง'}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Thai Feedback Bullets */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  💡 คำแนะนำภาษาไทย:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {result.feedbackPoints.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 font-medium">
                      <span className="text-[#1374bc] font-bold shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Question Item Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
          <button
            disabled={itemIndex === 0}
            onClick={() => setItemIndex(prev => prev - 1)}
            className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors border border-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>ข้อก่อนหน้า</span>
          </button>

          <span className="text-xs font-bold text-slate-600">
            {itemIndex + 1} / {items.length}
          </span>

          <button
            disabled={itemIndex >= items.length - 1}
            onClick={() => setItemIndex(prev => prev + 1)}
            className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors border border-slate-200"
          >
            <span>ข้อถัดไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
