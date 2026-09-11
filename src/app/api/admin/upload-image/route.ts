import { detectImageType } from '@/lib/image-type';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { requireDatabase } from '@/lib/server-db';
import { allowRequest } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
  if (!(await allowRequest(req, 'upload', 15))) return NextResponse.json({ error: 'Please wait before uploading again' }, { status: 429 });
  try {
    const reader = req.body?.getReader(); if (!reader) throw new Error('Missing image');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 5 * 1024 * 1024 + 65536) { await reader.cancel(); return NextResponse.json({ error: 'Maximum image size is 5 MB' }, { status: 413 }); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': req.headers.get('content-type') || '' } }).formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Select an image up to 5 MB' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer()); const format = detectImageType(bytes);
    if (!format) return NextResponse.json({ error: 'Only PNG, JPEG, GIF, and WebP images are supported' }, { status: 400 });
    const db = requireDatabase(); const fileName = `${crypto.randomUUID()}.${format.extension}`;
    const { error } = await db.storage.from('exercise-images').upload(fileName, bytes, { contentType: format.mime, upsert: false });
    if (error) throw error;
    return NextResponse.json({ success: true, publicUrl: db.storage.from('exercise-images').getPublicUrl(fileName).data.publicUrl });
  } catch { return NextResponse.json({ error: 'Upload failed. Check storage configuration and try again.' }, { status: 503 }); }
}
