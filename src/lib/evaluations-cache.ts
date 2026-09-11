import { BoundedCache } from './bounded-cache';
import type { EvaluationResult } from './evaluator';

export const evaluationsCache = new BoundedCache<EvaluationResult>(500, 20 * 60_000);

export function clearEvaluationsCache(): void {
  evaluationsCache.clear();
}
