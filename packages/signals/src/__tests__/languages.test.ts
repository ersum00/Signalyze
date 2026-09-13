/**
 * Consistency of the language data files (the Python port loads the same
 * files, so a problem caught here is caught for both runtimes).
 */
import { describe, expect, it } from 'vitest';
import { findForbiddenWords } from '@signalyze/shared';
import languages from '../../data/languages.json';
import lexicon from '../../data/sentiment-lexicon.json';
import stopwords from '../../data/stopwords.json';
import phrases from '../../data/template-phrases.json';
import { MULTILINGUAL_POOLS } from '../testing/synthetic';
import {
  detectLanguage,
  ENGINE_LANGUAGES,
  LANGUAGE_TABLE,
  MATCH_MODE,
  matchesPhrase,
  normalizeText,
  type EngineLanguage,
} from '../text';

const STOPWORDS: Record<EngineLanguage, readonly string[]> = stopwords;
const PHRASES: Record<EngineLanguage, readonly string[]> = phrases;
const LEXICON: Record<
  EngineLanguage,
  { positive: readonly string[]; negative: readonly string[] }
> = lexicon;

function unique(list: readonly string[]): boolean {
  return new Set(list).size === list.length;
}

describe('languages.json', () => {
  it('lists exactly the engine languages, in order', () => {
    expect(languages.languages.map((l) => l.code)).toEqual([...ENGINE_LANGUAGES]);
    expect(LANGUAGE_TABLE.map((l) => l.code)).toEqual([...ENGINE_LANGUAGES]);
  });

  it('puts the default of each vote first and marks only ja and zh as substring languages', () => {
    expect(LANGUAGE_TABLE.find((l) => l.script === 'latin')?.code).toBe('en');
    expect(LANGUAGE_TABLE.find((l) => l.script === 'cyrillic')?.code).toBe('ru');
    const substring = ENGINE_LANGUAGES.filter((l) => MATCH_MODE[l] === 'substring');
    expect(substring).toEqual(['ja', 'zh']);
  });
});

describe('dictionaries', () => {
  for (const lang of ENGINE_LANGUAGES) {
    describe(lang, () => {
      it('has enough entries and no duplicates', () => {
        expect(STOPWORDS[lang].length).toBeGreaterThanOrEqual(25);
        expect(PHRASES[lang].length).toBeGreaterThanOrEqual(18);
        expect(LEXICON[lang].positive.length).toBeGreaterThanOrEqual(25);
        expect(LEXICON[lang].negative.length).toBeGreaterThanOrEqual(25);
        expect(unique(STOPWORDS[lang])).toBe(true);
        expect(unique(PHRASES[lang].map(normalizeText))).toBe(true);
        expect(unique(LEXICON[lang].positive.map(normalizeText))).toBe(true);
        expect(unique(LEXICON[lang].negative.map(normalizeText))).toBe(true);
      });

      it('has non-empty normalised entries and disjoint tone lists', () => {
        const positive = new Set(LEXICON[lang].positive.map(normalizeText));
        for (const entry of [
          ...PHRASES[lang],
          ...LEXICON[lang].positive,
          ...LEXICON[lang].negative,
        ]) {
          expect(normalizeText(entry)).not.toBe('');
        }
        for (const entry of LEXICON[lang].negative) {
          expect(positive.has(normalizeText(entry))).toBe(false);
        }
      });

      if (MATCH_MODE[lang] === 'word') {
        it('keeps lexicon entries to single tokens (word mode matches whole tokens)', () => {
          for (const entry of [...LEXICON[lang].positive, ...LEXICON[lang].negative]) {
            expect(normalizeText(entry)).not.toContain(' ');
          }
        });
      } else {
        it('has no phrase nested in another phrase (substring mode double-counts them)', () => {
          const list = PHRASES[lang].map(normalizeText);
          for (const a of list) {
            for (const b of list) {
              if (a !== b) expect(matchesPhrase(b, a, 'substring')).toBe(false);
            }
          }
        });
      }
    });
  }

  it('contain no forbidden words (language policy applies to every language)', () => {
    const everything = ENGINE_LANGUAGES.flatMap((lang) => [
      ...STOPWORDS[lang],
      ...PHRASES[lang],
      ...LEXICON[lang].positive,
      ...LEXICON[lang].negative,
    ]).join('\n');
    expect(findForbiddenWords(everything)).toEqual([]);
  });
});

describe('multilingual pools', () => {
  it('cover every engine language plus one pool without a dictionary', () => {
    const detected = MULTILINGUAL_POOLS.map((p) => p.detected);
    for (const lang of ENGINE_LANGUAGES) expect(detected).toContain(lang);
    expect(detected).toContain('other');
  });

  for (const pool of MULTILINGUAL_POOLS) {
    it(`detects every text of the ${pool.detected} pool as ${pool.detected}`, () => {
      for (const text of [...pool.positive, ...pool.negative, ...pool.stock]) {
        expect(detectLanguage(normalizeText(text)), text).toBe(pool.detected);
      }
    });
  }
});
