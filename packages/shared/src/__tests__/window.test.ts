import { describe, expect, it } from 'vitest';
import { ALL_REVIEWS_CEILING } from '../constants';
import { isAnalysisWindow, isSampleLimit, resolveLimit, windowStart } from '../window';

const NOW = new Date('2026-09-14T13:45:00Z');

describe('windowStart', () => {
  it('returns null for all time', () => {
    expect(windowStart('all', NOW)).toBeNull();
  });

  it('computes calendar windows in UTC', () => {
    expect(windowStart('thisYear', NOW)).toBe('2026-01-01');
    expect(windowStart('thisMonth', NOW)).toBe('2026-09-01');
    expect(windowStart('last12m', NOW)).toBe('2025-09-14');
    expect(windowStart('last6m', NOW)).toBe('2026-03-14');
    expect(windowStart('last3m', NOW)).toBe('2026-06-14');
  });

  it('rolls month arithmetic over year and month-length boundaries', () => {
    expect(windowStart('last3m', new Date('2026-01-31T00:00:00Z'))).toBe('2025-10-31');
    expect(windowStart('last6m', new Date('2026-08-31T00:00:00Z'))).toBe('2026-03-03');
  });
});

describe('guards and limits', () => {
  it('accepts only the listed values', () => {
    expect(isSampleLimit(200)).toBe(true);
    expect(isSampleLimit('all')).toBe(true);
    expect(isSampleLimit(300)).toBe(false);
    expect(isSampleLimit('ALL')).toBe(false);
    expect(isAnalysisWindow('last3m')).toBe(true);
    expect(isAnalysisWindow('yesterday')).toBe(false);
  });

  it('resolves "all" to the ceiling', () => {
    expect(resolveLimit(500)).toBe(500);
    expect(resolveLimit('all')).toBe(ALL_REVIEWS_CEILING);
  });
});
