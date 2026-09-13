/**
 * Parsing of numbers as Google Maps displays them in any interface language:
 * counts with locale thousand separators (",", ".", spaces, no-break spaces,
 * "'") or a K/M style suffix, ratings with a decimal point or comma, and star
 * labels with the number first or last. Digits from the Arabic-Indic,
 * Persian, Devanagari and Thai blocks are read as ASCII digits.
 */
import { escapeRegExp, normaliseDigits } from './text';

/**
 * Whole-word suffixes (lower case) meaning "thousand": en (K), tr (B, bin),
 * de (Tsd.), es/pt (mil), pl (tys.), ru (тыс.), id (rb), ar (ألف).
 */
const THOUSAND_WORDS: readonly string[] = [
  'k',
  'b',
  'bin',
  'tsd',
  'tsd.',
  'mil',
  'tys',
  'tys.',
  'тыс',
  'тыс.',
  'rb',
  'ألف',
  'الف',
];

/**
 * Whole-word suffixes (lower case) meaning "million": en (M), tr (Mn),
 * de (Mio.), pt (mi), pl/nl (mln), ru (млн), id (jt), ar (مليون).
 */
const MILLION_WORDS: readonly string[] = [
  'm',
  'mn',
  'mi',
  'mio',
  'mio.',
  'mln',
  'mln.',
  'млн',
  'млн.',
  'jt',
  'million',
  'millions',
  'millionen',
  'millones',
  'مليون',
];

/** CJK multipliers are written directly against the number ("1.2万件", "5천개"): only the first character counts. */
const GLUED_MULTIPLIERS: Readonly<Record<string, number>> = {
  千: 1_000,
  천: 1_000,
  万: 10_000,
  萬: 10_000,
  만: 10_000,
  亿: 100_000_000,
  億: 100_000_000,
  억: 100_000_000,
};

/**
 * Regex source matching any count suffix (word suffixes as whole words, CJK
 * multipliers as single characters), for patterns that must step over one.
 * Match it against lower-case text.
 */
export const COUNT_SUFFIX_SOURCE = `(?:(?:${[...THOUSAND_WORDS, ...MILLION_WORDS]
  .slice()
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join('|')})(?![\\p{L}\\p{M}])|[${Object.keys(GLUED_MULTIPLIERS).join('')}])`;

/** Thousand/decimal separators: ".", ",", "'", and any whitespace (JS \s includes NBSP and NNBSP). */
const SEPARATOR_CLASS = "[.,'’\\s]";
const COUNT_PATTERN = new RegExp(`(\\d+(?:${SEPARATOR_CLASS}\\d+)*)\\s*(\\p{L}+\\.?)?`, 'u');
const SEPARATOR_PATTERN = new RegExp(SEPARATOR_CLASS, 'u');

function multiplierOf(word: string): number | undefined {
  if (word.length === 0) return undefined;
  const lower = word.toLowerCase();
  if (THOUSAND_WORDS.includes(lower)) return 1_000;
  if (MILLION_WORDS.includes(lower)) return 1_000_000;
  return GLUED_MULTIPLIERS[word.charAt(0)];
}

/**
 * Joins separator-delimited digit groups into an integer when the grouping is
 * consistent: every group after the first has three digits (Western) or all
 * middle groups have two digits and the last has three (Indian). "1,24" and
 * "4,4" are rejected because they are decimals, not counts.
 */
function joinGroups(groups: readonly string[]): number | null {
  const first = groups[0] ?? '';
  if (groups.length === 1) return Number(first);
  if (first.length > 3) return null;
  const rest = groups.slice(1);
  const last = rest[rest.length - 1] ?? '';
  if (last.length !== 3) return null;
  const middle = rest.slice(0, -1);
  const western = middle.every((group) => group.length === 3);
  const indian = middle.every((group) => group.length === 2);
  if (!western && !indian) return null;
  return Number(groups.join(''));
}

function countFromMatch(match: RegExpExecArray): number | null {
  const digits = match[1] ?? '';
  const multiplier = multiplierOf(match[2] ?? '');
  const groups = digits.split(SEPARATOR_PATTERN);
  if (multiplier !== undefined) {
    // With a suffix the single separator is a decimal separator: "1,2 B" -> 1200.
    if (groups.length > 2) return null;
    const value = Number(groups.join('.'));
    return Number.isFinite(value) ? Math.round(value * multiplier) : null;
  }
  const value = joinGroups(groups);
  return value !== null && Number.isSafeInteger(value) ? value : null;
}

/**
 * Parses a displayed count such as "1,240", "1.240", "1 240", "1'240", "12K",
 * "1.2K", "1,2 B" (Turkish thousand), "3,4 Mio.", "1.2万", "5천", "12 ألف",
 * "١٬٢٤٠" or "1,23,456" (Indian grouping) into an integer. Returns null when
 * no unambiguous integer can be derived from the first number in the text.
 */
export function parseDisplayedCount(text: string): number | null {
  const match = COUNT_PATTERN.exec(normaliseDigits(text));
  return match ? countFromMatch(match) : null;
}

/**
 * Every count in the text, in order of appearance, e.g.
 * "Local Guide · 45 reviews · 12 photos" -> [45, 12]; "리뷰 45개 · 사진 12장" -> [45, 12].
 * Numbers that are not well-formed counts are left out.
 */
export function parseNumberSequence(text: string): number[] {
  const values: number[] = [];
  const pattern = new RegExp(COUNT_PATTERN.source, 'gu');
  const normalised = normaliseDigits(text);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalised)) !== null) {
    const value = countFromMatch(match);
    if (value !== null) values.push(value);
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
  return values;
}

const DECIMAL_PATTERN = /(\d+(?:[.,]\d+)?)/;

/**
 * Parses a rating value such as "4.4", "4,4 yıldız", "4.4 stars", "별표 4.6개",
 * "Оценка: 4,6" or "5/5" into a number within 0..5. The first number in the
 * text is taken. Returns null otherwise.
 */
export function parseRating(text: string): number | null {
  const match = DECIMAL_PATTERN.exec(normaliseDigits(text));
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 5) return null;
  return value;
}

/**
 * Parses the integer star count from a review's rating label, with the number
 * first or last: "5 stars", "5 yıldız", "5 étoiles", "5 つ星", "별표 5개",
 * "٥ نجوم", "Оценка: 5", "5/5", "5,0" or "Rated 4.0 out of 5". Returns an
 * integer within 1..5 or null.
 */
export function parseStarCount(label: string): number | null {
  const value = parseRating(label);
  if (value === null) return null;
  const rounded = Math.round(value);
  if (Math.abs(rounded - value) > 1e-9 || rounded < 1 || rounded > 5) return null;
  return rounded;
}

/**
 * Parses a bounded integer such as a photo count or Local Guide level from
 * free text ("12 photos", "Level 5"). Returns the first integer or null.
 */
export function parseFirstInteger(text: string): number | null {
  const match = /\d+/.exec(normaliseDigits(text));
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isSafeInteger(value) ? value : null;
}
