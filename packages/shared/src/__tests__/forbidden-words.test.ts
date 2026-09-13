import { describe, expect, it } from 'vitest';
import { containsForbiddenWords, findForbiddenWords, FORBIDDEN_ENTRIES } from '../forbidden-words';

describe('forbidden words', () => {
  it('has entries for every supported UI language', () => {
    const langs = new Set(FORBIDDEN_ENTRIES.map((e) => e.lang));
    expect([...langs].sort()).toEqual(['de', 'en', 'es', 'tr']);
  });

  it('flags accusatory wording in all four languages', () => {
    for (const sample of [
      'These reviews look fake.',
      'Bu yorumlar sahte olabilir',
      'Diese Bewertungen sind gefälscht',
      'Estas reseñas son falsas',
      'Probably written by bots',
      'satın alınmış yorumlar',
      'Purchased reviews are common',
    ]) {
      expect(containsForbiddenWords(sample), sample).toBe(true);
    }
  });

  it('accepts factual, measurable language', () => {
    for (const sample of [
      '62% of reviews were posted within a 14-day window.',
      'Yorumcuların %71 inin başka yorumu yok.',
      'Das Bewertungsmuster ist ungewöhnlich. Das Angebot war gut.',
      'El patrón de reseñas es inusual.',
      'The robot vacuum was great.',
      'This value is false in the settings.',
      'We purchased a coffee and left a review.',
    ]) {
      expect(containsForbiddenWords(sample), sample).toBe(false);
    }
  });

  it('reports line and column of each match', () => {
    const matches = findForbiddenWords('ok line\nthis is a scam here');
    expect(matches).toHaveLength(1);
    expect(matches[0]!.line).toBe(2);
    expect(matches[0]!.column).toBe(11);
    expect(matches[0]!.match).toBe('scam');
  });
});
