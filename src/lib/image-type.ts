export function detectImageType(bytes: Uint8Array): { mime: string; extension: string } | null {
  const b = Buffer.from(bytes);
  if (b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { mime: 'image/png', extension: 'png' };
  if (b[0]===255 && b[1]===216 && b[2]===255) return { mime: 'image/jpeg', extension: 'jpg' };
  if (['GIF87a','GIF89a'].includes(b.subarray(0,6).toString())) return { mime: 'image/gif', extension: 'gif' };
  if (b.subarray(0,4).toString()==='RIFF' && b.subarray(8,12).toString()==='WEBP') return { mime: 'image/webp', extension: 'webp' };
  return null;
}
