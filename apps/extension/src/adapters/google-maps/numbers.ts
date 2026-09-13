/**
 * Parsing of numbers as Google Maps displays them: counts with locale
 * thousand separators or K/M style suffixes, and ratings with a decimal
 * point or comma.
 */

/** Suffix -> multiplier, lower-cased. Covers en (K/M/B), tr (B/Mn), de (Tsd./Mio.), es (mil/M). */
const SUFFIX_MULTIPLIERS: readonly (readonly [RegExp, number])[] = [
  [/^(k|b|bin|tsd\.?|mil)$/i, 1_000],
  [/^(m|mn|mio\.?|mln\.?|millones|million)$/i, 1_000_000],
];

/** Thousand/decimal separators: ".", ",", whitespace, no-break space and narrow no-break space. */
const SEPARATOR_CLASS = `[.,\\s${String.fromCharCode(0xa0)}${String.fromCharCode(0x202f)}]`;
const COUNT_PATTERN = new RegExp(`(\\d+(?:${SEPARATOR_CLASS}\\d+)*)\\s*([A-Za-z]+\\.?)?`, 'u');
const SEPARATOR_PATTERN = new RegExp(SEPARATOR_CLASS, 'u');

/**
 * Parses a displayed count such as "1,240", "1.240", "1 240", "12K", "1.2K",
 * "1,2 B" (Turkish thousand), "3,4 Mio." into an integer. Returns null when no
 * unambiguous integer can be derived.
 */
export function parseDisplayedCount(text: string): number | null {
  const match = COUNT_PATTERN.exec(text);
  if (!match) return null;
  const digits = match[1] ?? '';
  const suffix = match[2] ?? '';
  const multiplier = SUFFIX_MULTIPLIERS.find(([pattern]) => pattern.test(suffix))?.[1];

  const groups = digits.split(SEPARATOR_PATTERN);
  if (multiplier !== undefined) {
    // With a suffix the single separator is a decimal separator: "1,2 B" -> 1200.
    if (groups.length > 2) return null;
    const value = Number(groups.join('.'));
    return Number.isFinite(value) ? Math.round(value * multiplier) : null;
  }
  // Without a suffix every separator must be a thousand separator.
  const grouped = groups.slice(1).every((group) => group.length === 3);
  if (!grouped) return null;
  const value = Number(groups.join(''));
  return Number.isSafeInteger(value) ? value : null;
}

const DECIMAL_PATTERN = /(\d+(?:[.,]\d+)?)/;

/**
 * Parses a rating value such as "4.4", "4,4 yıldız", "4.4 stars" or "5/5"
 * into a number within 0..5. Returns null otherwise.
 */
export function parseRating(text: string): number | null {
  const match = DECIMAL_PATTERN.exec(text);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 5) return null;
  return value;
}

/**
 * Parses the integer star count from a review's rating label, e.g. "5 stars",
 * "5 yıldız", "5 Sterne", "5 estrellas" or "Rated 4.0 out of 5". Returns an
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
  const match = /\d+/.exec(text);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isSafeInteger(value) ? value : null;
}
