/**
 * Reads the place header: identifier (from the URL), displayed name, overall
 * rating and total review count.
 */
import { parseDisplayedCount, parseRating } from './numbers';
import { ownText, rule } from './selectors';
import { parsePlaceIdFromUrl } from './url';

export interface PlaceContext {
  /** Normalised place identifier from the URL (see parsePlaceIdFromUrl). */
  placeId: string;
  /** Business name as shown in the place header. */
  name: string | null;
  /** e.g. "1,240 reviews" -> 1240. */
  totalReviewCount: number | null;
  /** e.g. 4.4 (decimal comma handled). */
  overallRating: number | null;
  url: string;
}

function nonEmpty(text: string | null | undefined): string | null {
  const trimmed = (text ?? '').replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The placeName rule yields either the h1 (text) or the main panel (aria-label). */
function readName(el: Element | undefined): string | null {
  if (!el) return null;
  if (el.getAttribute('role') === 'main') return nonEmpty(el.getAttribute('aria-label'));
  return nonEmpty(el.textContent);
}

export function readPlaceContext(doc: Document, url: string): PlaceContext | null {
  const placeId = parsePlaceIdFromUrl(url);
  if (placeId === null) return null;

  const name = readName(rule('placeName').find(doc)[0]);

  const ratingLabel = rule('headerRating').find(doc)[0]?.getAttribute('aria-label') ?? '';
  const rating = parseRating(ratingLabel);
  const overallRating = rating !== null && rating >= 1 ? rating : null;

  let totalReviewCount: number | null = null;
  for (const el of rule('headerReviewCount').find(doc)) {
    totalReviewCount =
      parseDisplayedCount(el.getAttribute('aria-label') ?? '') ?? parseDisplayedCount(ownText(el));
    if (totalReviewCount !== null) break;
  }

  return { placeId, name, totalReviewCount, overallRating, url };
}
