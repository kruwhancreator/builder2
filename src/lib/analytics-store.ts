import { adminDb } from './server-db';
import { supabase } from './supabase';

function getDb() {
  return adminDb || supabase;
}

// In-memory fallback accumulator for resilience when database connection is unavailable
const memoryAnalytics = {
  bookVisits: new Map<string, number>(),
  unitViews: new Map<string, number>(), // key: `${book}_${unit}`
  exerciseChecks: new Map<string, { total: number; correct: number }>(),
};

export async function trackBookScan(book: string): Promise<{ success: boolean; method?: string }> {
  const targetBook = (book || 'sentence-builder-vol-2').trim().toLowerCase();
  memoryAnalytics.bookVisits.set(targetBook, (memoryAnalytics.bookVisits.get(targetBook) || 0) + 1);

  const db = getDb();
  if (!db) {
    console.warn('[Analytics] Database not configured; recorded in memory fallback');
    return { success: true, method: 'memory' };
  }

  // Tier 1: Try Postgres RPC stored procedure
  try {
    const { error: rpcError } = await db.rpc('increment_book_scan', { target_book: targetBook });
    if (!rpcError) return { success: true, method: 'rpc' };
    console.warn('[Analytics] RPC increment_book_scan failed, falling back to direct upsert:', rpcError.message);
  } catch (err) {
    console.warn('[Analytics] RPC exception:', err);
  }

  // Tier 2: Direct SQL / Supabase table upsert
  try {
    const { data: existing } = await db
      .from('book_analytics')
      .select('qr_scan_count')
      .eq('book_name', targetBook)
      .maybeSingle();

    const currentCount = Number(existing?.qr_scan_count || 0);
    const { error: upsertError } = await db
      .from('book_analytics')
      .upsert({
        book_name: targetBook,
        qr_scan_count: currentCount + 1,
        last_scanned_at: new Date().toISOString()
      }, { onConflict: 'book_name' });

    if (!upsertError) return { success: true, method: 'upsert' };
    console.error('[Analytics] Direct book_analytics upsert failed:', upsertError.message);
  } catch (err) {
    console.error('[Analytics] Direct upsert exception:', err);
  }

  return { success: true, method: 'memory_fallback' };
}

export async function trackUnitView(book: string, unit: number): Promise<{ success: boolean; method?: string }> {
  const targetBook = (book || 'sentence-builder-vol-2').trim().toLowerCase();
  const targetUnit = Number(unit);
  if (!targetUnit || targetUnit <= 0) return { success: false };

  const memKey = `${targetBook}_${targetUnit}`;
  memoryAnalytics.unitViews.set(memKey, (memoryAnalytics.unitViews.get(memKey) || 0) + 1);

  const db = getDb();
  if (!db) {
    console.warn('[Analytics] Database not configured; unit view recorded in memory fallback');
    return { success: true, method: 'memory' };
  }

  // Tier 1: Try Postgres RPC stored procedure
  try {
    const { error: rpcError } = await db.rpc('increment_unit_view', { target_book: targetBook, target_unit: targetUnit });
    if (!rpcError) return { success: true, method: 'rpc' };
    console.warn('[Analytics] RPC increment_unit_view failed, falling back to direct upsert:', rpcError.message);
  } catch (err) {
    console.warn('[Analytics] RPC exception:', err);
  }

  // Tier 2: Direct SQL / Supabase table upsert
  try {
    const { data: existing } = await db
      .from('unit_analytics')
      .select('view_count')
      .eq('book_name', targetBook)
      .eq('unit_number', targetUnit)
      .maybeSingle();

    const currentCount = Number(existing?.view_count || 0);
    const { error: upsertError } = await db
      .from('unit_analytics')
      .upsert({
        book_name: targetBook,
        unit_number: targetUnit,
        view_count: currentCount + 1,
        last_viewed_at: new Date().toISOString()
      }, { onConflict: 'book_name,unit_number' });

    if (!upsertError) return { success: true, method: 'upsert' };
    console.error('[Analytics] Direct unit_analytics upsert failed:', upsertError.message);
  } catch (err) {
    console.error('[Analytics] Direct upsert exception:', err);
  }

  return { success: true, method: 'memory_fallback' };
}

export async function trackExerciseCheck(book: string, unit: number, isCorrect: boolean): Promise<{ success: boolean; method?: string }> {
  const targetBook = (book || 'sentence-builder-vol-2').trim().toLowerCase();
  const targetUnit = Number(unit);
  const memKey = `${targetBook}_${targetUnit}`;
  const curr = memoryAnalytics.exerciseChecks.get(memKey) || { total: 0, correct: 0 };
  memoryAnalytics.exerciseChecks.set(memKey, { total: curr.total + 1, correct: curr.correct + (isCorrect ? 1 : 0) });

  const db = getDb();
  if (!db) return { success: true, method: 'memory' };

  // Tier 1: Try Postgres RPC
  try {
    const { error: rpcError } = await db.rpc('increment_exercise_check', {
      target_book: targetBook,
      target_unit: targetUnit,
      is_correct: isCorrect
    });
    if (!rpcError) return { success: true, method: 'rpc' };
    console.warn('[Analytics] RPC increment_exercise_check failed, falling back to direct upsert:', rpcError.message);
  } catch (err) {
    console.warn('[Analytics] RPC exception:', err);
  }

  // Tier 2: Direct SQL upsert
  try {
    const { data: bookRow } = await db
      .from('book_analytics')
      .select('ai_check_count, correct_check_count')
      .eq('book_name', targetBook)
      .maybeSingle();

    await db.from('book_analytics').upsert({
      book_name: targetBook,
      ai_check_count: Number(bookRow?.ai_check_count || 0) + 1,
      correct_check_count: Number(bookRow?.correct_check_count || 0) + (isCorrect ? 1 : 0),
      last_scanned_at: new Date().toISOString()
    }, { onConflict: 'book_name' });

    const { data: unitRow } = await db
      .from('unit_analytics')
      .select('check_count, correct_count')
      .eq('book_name', targetBook)
      .eq('unit_number', targetUnit)
      .maybeSingle();

    await db.from('unit_analytics').upsert({
      book_name: targetBook,
      unit_number: targetUnit,
      check_count: Number(unitRow?.check_count || 0) + 1,
      correct_count: Number(unitRow?.correct_count || 0) + (isCorrect ? 1 : 0),
      last_viewed_at: new Date().toISOString()
    }, { onConflict: 'book_name,unit_number' });

    return { success: true, method: 'upsert' };
  } catch (err) {
    console.error('[Analytics] Direct exercise check upsert exception:', err);
  }

  return { success: true, method: 'memory_fallback' };
}

export async function getAnalyticsSummary(book: string, unitNumbers: number[] = []) {
  const targetBook = (book || 'sentence-builder-vol-2').trim().toLowerCase();
  const db = getDb();

  let bookDbRow: any = null;
  let unitDbRows: any[] = [];
  let isFromDb = false;

  if (db) {
    try {
      const [booksRes, unitsRes] = await Promise.all([
        db.from('book_analytics').select('*').eq('book_name', targetBook).maybeSingle(),
        db.from('unit_analytics').select('*').eq('book_name', targetBook),
      ]);
      if (!booksRes.error && booksRes.data) {
        bookDbRow = booksRes.data;
        isFromDb = true;
      }
      if (!unitsRes.error && Array.isArray(unitsRes.data)) {
        unitDbRows = unitsRes.data;
        isFromDb = true;
      }
    } catch (err) {
      console.warn('[Analytics] Failed to fetch analytics from Supabase, using fallback:', err);
    }
  }

  const memoryBookScans = memoryAnalytics.bookVisits.get(targetBook) || 0;
  const totalQrScans = Math.max(Number(bookDbRow?.qr_scan_count || 0), memoryBookScans);
  const totalAiChecks = Number(bookDbRow?.ai_check_count || 0);
  const totalCorrectChecks = Number(bookDbRow?.correct_check_count || 0);

  // Generate full list of units (standard 1..30 for Sentence Builder 2, plus any explicitly supplied or recorded units)
  const defaultUnits = Array.from({ length: 30 }, (_, i) => i + 1);
  const detectedUnits = new Set<number>([
    ...defaultUnits,
    ...(unitNumbers || []),
    ...unitDbRows.map(u => Number(u.unit_number)).filter(n => !isNaN(n) && n > 0)
  ]);
  const sortedUnitNumbers = Array.from(detectedUnits).sort((a, b) => a - b);

  const unitViews = sortedUnitNumbers.map(number => {
    const row = unitDbRows.find(u => Number(u.unit_number) === number);
    const memView = memoryAnalytics.unitViews.get(`${targetBook}_${number}`) || 0;
    const memCheck = memoryAnalytics.exerciseChecks.get(`${targetBook}_${number}`);
    const viewCount = Math.max(Number(row?.view_count || 0), memView);
    const checkCount = Math.max(Number(row?.check_count || 0), memCheck?.total || 0);
    const correctCount = Math.max(Number(row?.correct_count || 0), memCheck?.correct || 0);
    return {
      unit_number: number,
      view_count: viewCount,
      check_count: checkCount,
      correct_count: correctCount,
    };
  });

  const unit1Views = unitViews.find(u => u.unit_number === 1)?.view_count || 0;
  const lastUnitViews = unitViews.find(u => u.unit_number === 30)?.view_count || unitViews.at(-1)?.view_count || 0;

  return {
    bookName: targetBook,
    totalQrScans,
    totalAiChecks,
    totalCorrectChecks,
    unitViews,
    unit1Views,
    lastUnitViews,
    qrToUnit1Conversion: totalQrScans ? Math.min(100, Math.round(unit1Views / totalQrScans * 100)) : 0,
    lastUnitReachRate: unit1Views ? Math.min(100, Math.round(lastUnitViews / unit1Views * 100)) : 0,
    accuracyRate: totalAiChecks ? Math.round(totalCorrectChecks / totalAiChecks * 100) : 0,
    isLiveTracking: true,
    dataSource: isFromDb ? 'supabase' : 'hybrid_memory',
    lastUpdated: new Date().toISOString()
  };
}
