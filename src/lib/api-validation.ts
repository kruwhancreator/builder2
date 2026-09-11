export function validSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value);
}
export function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 100000;
}
export async function readJson(req: Request, maxBytes = 1_000_000): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new Error('Expected JSON');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('Missing request body');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error('Request body too large'); }
    chunks.push(value);
  }
  const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected an object');
  return body as Record<string, unknown>;
}
