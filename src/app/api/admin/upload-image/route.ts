import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { requireDatabase } from '@/lib/server-db';

function detectImageType(bytes: Uint8Array): { mime: string; extension: string } | null {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: 'image/png', extension: 'png' };
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' };
  if (['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString())) return { mime: 'image/gif', extension: 'gif' };
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  return null;
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied;
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
