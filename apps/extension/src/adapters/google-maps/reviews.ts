/**
 * Reads the reviews currently rendered in the Google Maps place panel into
 * plain data. Reviewer display names are never read; the only reviewer
 * attribute taken is the numeric contributor id, which stays in the browser.
 */
import { parseRelativeDate } from './dates';
import { parseDisplayedCount, parseFirstInteger, parseStarCount } from './numbers';
import { OWNER_RESPONSE_WORDS, REVIEW_COUNT_PATTERN, ownText, rule } from './selectors';

export const MAX_TEXT_CHARS = 2000;

export interface RawReview {
  /** Stable per-reviewer id from the DOM (contributor link). Never leaves the browser. */
  reviewerId: string | null;
  /** 1..5 */
  rating: number;
  /** As displayed, e.g. "2 weeks ago", "vor 3 Monaten", "3 ay önce". */
  dateText: string;
  /** "YYYY-MM-DD", best effort from dateText and `now`. */
  date: string;
  /** Full review text, trimmed, at most MAX_TEXT_CHARS characters. */
  text: string;
  /** From "12 reviews" / "12 yorum" / "Local Guide · 45 reviews · 12 photos". */
  reviewerReviewCount: number | null;
  /** Photos attached to this review. */
  photoCount: number;
  /** Only when the DOM shows a level; a badge without level gives null. */
  localGuideLevel: number | null;
  /** Owner reply text, if present. */
  ownerResponse: string | null;
  /** BCP-47 tag of the page (document.documentElement.lang) or null. */
  language: string | null;
}

export interface ReviewEntry {
  /** Value of data-review-id; used to de-duplicate across scroll rounds. */
  id: string;
  review: RawReview;
}

export interface SkippedCounts {
  /** Containers without a parseable 1..5 rating. */
  noRating: number;
  /** Containers whose date text could not be converted to a calendar day. */
  noDate: number;
  /** Containers repeating a data-review-id already read. */
  duplicate: number;
}

export interface ReadResult {
  reviews: RawReview[];
  skipped: SkippedCounts;
}

const CONTRIB_ID = /\/maps\/contrib\/(\d+)/;
const LOCAL_GUIDE_LEVEL = /(level|seviye|stufe|nivel)\s*[:.]?\s*(\d{1,2})/i;
/** "+ 34 more photos" / "+34" overlay on the last photo tile. */
const MORE_PHOTOS = /\+\s*(\d+)/;

/** Collapses whitespace while keeping paragraph breaks, then trims and caps the length. */
function normaliseText(text: string): string {
  const collapsed = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return collapsed.length > MAX_TEXT_CHARS ? collapsed.slice(0, MAX_TEXT_CHARS).trim() : collapsed;
}

function readReviewerId(container: Element): string | null {
  const link = rule('reviewerLink').find(container)[0];
  if (!link) return null;
  const target = link.getAttribute('data-href') ?? link.getAttribute('href') ?? '';
  return CONTRIB_ID.exec(target)?.[1] ?? null;
}

function readDate(container: Element, now: Date): { dateText: string; date: string | null } {
  const candidates = rule('reviewDate')
    .find(container)
    .map((el) => ownText(el));
  for (const dateText of candidates) {
    const date = parseRelativeDate(dateText, now);
    if (date !== null) return { dateText, date };
  }
  return { dateText: candidates[0] ?? '', date: null };
}

function readReviewerStats(container: Element): {
  reviewerReviewCount: number | null;
  localGuideLevel: number | null;
} {
  const link = rule('reviewerLink').find(container)[0];
  const stats = rule('reviewerStats').find(container)[0];
  const statsText = stats ? ownText(stats) : '';
  const countMatch = REVIEW_COUNT_PATTERN.exec(statsText);
  const reviewerReviewCount = countMatch ? parseDisplayedCount(countMatch[0]) : null;
  const levelSource = `${statsText} ${link?.textContent ?? ''}`;
  const levelMatch = LOCAL_GUIDE_LEVEL.exec(levelSource);
  const localGuideLevel = levelMatch?.[2] ? parseFirstInteger(levelMatch[2]) : null;
  return { reviewerReviewCount, localGuideLevel };
}

function readText(container: Element): string {
  const el = rule('reviewText').find(container)[0];
  return el ? normaliseText(el.textContent ?? '') : '';
}

/**
 * Photo tiles attached to the review. Google renders at most four tiles; when
 * more photos exist the last tile reads "+ N more photos", so N is added.
 */
function readPhotoCount(container: Element): number {
  const tiles = rule('reviewPhotos').find(container);
  let extra = 0;
  for (const tile of tiles) {
    const label = `${tile.getAttribute('aria-label') ?? ''} ${tile.textContent ?? ''}`;
    const more = MORE_PHOTOS.exec(label);
    if (more?.[1]) extra = Math.max(extra, parseFirstInteger(more[1]) ?? 0);
  }
  return tiles.length + extra;
}

function readOwnerResponse(container: Element): string | null {
  const block = rule('ownerResponse').find(container)[0];
  if (!block) return null;
  const body = Array.from(block.children)
    .filter((child) => !OWNER_RESPONSE_WORDS.test(child.textContent ?? ''))
    .map((child) => child.textContent ?? '')
    .join('\n');
  const text = normaliseText(body);
  return text.length > 0 ? text : null;
}

function readReview(
  container: Element,
  now: Date,
  language: string | null,
): { entry: ReviewEntry } | { skipped: keyof SkippedCounts } {
  const ratingEl = rule('reviewRating').find(container)[0];
  const ratingSource = ratingEl?.getAttribute('aria-label') ?? (ratingEl ? ownText(ratingEl) : '');
  const rating = parseStarCount(ratingSource);
  if (rating === null) return { skipped: 'noRating' };
  const { dateText, date } = readDate(container, now);
  if (date === null) return { skipped: 'noDate' };
  const id = container.getAttribute('data-review-id') ?? '';
  const { reviewerReviewCount, localGuideLevel } = readReviewerStats(container);
  return {
    entry: {
      id,
      review: {
        reviewerId: readReviewerId(container),
        rating,
        dateText,
        date,
        text: readText(container),
        reviewerReviewCount,
        photoCount: readPhotoCount(container),
        localGuideLevel,
        ownerResponse: readOwnerResponse(container),
        language,
      },
    },
  };
}

export function pageLanguage(doc: Document): string | null {
  const lang = doc.documentElement.getAttribute('lang')?.trim() ?? '';
  return lang.length > 0 && lang.length <= 10 ? lang : null;
}

/** Reads every rendered review with its data-review-id, skipping unparsable ones. */
export function readReviewEntries(
  doc: Document,
  now: Date,
): { entries: ReviewEntry[]; skipped: SkippedCounts } {
  const language = pageLanguage(doc);
  const entries: ReviewEntry[] = [];
  const skipped: SkippedCounts = { noRating: 0, noDate: 0, duplicate: 0 };
  const seen = new Set<string>();
  for (const container of rule('reviewContainer').find(doc)) {
    const result = readReview(container, now, language);
    if ('skipped' in result) {
      skipped[result.skipped] += 1;
      continue;
    }
    if (seen.has(result.entry.id)) {
      skipped.duplicate += 1;
      continue;
    }
    seen.add(result.entry.id);
    entries.push(result.entry);
  }
  return { entries, skipped };
}

export function readVisibleReviewsDetailed(doc: Document, now: Date = new Date()): ReadResult {
  const { entries, skipped } = readReviewEntries(doc, now);
  return { reviews: entries.map((entry) => entry.review), skipped };
}

export function readVisibleReviews(doc: Document, now: Date = new Date()): RawReview[] {
  return readVisibleReviewsDetailed(doc, now).reviews;
}
