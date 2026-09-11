import { adminDb } from './server-db';

export async function trackBookScan(book: string) {
  if (!adminDb) return { success: false };
  const { error } = await adminDb.rpc('increment_book_scan', { target_book: book });
  if (error) console.warn('Book visit was not persisted');
  return { success: !error };
}
export async function trackUnitView(book: string, unit: number) {
  if (!adminDb) return { success: false };
  const { error } = await adminDb.rpc('increment_unit_view', { target_book: book, target_unit: unit });
  if (error) console.warn('Unit visit was not persisted');
  return { success: !error };
}
export async function trackExerciseCheck(book: string, unit: number, isCorrect: boolean) {
  if (!adminDb) return { success: false };
  const { error } = await adminDb.rpc('increment_exercise_check', { target_book: book, target_unit: unit, is_correct: isCorrect });
  if (error) console.warn('Exercise attempt was not persisted');
  return { success: !error };
}
export async function getAnalyticsSummary(book: string, unitNumbers: number[]) {
  if (!adminDb) throw new Error('Analytics database is not configured');
  const [books, units] = await Promise.all([
    adminDb.from('book_analytics').select('*').eq('book_name', book).maybeSingle(),
    adminDb.from('unit_analytics').select('*').eq('book_name', book),
  ]);
  if (books.error || units.error) throw new Error('Analytics unavailable');
  const totalQrScans = Number(books.data?.qr_scan_count || 0);
  const totalAiChecks = Number(books.data?.ai_check_count || 0);
  const totalCorrectChecks = Number(books.data?.correct_check_count || 0);
  const unitViews = [...unitNumbers].sort((a,b) => a-b).map(number => {
    const row = units.data?.find(u => u.unit_number === number);
    return { unit_number: number, view_count: Number(row?.view_count || 0), check_count: Number(row?.check_count || 0), correct_count: Number(row?.correct_count || 0) };
  });
  const unit1Views = unitViews[0]?.view_count || 0;
  const lastUnitViews = unitViews.at(-1)?.view_count || 0;
  return { bookName: book, totalQrScans, totalAiChecks, totalCorrectChecks, unitViews, unit1Views, lastUnitViews,
    qrToUnit1Conversion: totalQrScans ? Math.min(100,Math.round(unit1Views / totalQrScans * 100)) : 0,
    lastUnitReachRate: unit1Views ? Math.min(100,Math.round(lastUnitViews / unit1Views * 100)) : 0,
    accuracyRate: totalAiChecks ? Math.round(totalCorrectChecks / totalAiChecks * 100) : 0,
    isLiveTracking: true, dataSource: 'supabase', lastUpdated: new Date().toISOString() };
}
