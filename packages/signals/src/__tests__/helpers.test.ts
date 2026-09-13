import { describe, expect, it } from 'vitest';
import {
  addMonths,
  dayNumber,
  entropyBits,
  median,
  monthsBetweenInclusive,
  ramp,
  round6,
  roundHalfUp,
} from '../math';
import { charNgrams, detectLanguage, jaccard, normalizeText, tokenize } from '../text';

describe('math helpers', () => {
  it('ramp is 0 below low, 1 above high, linear between', () => {
    expect(ramp(0.1, 0.2, 0.6)).toBe(0);
    expect(ramp(0.4, 0.2, 0.6)).toBeCloseTo(0.5, 12);
    expect(ramp(0.9, 0.2, 0.6)).toBe(1);
  });

  it('rounds half up, not to even', () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(round6(0.1234565)).toBe(0.123457);
  });

  it('median handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('entropy of a uniform vector is log2(k)', () => {
    expect(entropyBits([5, 5, 5, 5])).toBeCloseTo(2, 12);
    expect(entropyBits([10, 0, 0])).toBe(0);
  });

  it('day and month arithmetic', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('2026-03-01') - dayNumber('2026-02-01')).toBe(28);
    expect(monthsBetweenInclusive('2025-11', '2026-02')).toBe(4);
    expect(addMonths('2025-11', 3)).toBe('2026-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
});

describe('text helpers', () => {
  it('normalises case, punctuation and whitespace', () => {
    expect(normalizeText('  Great   place!!! Loved it. ')).toBe('great place loved it');
    expect(normalizeText('Güler YÜZLÜ personel, teşekkürler!')).toBe(
      'güler yüzlü personel teşekkürler',
    );
  });

  it('builds character trigrams over code points', () => {
    const grams = charNgrams('abcd', 3);
    expect([...grams]).toEqual(['abc', 'bcd']);
    expect(charNgrams('ab', 3).size).toBe(0);
    expect(charNgrams('😀😀😀😀', 3).size).toBe(1);
  });

  it('jaccard of identical sets is 1 and of disjoint sets is 0', () => {
    const a = charNgrams('great place', 3);
    expect(jaccard(a, a)).toBe(1);
    expect(jaccard(a, charNgrams('xyzxyz', 3))).toBe(0);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it('detects the language from stopwords, defaulting to en', () => {
    expect(
      detectLanguage(tokenize(normalizeText('Wir waren sehr zufrieden und kommen gerne wieder'))),
    ).toBe('de');
    expect(detectLanguage(tokenize(normalizeText('Bu yer çok güzel ve personel çok ilgili')))).toBe(
      'tr',
    );
    expect(
      detectLanguage(tokenize(normalizeText('La comida es muy buena y el trato es genial'))),
    ).toBe('es');
    expect(
      detectLanguage(tokenize(normalizeText('The staff was very kind and the food was great'))),
    ).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});
