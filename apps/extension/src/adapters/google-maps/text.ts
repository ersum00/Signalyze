/**
 * Text folding and dictionary matching shared by the parsers, so the Unicode
 * details (digit blocks, Arabic letter variants, scripts written without
 * spaces) live in one place.
 */

/** Zero code points of the digit blocks Google renders in some locales. */
const DIGIT_ZEROS: readonly number[] = [0x0660, 0x06f0, 0x0966, 0x0e50];
/** Arabic-Indic, Persian, Devanagari and Thai digits. */
const FOREIGN_DIGIT = /[٠-٩۰-۹०-९๐-๙]/gu;

/**
 * Rewrites non-ASCII digits as ASCII digits (full-width forms through NFKC),
 * the Arabic decimal separator as "." and the Arabic thousands separator as ",".
 */
export function normaliseDigits(text: string): string {
  return text
    .normalize('NFKC')
    .replace(FOREIGN_DIGIT, (ch) => {
      const code = ch.codePointAt(0) ?? 0;
      const zero = DIGIT_ZEROS.find((z) => code >= z && code <= z + 9);
      return zero === undefined ? ch : String(code - zero);
    })
    .replace(/٫/gu, '.')
    .replace(/٬/gu, ',');
}

/** Alef with hamza / madda / wasla -> bare alef, so "أسبوع" and "اسبوع" compare equal. */
const ARABIC_ALEF = /[آأإٱ]/gu;
/** Arabic short vowels, tatweel and the superscript alef. */
const ARABIC_MARKS = /[ً-ٰٟـ]/gu;
const APOSTROPHES = /[‘’ʻʼ`´]/gu;

/**
 * Canonical form used on both sides of every dictionary comparison: NFKC,
 * lower case, ASCII digits, unified Arabic letters, ASCII apostrophe, single
 * spaces.
 */
export function foldText(text: string): string {
  return normaliseDigits(text)
    .toLowerCase()
    .replace(ARABIC_ALEF, 'ا')
    .replace(ARABIC_MARKS, '')
    .replace(APOSTROPHES, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Any letter or combining mark: the characters a word continues with. */
const WORD_CHAR = '[\\p{L}\\p{M}]';
/** Scripts written without spaces between words; their terms match anywhere. */
const UNSPACED_SCRIPT = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

export type TermMode = 'exact' | 'prefix';

/**
 * Regex source for one dictionary term. A term in an unspaced script matches
 * as a substring; otherwise it must start at a word boundary and, in `exact`
 * mode, end at one. A leading "=" forces exact mode for a single term.
 */
export function termPattern(term: string, defaultMode: TermMode): string {
  const exact = term.startsWith('=');
  const folded = foldText(exact ? term.slice(1) : term);
  const escaped = escapeRegExp(folded);
  if (UNSPACED_SCRIPT.test(folded)) return escaped;
  const mode: TermMode = exact ? 'exact' : defaultMode;
  return `(?<!${WORD_CHAR})${escaped}${mode === 'exact' ? `(?!${WORD_CHAR})` : ''}`;
}

/**
 * Compiles a dictionary into one regex (longest terms first). Test it against
 * `foldText(...)` output only; the terms are folded the same way.
 */
export function compileTerms(terms: readonly string[], defaultMode: TermMode = 'exact'): RegExp {
  const unique = Array.from(new Set(terms.map((term) => term.trim()).filter((t) => t.length > 0)));
  unique.sort((a, b) => b.length - a.length);
  return new RegExp(`(?:${unique.map((term) => termPattern(term, defaultMode)).join('|')})`, 'u');
}

export function dictionaryTerms(dictionary: Record<string, readonly string[]>): string[] {
  return Object.values(dictionary).flat();
}
