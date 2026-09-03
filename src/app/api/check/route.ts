import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/evaluator';
import { getChapterDataFromDb } from '@/lib/data-manager';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { trackExerciseCheck } from '@/lib/analytics-store';

// In-memory spam prevention: IP Rate Limiting & Evaluation Cache
interface RateLimitEntry {
  count: number;
  lastRequestTime: number;
  resetTime: number;
}
const ipRateLimits = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 20; // max 20 checks per minute
const MIN_INTERVAL_MS = 2000; // minimum 2.0 seconds between checks

interface CacheEntry {
  evaluation: any;
  timestamp: number;
}
const evaluationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes cache for identical question & answer

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exerciseType, itemIndex, exerciseId, studentAnswer, chapter, bookName = 'sentence-builder-vol-2' } = body;

    // Rate Limiting & Spam Prevention
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'default-client';
    const now = Date.now();
    const rateEntry = ipRateLimits.get(ip) || { count: 0, lastRequestTime: 0, resetTime: now + WINDOW_MS };

    if (now > rateEntry.resetTime) {
      rateEntry.count = 0;
      rateEntry.resetTime = now + WINDOW_MS;
    }

    if (now - rateEntry.lastRequestTime < MIN_INTERVAL_MS) {
      return NextResponse.json({
        isCorrect: false,
        statusText: '⏳ กรุณารอสักครู่ (2-3 วินาที) ก่อนกดตรวจอีกครั้งนะคะ',
        feedbackPoints: ['ระบบกำลังประมวลผลคำตอบ กรุณาเว้นช่วงสักครู่ก่อนกดส่งตรวจใหม่ค่ะ']
      }, { status: 429 });
    }

    if (rateEntry.count >= MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json({
        isCorrect: false,
        statusText: '⚠️ คุณส่งตรวจถี่เกินกำหนด กรุณารอประมาณ 1 นาทีนะคะ',
        feedbackPoints: ['เพื่อความเสถียรของระบบและป้องกันการกดซ้ำ กรุณารอประมาณ 1 นาทีแล้วลองใหม่อีกครั้งค่ะ']
      }, { status: 429 });
    }

    rateEntry.count += 1;
    rateEntry.lastRequestTime = now;
    ipRateLimits.set(ip, rateEntry);

    let useAiCheck = true;
    let teacherGuidance = '';
    let currentItem = body.item;
    let wordBank = body.wordBank;
    let templates = body.templates;

    // 1. Check if exercise in Supabase has 'use_ai_check' configured
    if (isSupabaseConfigured() && supabase && exerciseId) {
      try {
        const { data: exRow } = await supabase
          .from('exercises')
          .select('use_ai_check, guidance, instruction, word_bank')
          .eq('exercise_code', exerciseId)
          .maybeSingle();

        if (exRow) {
          useAiCheck = exRow.use_ai_check !== false;
          if (exRow.guidance) teacherGuidance = exRow.guidance;
          if (exRow.word_bank) wordBank = exRow.word_bank;
        }
      } catch (err) {
        console.warn('Could not load exercise config from DB:', err);
      }
    }

    // 2. Load item data from DB if not provided in body
    if (!currentItem) {
      const chapterData = await getChapterDataFromDb(bookName, Number(chapter) || 1);
      const exercise = chapterData?.exercises?.[exerciseId];
      currentItem = exercise?.items?.[itemIndex];
      if (exercise && typeof exercise.use_ai_check !== 'undefined') {
        useAiCheck = exercise.use_ai_check;
      }
    }

    if (!exerciseType || !currentItem || typeof studentAnswer !== 'string') {
      return NextResponse.json(
        { error: 'Missing required evaluation fields' },
        { status: 400 }
      );
    }

    // Check Evaluation Cache (save AI tokens for identical answers on the same question)
    const cacheKey = `${exerciseType}_${currentItem?.id || currentItem?.item_number || 'item'}_${studentAnswer.trim().toLowerCase()}`;
    const cached = evaluationCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cached.evaluation);
    }

    // 3. Inject teacher guidance into item if available
    if (teacherGuidance && !currentItem.teacher_guidance) {
      currentItem.teacher_guidance = teacherGuidance;
    }

    // 4. Evaluate answer with explicit useAiCheck parameter
    const evaluation = await evaluateAnswer({
      exerciseType,
      item: currentItem,
      studentAnswer,
      wordBank,
      templates,
      useAiCheck: body.useAiCheck !== undefined ? body.useAiCheck : useAiCheck,
    });

    // Save to cache (TTL 20 mins)
    evaluationCache.set(cacheKey, { evaluation, timestamp: now });
    if (evaluationCache.size > 500) {
      for (const [k, v] of evaluationCache.entries()) {
        if (now - v.timestamp > CACHE_TTL_MS) evaluationCache.delete(k);
      }
    }

    // 5. Automatically track every exercise evaluation in real analytics
    const effectiveBookName = body.bookName || currentItem?.book_name || bookName || 'sentence-builder-vol-2';
    const effectiveUnitNumber = Number(body.chapter || currentItem?.unit_number || 1);
    trackExerciseCheck(effectiveBookName, effectiveUnitNumber, Boolean(evaluation.isCorrect)).catch(() => {});

    return NextResponse.json(evaluation);
  } catch (error: any) {
    console.error('Error in /api/check:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during evaluation' },
      { status: 500 }
    );
  }
}
