import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// In-Memory Persistent Store for resilient tracking
interface InMemoryBookData {
  qrScans: number;
  aiChecks: number;
  correctChecks: number;
  lastScannedAt: string;
}

interface InMemoryUnitData {
  views: number;
  checks: number;
  correctChecks: number;
  lastViewedAt: string;
}

interface GlobalAnalyticsMemory {
  books: Record<string, InMemoryBookData>;
  units: Record<string, Record<number, InMemoryUnitData>>;
}

// Global reference across serverless warm reloads in Node.js
const globalStore = global as unknown as { __sb_analytics_memory__?: GlobalAnalyticsMemory };
if (!globalStore.__sb_analytics_memory__) {
  globalStore.__sb_analytics_memory__ = {
    books: {
      'sentence-builder-vol-2': {
        qrScans: 0,
        aiChecks: 0,
        correctChecks: 0,
        lastScannedAt: new Date().toISOString()
      }
    },
    units: {}
  };
}

const memory = globalStore.__sb_analytics_memory__;

/**
 * Resolves a book slug or ID to the canonical book ID in Supabase
 */
async function resolveCanonicalBookId(slugOrId: string): Promise<string> {
  if (!slugOrId) return 'sentence-builder-vol-2';
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('books')
        .select('id, slug')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();

      if (data?.id) return data.id;
    } catch {
      // ignore and return as-is
    }
  }
  return slugOrId;
}

/**
 * Record a Book QR Scan or Visit
 */
export async function trackBookScan(rawBookName: string): Promise<{ success: boolean; qrScans: number }> {
  const bookName = await resolveCanonicalBookId(rawBookName);

  // 1. Update in-memory store
  if (!memory.books[bookName]) {
    memory.books[bookName] = { qrScans: 0, aiChecks: 0, correctChecks: 0, lastScannedAt: new Date().toISOString() };
  }
  memory.books[bookName].qrScans += 1;
  memory.books[bookName].lastScannedAt = new Date().toISOString();
  const currentMemoryScans = memory.books[bookName].qrScans;

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      // Try atomic RPC first
      const { error: rpcErr } = await supabase.rpc('increment_book_scan', { target_book: bookName });
      if (rpcErr) {
        // Fallback: direct select + upsert
        const { data: row } = await supabase
          .from('book_analytics')
          .select('qr_scan_count')
          .eq('book_name', bookName)
          .maybeSingle();

        const newCount = Number(row?.qr_scan_count || 0) + 1;
        await supabase
          .from('book_analytics')
          .upsert({
            book_name: bookName,
            qr_scan_count: newCount,
            last_scanned_at: new Date().toISOString()
          }, { onConflict: 'book_name' });
      }
    } catch (err) {
      console.warn('Failed to persist book scan to Supabase:', err);
    }
  }

  return { success: true, qrScans: currentMemoryScans };
}

/**
 * Record a Unit View
 */
export async function trackUnitView(rawBookName: string, unitNumber: number): Promise<{ success: boolean; views: number }> {
  if (typeof unitNumber !== 'number' || unitNumber < 1) return { success: false, views: 0 };
  const bookName = await resolveCanonicalBookId(rawBookName);

  // 1. Update in-memory store
  if (!memory.units[bookName]) {
    memory.units[bookName] = {};
  }
  if (!memory.units[bookName][unitNumber]) {
    memory.units[bookName][unitNumber] = { views: 0, checks: 0, correctChecks: 0, lastViewedAt: new Date().toISOString() };
  }
  memory.units[bookName][unitNumber].views += 1;
  memory.units[bookName][unitNumber].lastViewedAt = new Date().toISOString();
  const currentMemoryViews = memory.units[bookName][unitNumber].views;

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      // Try atomic RPC first
      const { error: rpcErr } = await supabase.rpc('increment_unit_view', {
        target_book: bookName,
        target_unit: unitNumber
      });

      if (rpcErr) {
        // Fallback: direct select + upsert
        const { data: row } = await supabase
          .from('unit_analytics')
          .select('view_count')
          .eq('book_name', bookName)
          .eq('unit_number', unitNumber)
          .maybeSingle();

        const newCount = Number(row?.view_count || 0) + 1;
        await supabase
          .from('unit_analytics')
          .upsert({
            book_name: bookName,
            unit_number: unitNumber,
            view_count: newCount,
            last_viewed_at: new Date().toISOString()
          }, { onConflict: 'book_name,unit_number' });
      }
    } catch (err) {
      console.warn('Failed to persist unit view to Supabase:', err);
    }
  }

  return { success: true, views: currentMemoryViews };
}

/**
 * Record an Exercise Answer Evaluation Check
 */
export async function trackExerciseCheck(
  rawBookName: string,
  unitNumber: number,
  isCorrect: boolean
): Promise<{ success: boolean }> {
  const bookName = await resolveCanonicalBookId(rawBookName);

  // 1. Update in-memory
  if (!memory.books[bookName]) {
    memory.books[bookName] = { qrScans: 0, aiChecks: 0, correctChecks: 0, lastScannedAt: new Date().toISOString() };
  }
  memory.books[bookName].aiChecks += 1;
  if (isCorrect) memory.books[bookName].correctChecks += 1;

  if (!memory.units[bookName]) memory.units[bookName] = {};
  if (!memory.units[bookName][unitNumber]) {
    memory.units[bookName][unitNumber] = { views: 0, checks: 0, correctChecks: 0, lastViewedAt: new Date().toISOString() };
  }
  memory.units[bookName][unitNumber].checks += 1;
  if (isCorrect) memory.units[bookName][unitNumber].correctChecks += 1;

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error: rpcErr } = await supabase.rpc('increment_exercise_check', {
        target_book: bookName,
        target_unit: unitNumber,
        is_correct: isCorrect
      });

      if (rpcErr) {
        // Fallback: direct updates
        const { data: bRow } = await supabase
          .from('book_analytics')
          .select('ai_check_count, correct_check_count')
          .eq('book_name', bookName)
          .maybeSingle();

        await supabase.from('book_analytics').upsert({
          book_name: bookName,
          ai_check_count: Number(bRow?.ai_check_count || 0) + 1,
          correct_check_count: Number(bRow?.correct_check_count || 0) + (isCorrect ? 1 : 0),
          last_scanned_at: new Date().toISOString()
        }, { onConflict: 'book_name' });

        const { data: uRow } = await supabase
          .from('unit_analytics')
          .select('check_count, correct_count')
          .eq('book_name', bookName)
          .eq('unit_number', unitNumber)
          .maybeSingle();

        await supabase.from('unit_analytics').upsert({
          book_name: bookName,
          unit_number: unitNumber,
          check_count: Number(uRow?.check_count || 0) + 1,
          correct_count: Number(uRow?.correct_count || 0) + (isCorrect ? 1 : 0),
          last_viewed_at: new Date().toISOString()
        }, { onConflict: 'book_name,unit_number' });
      }
    } catch (err) {
      console.warn('Failed to persist exercise check to Supabase:', err);
    }
  }

  return { success: true };
}

/**
 * Get Real Analytics Summary (with 0 fake/simulated data)
 */
export async function getAnalyticsSummary(rawBookName: string, totalUnitsCount: number = 30) {
  const bookName = await resolveCanonicalBookId(rawBookName);

  let totalQrScans = 0;
  let totalAiChecks = 0;
  let totalCorrectChecks = 0;
  const unitViewsMap: Record<number, { view_count: number; check_count: number; correct_count: number }> = {};
  let dataSource: 'supabase' | 'in_memory' = 'in_memory';

  // 1. Try fetching real Supabase data
  if (isSupabaseConfigured() && supabase) {
    try {
      // 1.1 Fetch Book Stats
      const { data: bookData } = await supabase
        .from('book_analytics')
        .select('*')
        .or(`book_name.eq.${bookName},book_name.eq.${rawBookName}`)
        .maybeSingle();

      if (bookData) {
        totalQrScans = Number(bookData.qr_scan_count || 0);
        totalAiChecks = Number(bookData.ai_check_count || 0);
        totalCorrectChecks = Number(bookData.correct_check_count || 0);
        dataSource = 'supabase';
      }

      // 1.2 Fetch Unit Stats
      const { data: unitsData } = await supabase
        .from('unit_analytics')
        .select('*')
        .or(`book_name.eq.${bookName},book_name.eq.${rawBookName}`)
        .order('unit_number', { ascending: true });

      if (unitsData && unitsData.length > 0) {
        dataSource = 'supabase';
        for (const u of unitsData) {
          unitViewsMap[u.unit_number] = {
            view_count: Number(u.view_count || 0),
            check_count: Number(u.check_count || 0),
            correct_count: Number(u.correct_count || 0)
          };
        }
      }
    } catch (err) {
      console.warn('Error reading analytics from Supabase, falling back to in-memory store:', err);
    }
  }

  // 2. Merge real in-memory store (ensures serverless warm instances always show live AI checks)
  if (memory.books[bookName]) {
    if (totalQrScans === 0) {
      totalQrScans = memory.books[bookName].qrScans;
    }
    totalAiChecks = Math.max(totalAiChecks, memory.books[bookName].aiChecks || 0);
    totalCorrectChecks = Math.max(totalCorrectChecks, memory.books[bookName].correctChecks || 0);
  }

  if (memory.units[bookName]) {
    for (const [uNumStr, uData] of Object.entries(memory.units[bookName])) {
      const uNum = Number(uNumStr);
      if (!unitViewsMap[uNum]) {
        unitViewsMap[uNum] = { view_count: 0, check_count: 0, correct_count: 0 };
      }
      unitViewsMap[uNum].view_count = Math.max(unitViewsMap[uNum].view_count, uData.views);
      unitViewsMap[uNum].check_count = Math.max(unitViewsMap[uNum].check_count, uData.checks);
      unitViewsMap[uNum].correct_count = Math.max(unitViewsMap[uNum].correct_count, uData.correctChecks);
    }
  }

  // 3. Build comprehensive Unit 1 - N funnel list (ensuring all units 1 to totalUnitsCount exist)
  const finalUnitCount = Math.max(30, totalUnitsCount);
  const unitViews = Array.from({ length: finalUnitCount }, (_, idx) => {
    const uNum = idx + 1;
    const stats = unitViewsMap[uNum] || { view_count: 0, check_count: 0, correct_count: 0 };
    return {
      unit_number: uNum,
      view_count: stats.view_count,
      check_count: stats.check_count,
      correct_count: stats.correct_count
    };
  });

  // 4. Calculate True Funnel Metrics
  const unit1Views = unitViews.find(u => u.unit_number === 1)?.view_count || 0;
  const lastUnitViews = unitViews.find(u => u.unit_number === finalUnitCount)?.view_count || 0;

  const qrToUnit1Conversion = totalQrScans > 0
    ? Math.min(100, Math.round((unit1Views / totalQrScans) * 100))
    : 0;

  const courseCompletionRate = unit1Views > 0
    ? Math.min(100, Math.round((lastUnitViews / unit1Views) * 100))
    : 0;

  const accuracyRate = totalAiChecks > 0
    ? Math.min(100, Math.round((totalCorrectChecks / totalAiChecks) * 100))
    : 0;

  return {
    bookName,
    totalQrScans,
    unit1Views,
    unit30Views: lastUnitViews,
    qrToUnit1Conversion,
    courseCompletionRate,
    totalAiChecks,
    totalCorrectChecks,
    accuracyRate,
    unitViews,
    isLiveTracking: true,
    dataSource,
    lastUpdated: new Date().toISOString()
  };
}
