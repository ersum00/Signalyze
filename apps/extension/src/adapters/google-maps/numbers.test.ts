import { describe, expect, it } from 'vitest';
import { parseDisplayedCount, parseFirstInteger, parseRating, parseStarCount } from './numbers';

describe('parseDisplayedCount', () => {
  it.each([
    ['1,240 reviews', 1240],
    ['1.240 Rezensionen', 1240],
    ['1 240 reseñas', 1240],
    [`1${String.fromCharCode(0xa0)}240`, 1240],
    ['(12,345,678)', 12345678],
    ['87 yorum', 87],
    ['12K', 12000],
    ['1.2K reviews', 1200],
    ['1,2 B yorum', 1200],
    ['3,4 Mio.', 3400000],
    ['12 mil reseñas', 12000],
    ['2 M', 2000000],
    ['Local Guide · 45 reviews · 12 photos', 45],
  ])('%s -> %s', (text, expected) => {
    expect(parseDisplayedCount(text)).toBe(expected);
  });

  it('returns null for text without a number or with inconsistent grouping', () => {
    expect(parseDisplayedCount('reviews')).toBeNull();
    expect(parseDisplayedCount('4,4')).toBeNull();
    expect(parseDisplayedCount('1,24')).toBeNull();
  });
});

describe('parseRating', () => {
  it.each([
    ['4.4', 4.4],
    ['4,4', 4.4],
    ['4.4 stars', 4.4],
    ['4,4 yıldız', 4.4],
    ['5/5', 5],
    ['Rated 3.5 out of 5', 3.5],
  ])('%s -> %s', (text, expected) => {
    expect(parseRating(text)).toBe(expected);
  });

  it('rejects values outside 0..5 and text without numbers', () => {
    expect(parseRating('12 reviews')).toBeNull();
    expect(parseRating('stars')).toBeNull();
  });
});

describe('parseStarCount', () => {
  it.each([
    ['5 stars', 5],
    ['1 star', 1],
    ['4 yıldız', 4],
    ['3 Sterne', 3],
    ['2 estrellas', 2],
    ['Rated 4.0 out of 5', 4],
  ])('%s -> %s', (text, expected) => {
    expect(parseStarCount(text)).toBe(expected);
  });

  it('rejects fractional or out-of-range values', () => {
    expect(parseStarCount('4.4 stars')).toBeNull();
    expect(parseStarCount('0 stars')).toBeNull();
    expect(parseStarCount('no rating')).toBeNull();
  });
});

describe('parseFirstInteger', () => {
  it('returns the first integer or null', () => {
    expect(parseFirstInteger('Level 5')).toBe(5);
    expect(parseFirstInteger('Photo 12')).toBe(12);
    expect(parseFirstInteger('none')).toBeNull();
  });
});
