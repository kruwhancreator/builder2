import { createHash } from 'node:crypto';
import { PICTURE_RUBRIC_VERSION } from './picture-evaluator';

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(obj as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

export function evaluationKey(context: unknown, answer: string): string {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const payload = stableStringify([PICTURE_RUBRIC_VERSION, model, context, answer.trim()]);
  return createHash('sha256').update(payload).digest('hex');
}
