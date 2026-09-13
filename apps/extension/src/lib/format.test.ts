import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatDay,
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatRating,
  formatShare,
  formatSignalValue,
  percent,
} from './format';

describe('percent', () => {
  it('rounds a share half up to a whole percentage', () => {
    expect(percent(0.615)).toBe(62);
    expect(percent(0.614)).toBe(61);
    expect(percent(0)).toBe(0);
    expect(percent(1)).toBe(100);
  });
});

describe('formatNumber / formatShare / formatRating', () => {
  it('uses locale separators', () => {
    expect(formatNumber(1240, 'en')).toBe('1,240');
    expect(formatNumber(1240, 'de')).toBe('1.240');
    expect(formatNumber(1240, 'tr')).toBe('1.240');
    expect(formatNumber(0.3149, 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe(
      '0.31',
    );
  });

  it('renders shares with the locale percent style', () => {
    expect(formatShare(0.62, 'en')).toBe('62%');
    expect(formatShare(0.62, 'tr')).toBe('%62');
    expect(formatShare(0.62, 'de').replace(/\s/g, ' ')).toBe('62 %');
  });

  it('keeps one decimal on ratings', () => {
    expect(formatRating(4, 'en')).toBe('4.0');
    expect(formatRating(4.4, 'de')).toBe('4,4');
  });
});

describe('dates', () => {
  it('formats calendar days and months in UTC', () => {
    expect(formatDay('2026-03-12', 'en')).toMatch(/Mar 12, 2026/);
    expect(formatDay('2026-03-12', 'de')).toMatch(/12\. März 2026/);
    expect(formatMonth('2026-03', 'en')).toBe('Mar 2026');
    expect(formatMonthShort('2026-03', 'en')).toBe('Mar');
    expect(formatDateTime('2026-09-12T10:00:00.000Z', 'en')).toMatch(/2026/);
  });

  it('returns invalid input unchanged', () => {
    expect(formatDay('not-a-day', 'en')).toBe('not-a-day');
    expect(formatMonth('2026', 'en')).toBe('2026');
    expect(formatDateTime('nope', 'en')).toBe('nope');
  });
});

describe('formatSignalValue', () => {
  it('follows the declared value format', () => {
    expect(formatSignalValue(0.53, 'ratio', 'en')).toBe('53%');
    expect(formatSignalValue(0.53, 'score', 'en')).toBe('0.53');
    expect(formatSignalValue(12.4, 'count', 'en')).toBe('12');
  });
});
