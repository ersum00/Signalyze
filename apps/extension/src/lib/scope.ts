/**
 * The scope of one analysis: how many reviews to load and which period to
 * keep. Chosen on the Home view, remembered in settings and applied by the
 * side panel after collection (the content script only sees the resolved
 * number and the period's first day).
 */
import type { AnalysisWindow, SampleLimit } from '@signalyze/shared';
import type { Settings } from './storage';

export interface AnalysisScope {
  limit: SampleLimit;
  window: AnalysisWindow;
}

export const DEFAULT_SCOPE: AnalysisScope = { limit: 200, window: 'all' };

export function scopeOf(settings: Pick<Settings, 'sampleLimit' | 'window'>): AnalysisScope {
  return { limit: settings.sampleLimit, window: settings.window };
}

/** Reviews dated on or after `start` ("YYYY-MM-DD"); every review when `start` is null. */
export function filterByWindow<T extends { date: string }>(
  reviews: readonly T[],
  start: string | null,
): T[] {
  if (start === null) return [...reviews];
  return reviews.filter((review) => review.date >= start);
}
