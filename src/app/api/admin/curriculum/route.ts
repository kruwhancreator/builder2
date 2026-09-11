import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { requireDatabase } from '@/lib/server-db';
import { getBookDataFromDb, getChapterDataFromDb, clearDataManagerCache } from '@/lib/data-manager';
import { readJson, validSlug, positiveInteger } from '@/lib/api-validation';

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const string = (v: unknown) => typeof v === 'string' ? v : '';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9-]{36}$/i.test(v);
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  const bookName = req.nextUrl.searchParams.get('book');
  if (!validSlug(bookName)) return fail('Invalid book');
  try {
    const book = await getBookDataFromDb(bookName);
    if (!book) return fail('Book not found', 404);
    const units = await Promise.all(book.units.map(async u => {
      const chapter = await getChapterDataFromDb(book.id, u.unit_number);
      return { ...u, exercises: Object.values(chapter?.exercises || {}).map(ex => ({ ...ex, itemCount: ex.items.length })) };
    }));
    return NextResponse.json({ book: book.id, bookInfo: book, units }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return fail('Unable to load curriculum', 503); }
}
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await readJson(req); } catch { return fail('Invalid request or request too large'); }
  const { action, bookName } = body;
  try {
    const db = requireDatabase();
    if (action === 'save_unit') {
      const u = record(body.unitData); const number = Number(u.unit_number);
      if (!validSlug(bookName) || !positiveInteger(number) || !string(u.title).trim()) return fail('Invalid unit');
      const { error } = await db.from('units').upsert({ book_name: bookName, unit_number: number, title: string(u.title), subtitle: string(u.subtitle) }, { onConflict: 'book_name,unit_number' });
      if (error) throw error;
    } else if (action === 'save_exercise') {
      const ex = record(body.exerciseData);
      if (!validSlug(bookName) || !string(ex.title).trim() || !['translation','guided_sentence','picture_description'].includes(string(ex.exercise_type))) return fail('Invalid exercise');
      let unit = ex.unit_id;
      if (!uuid(unit)) {
        const { data, error } = await db.from('units').select('id').eq('book_name', bookName).eq('unit_number', Number(ex.unit_number)).single();
        if (error || !data) return fail('Unit not found', 404); unit = data.id;
      }
      const code = ex.exercise_code || `ex-${crypto.randomUUID().slice(0,8)}`;
      if (!validSlug(code)) return fail('Invalid exercise code');
      const { error } = await db.from('exercises').upsert({ unit_id: unit, exercise_code: code, title: string(ex.title), exercise_type: ex.exercise_type,
        use_ai_check: ex.use_ai_check !== false, instruction: string(ex.instruction), guidance: string(ex.guidance),
        ...(Array.isArray(ex.categories) ? { categories: ex.categories } : {}),
        ...(positiveInteger(ex.order_index) ? { order_index: ex.order_index } : {}),
      }, { onConflict: 'unit_id,exercise_code' });
      if (error) throw error;
    } else if (action === 'save_quiz_items') {
      const { unit_id, exercise_code, items, categories } = body;
      if (!uuid(unit_id) || !validSlug(exercise_code) || !Array.isArray(items) || items.length > 500 ||
          items.some(i => typeof record(i).model_answer !== 'string') || (categories !== undefined && !Array.isArray(categories))) return fail('Invalid questions');
      const { error } = await db.rpc('replace_exercise_items', { p_unit: unit_id, p_exercise: exercise_code, p_items: items, p_categories: categories ?? null });
      if (error) throw error;
    } else if (action === 'reorder_exercises') {
      if (!uuid(body.unit_id) || !Array.isArray(body.exercise_orders) || body.exercise_orders.some(e => !validSlug(record(e).exercise_code) || !positiveInteger(record(e).order_index))) return fail('Invalid order');
      const { error } = await db.rpc('reorder_workbook_exercises', { p_unit: body.unit_id, p_orders: body.exercise_orders });
      if (error) throw error;
    } else return fail('Unknown action');
    clearDataManagerCache();
    return NextResponse.json({ success: true });
  } catch { return fail('บันทึกไม่สำเร็จค่ะ ตรวจการตั้งค่าฐานข้อมูลและรัน SQL migration ก่อน แล้วลองใหม่อีกครั้ง', 503); }
}
export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  const q = req.nextUrl.searchParams;
  try {
    const db = requireDatabase();
    if (q.get('action') === 'delete_unit') {
      const book = q.get('book'); const number = Number(q.get('unit'));
      if (!validSlug(book) || !positiveInteger(number)) return fail('Invalid unit');
      const { data, error } = await db.from('units').delete().eq('book_name', book).eq('unit_number', number).select('id');
      if (error) throw error;
      if (!data?.length) return fail('Unit not found', 404);
    } else if (q.get('action') === 'delete_exercise') {
      const unit = q.get('unit_id'); const exercise = q.get('exercise_code');
      if (!uuid(unit) || !validSlug(exercise)) return fail('Invalid exercise');
      const { error } = await db.rpc('delete_workbook_exercise', { p_unit: unit, p_exercise: exercise });
      if (error) throw error;
    } else return fail('Unknown action');
    clearDataManagerCache();
    return NextResponse.json({ success: true });
  } catch { return fail('Unable to delete content', 503); }
}
