import { describe, expect, it } from 'vitest';
import { DEFAULT_SCOPE, filterByWindow, scopeOf } from './scope';

describe('scope', () => {
  it('keeps reviews on or after the start day and everything without a start', () => {
    const reviews = [{ date: '2026-07-31' }, { date: '2026-08-01' }, { date: '2026-09-10' }];
    expect(filterByWindow(reviews, '2026-08-01').map((r) => r.date)).toEqual([
      '2026-08-01',
      '2026-09-10',
    ]);
    expect(filterByWindow(reviews, null)).toHaveLength(3);
  });

  it('reads the scope from settings and defaults to 200 reviews, all time', () => {
    expect(scopeOf({ sampleLimit: 'all', window: 'last3m' })).toEqual({
      limit: 'all',
      window: 'last3m',
    });
    expect(DEFAULT_SCOPE).toEqual({ limit: 200, window: 'all' });
  });
});
