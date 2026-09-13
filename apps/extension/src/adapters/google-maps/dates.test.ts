import { describe, expect, it } from 'vitest';
import { formatUtcDay, parseRelativeDate } from './dates';

// Sunday 2026-09-13, 10:00 UTC. Chosen so week and month subtraction cross month boundaries.
const NOW = new Date('2026-09-13T10:00:00Z');

describe('parseRelativeDate', () => {
  it.each([
    ['just now', '2026-09-13'],
    ['a day ago', '2026-09-12'],
    ['2 days ago', '2026-09-11'],
    ['a week ago', '2026-09-06'],
    ['3 weeks ago', '2026-08-23'],
    ['a month ago', '2026-08-13'],
    ['5 months ago', '2026-04-13'],
    ['a year ago', '2025-09-13'],
    ['2 years ago', '2024-09-13'],
    ['Edited 2 weeks ago', '2026-08-30'],
    ['3 months ago on Google', '2026-06-13'],
    ['an hour ago', '2026-09-13'],
    ['23 hours ago', '2026-09-12'],
  ])('English: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  it.each([
    ['az önce', '2026-09-13'],
    ['1 gün önce', '2026-09-12'],
    ['2 hafta önce', '2026-08-30'],
    ['3 ay önce', '2026-06-13'],
    ['bir yıl önce', '2025-09-13'],
    ['Düzenlendi: 4 ay önce', '2026-05-13'],
    ['bir ay önce', '2026-08-13'],
  ])('Turkish: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  it.each([
    ['vor einem Tag', '2026-09-12'],
    ['vor 2 Wochen', '2026-08-30'],
    ['vor einem Monat', '2026-08-13'],
    ['vor 3 Jahren', '2023-09-13'],
    ['Bearbeitet vor einer Woche', '2026-09-06'],
    ['vor einem Jahr', '2025-09-13'],
  ])('German: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  it.each([
    ['hace un día', '2026-09-12'],
    ['hace 2 semanas', '2026-08-30'],
    ['hace un mes', '2026-08-13'],
    ['hace 3 años', '2023-09-13'],
    ['Editado hace 6 meses', '2026-03-13'],
    ['hace una semana', '2026-09-06'],
  ])('Spanish: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  it('clamps the day when the target month is shorter', () => {
    expect(parseRelativeDate('a month ago', new Date('2026-03-31T00:00:00Z'))).toBe('2026-02-28');
    expect(parseRelativeDate('a year ago', new Date('2028-02-29T00:00:00Z'))).toBe('2027-02-28');
  });

  it('crosses year boundaries when subtracting months', () => {
    expect(parseRelativeDate('10 months ago', new Date('2026-03-15T00:00:00Z'))).toBe('2025-05-15');
  });

  it('returns null for unknown formats', () => {
    expect(parseRelativeDate('', NOW)).toBeNull();
    expect(parseRelativeDate('12 reviews', NOW)).toBeNull();
    expect(parseRelativeDate('March 2024', NOW)).toBeNull();
    expect(parseRelativeDate('2 weeks', NOW)).toBeNull();
    expect(parseRelativeDate('a day ago', new Date('invalid'))).toBeNull();
  });
});

describe('formatUtcDay', () => {
  it('pads month and day', () => {
    expect(formatUtcDay(new Date('2026-01-05T23:59:59Z'))).toBe('2026-01-05');
  });
});
