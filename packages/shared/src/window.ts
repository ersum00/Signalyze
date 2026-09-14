/**
 * Analysis scope helpers shared by the extension and its tests: which values
 * are valid, how "all" resolves to a number and on which calendar day a
 * period starts. Everything is computed in UTC so a result does not depend on
 * the user's time zone.
 */
import {
  ALL_REVIEWS_CEILING,
  ANALYSIS_WINDOWS,
  SAMPLE_LIMITS,
  type AnalysisWindow,
  type SampleLimit,
} from './constants';

export function isSampleLimit(value: unknown): value is SampleLimit {
  return value === 'all' || (SAMPLE_LIMITS as readonly unknown[]).includes(value);
}

export function isAnalysisWindow(value: unknown): value is AnalysisWindow {
  return (ANALYSIS_WINDOWS as readonly unknown[]).includes(value);
}

/** The number of reviews to load for a choice; 'all' means the ceiling. */
export function resolveLimit(limit: SampleLimit): number {
  return limit === 'all' ? ALL_REVIEWS_CEILING : limit;
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * First calendar day (UTC, "YYYY-MM-DD") of a period, or null for all time.
 * Month subtraction keeps the day of month and lets Date.UTC normalise an
 * overflow (31 August minus six months becomes 3 March).
 */
export function windowStart(window: AnalysisWindow, now: Date): string | null {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  switch (window) {
    case 'all':
      return null;
    case 'thisYear':
      return isoDay(Date.UTC(y, 0, 1));
    case 'thisMonth':
      return isoDay(Date.UTC(y, m, 1));
    case 'last12m':
      return isoDay(Date.UTC(y, m - 12, d));
    case 'last6m':
      return isoDay(Date.UTC(y, m - 6, d));
    case 'last3m':
      return isoDay(Date.UTC(y, m - 3, d));
  }
}
