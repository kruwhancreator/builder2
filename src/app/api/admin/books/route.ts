import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { requireDatabase } from '@/lib/server-db';
import { readJson, validSlug } from '@/lib/api-validation';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  try {
    const db = requireDatabase();
    const { data, error } = await db.from('books').select('*,units(count)').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ books: (data || []).map(b => ({ ...b, total_units: b.units?.[0]?.count || 0 })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Database unavailable. Check server configuration.' }, { status: 503 }); }
}
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await readJson(req, 8000); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { title, subtitle, id } = body;
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : id;
  if (typeof title !== 'string' || !title.trim() || title.length > 300 || !validSlug(slug) || (id !== undefined && !validSlug(id)) || (subtitle !== undefined && typeof subtitle !== 'string')) return NextResponse.json({ error: 'Provide a title and a unique URL slug using letters, numbers, or hyphens' }, { status: 400 });
  try {
    const { error } = await requireDatabase().from('books').upsert({ id: id || slug, slug, title: title.trim(), subtitle: subtitle || '' }, { onConflict: 'id' });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'บันทึกไม่ได้ค่ะ ตรวจการตั้งค่าฐานข้อมูลและ URL ที่อาจซ้ำกัน' }, { status: 503 }); }
}
export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  if (!validSlug(id)) return NextResponse.json({ error: 'Invalid book' }, { status: 400 });
  try {
    const { data, error } = await requireDatabase().from('books').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Unable to delete book' }, { status: 503 }); }
}
