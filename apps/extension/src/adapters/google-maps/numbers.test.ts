import { describe, expect, it } from 'vitest';
import {
  parseDisplayedCount,
  parseFirstInteger,
  parseNumberSequence,
  parseRating,
  parseStarCount,
} from './numbers';

const NBSP = String.fromCharCode(0xa0);
const NNBSP = String.fromCharCode(0x202f);

describe('parseDisplayedCount', () => {
  it.each([
    ['1,240 reviews', 1240],
    ['1.240 Rezensionen', 1240],
    ['1 240 reseñas', 1240],
    [`1${NBSP}240`, 1240],
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

  it.each([
    ["1'240 Rezensionen", 1240],
    [`1${NNBSP}240 avis`, 1240],
    ['7 424 отзыва', 7424],
    ['1,23,456', 123456],
    ['12,34,567 समीक्षाएं', 1234567],
    ['1.2万', 12000],
    ['1.2万件のクチコミ', 12000],
    ['5천개', 5000],
    ['1.5만개', 15000],
    ['12 ألف مراجعة', 12000],
    ['٧٬٤٢٤ مراجعة', 7424],
    ['1,5 тыс. отзывов', 1500],
    ['1,2 mil avaliações', 1200],
    ['2,5 mi avaliações', 2500000],
    ['3 rb ulasan', 3000],
    ['1,2 jt ulasan', 1200000],
    ['리뷰 7,424개', 7424],
    ['รีวิว 7,424 รายการ', 7424],
    ['7.424 de recenzii', 7424],
  ])('locale forms: %s -> %s', (text, expected) => {
    expect(parseDisplayedCount(text)).toBe(expected);
  });

  it('returns null for text without a number or with inconsistent grouping', () => {
    expect(parseDisplayedCount('reviews')).toBeNull();
    expect(parseDisplayedCount('4,4')).toBeNull();
    expect(parseDisplayedCount('1,24')).toBeNull();
    expect(parseDisplayedCount('1234,567')).toBeNull();
    expect(parseDisplayedCount('1,234,56')).toBeNull();
  });
});

describe('parseNumberSequence', () => {
  it.each([
    ['Local Guide · 45 reviews · 12 photos', [45, 12]],
    ['리뷰 45개 · 사진 12장', [45, 12]],
    ['Yerel Rehber · 1.107 yorum · 6.721 fotoğraf', [1107, 6721]],
    [`Local Guide · 1${NNBSP}107 avis · 6${NNBSP}721 photos`, [1107, 6721]],
    ['ローカルガイド · クチコミ 45 件 · 写真 12 枚', [45, 12]],
    ['مرشد محلي · ٤٥ مراجعة · ١٢ صورة', [45, 12]],
    ['3 reviews', [3]],
    ['1,2 B yorum | 3 fotoğraf', [1200, 3]],
    ['no numbers', []],
  ])('%s -> %j', (text, expected) => {
    expect(parseNumberSequence(text)).toEqual(expected);
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
    ['별표 4.6개', 4.6],
    ['Оценка: 4,6', 4.6],
    ['4,6 étoiles', 4.6],
    ['4.6 つ星', 4.6],
    ['٤٫٦ نجوم', 4.6],
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
    ['5 étoiles', 5],
    ['5 つ星', 5],
    ['5 星', 5],
    ['별표 5개', 5],
    ['5 نجوم', 5],
    ['٥ نجوم', 5],
    ['Оценка: 5', 5],
    ['5/5', 5],
    ['5,0', 5],
    ['4.0 stars', 4],
    ['3 כוכבים', 3],
    ['2 ดาว', 2],
  ])('%s -> %s', (text, expected) => {
    expect(parseStarCount(text)).toBe(expected);
  });

  it('rejects fractional or out-of-range values', () => {
    expect(parseStarCount('4.4 stars')).toBeNull();
    expect(parseStarCount('0 stars')).toBeNull();
    expect(parseStarCount('6 stars')).toBeNull();
    expect(parseStarCount('10 つ星')).toBeNull();
    expect(parseStarCount('no rating')).toBeNull();
  });
});

describe('parseFirstInteger', () => {
  it('returns the first integer or null', () => {
    expect(parseFirstInteger('Level 5')).toBe(5);
    expect(parseFirstInteger('Photo 12')).toBe(12);
    expect(parseFirstInteger('レベル ７')).toBe(7);
    expect(parseFirstInteger('none')).toBeNull();
  });
});
