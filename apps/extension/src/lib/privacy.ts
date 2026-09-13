/**
 * Data minimisation before anything leaves the browser (docs/PRIVACY.md).
 *
 * - Reviewer ids are replaced by sha256(reviewerId | placeId | dailySalt).
 *   The salt is random, generated locally and rotated every UTC day, so the
 *   hash cannot be linked across places or across days.
 * - Reviews without a visible reviewer id get a hash of a random uuid, so
 *   they still count as distinct reviewers.
 * - Display names, date labels, profile links and avatars are never copied.
 */
import {
  AnalysisRequestSchema,
  MAX_REVIEWS_PER_REQUEST,
  ReviewSchema,
  type AnalysisRequestInput,
  type Locale,
  type Review,
} from '@signalyze/shared';
import { browser } from 'wxt/browser';
import type { PlaceContext, RawReview } from '@/adapters/google-maps';

export const SALT_STORAGE_KEY = 'dailySalt';
export const MAX_TEXT_CHARS = 2000;

interface StoredSalt {
  /** UTC calendar day the salt was generated on. */
  date: string;
  /** 32 random bytes as 64 hex characters. */
  salt: string;
}

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function isStoredSalt(value: unknown): value is StoredSalt {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.date === 'string' &&
    typeof record.salt === 'string' &&
    /^[0-9a-f]{64}$/.test(record.salt)
  );
}

/** Returns today's salt, generating and storing a fresh one when the UTC day changed. */
export async function dailySalt(now: Date = new Date()): Promise<string> {
  const today = utcDay(now);
  const stored: unknown = (await browser.storage.local.get(SALT_STORAGE_KEY))[SALT_STORAGE_KEY];
  if (isStoredSalt(stored) && stored.date === today) return stored.salt;
  const fresh: StoredSalt = { date: today, salt: randomHex(32) };
  await browser.storage.local.set({ [SALT_STORAGE_KEY]: fresh });
  return fresh.salt;
}

/** sha256 hex of `${reviewerId}|${placeId}|${salt}`. */
export async function hashReviewer(
  reviewerId: string,
  placeId: string,
  salt: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${reviewerId}|${placeId}|${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

function truncate(text: string): string {
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

/** Maps a raw review to the wire shape: no reviewer id, no date label, capped texts. */
export function toReview(raw: RawReview, reviewerHash: string): Review {
  return {
    reviewerHash,
    rating: raw.rating,
    date: raw.date,
    text: truncate(raw.text),
    reviewerReviewCount: raw.reviewerReviewCount,
    photoCount: raw.photoCount,
    localGuideLevel: raw.localGuideLevel,
    ownerResponse: raw.ownerResponse === null ? null : truncate(raw.ownerResponse),
    language: raw.language,
  };
}

export interface BuildRequestOptions {
  /** Injected salt (tests); defaults to today's stored salt. */
  salt?: string;
  now?: Date;
}

export interface BuiltRequest {
  /** Null when no review passed validation or the place id is unusable. */
  request: AnalysisRequestInput | null;
  /** Reviews left out because they did not pass the shared schema. */
  dropped: number;
}

/**
 * Hashes every reviewer and assembles a request that already satisfies
 * AnalysisRequestSchema. Individual invalid reviews are dropped (and counted)
 * rather than failing the whole request.
 */
export async function buildAnalysisRequest(
  context: PlaceContext,
  raws: readonly RawReview[],
  locale: Locale,
  clientVersion: string,
  options: BuildRequestOptions = {},
): Promise<BuiltRequest> {
  const salt = options.salt ?? (await dailySalt(options.now));
  const reviews: Review[] = [];
  let dropped = 0;
  for (const raw of raws.slice(0, MAX_REVIEWS_PER_REQUEST)) {
    const reviewerId = raw.reviewerId ?? `anonymous:${crypto.randomUUID()}`;
    const review = toReview(raw, await hashReviewer(reviewerId, context.placeId, salt));
    if (ReviewSchema.safeParse(review).success) reviews.push(review);
    else dropped += 1;
  }
  if (reviews.length === 0) return { request: null, dropped };

  const candidate: AnalysisRequestInput = {
    placeId: context.placeId,
    reviews,
    totalReviewCount: context.totalReviewCount,
    overallRating: context.overallRating,
    locale,
    clientVersion: clientVersion.slice(0, 32),
  };
  if (!AnalysisRequestSchema.safeParse(candidate).success) {
    return { request: null, dropped: dropped + reviews.length };
  }
  return { request: candidate, dropped };
}
