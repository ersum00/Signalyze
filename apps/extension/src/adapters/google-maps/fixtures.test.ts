/**
 * Regression tests against captured Google Maps panels (fixtures/*.html).
 *
 * Each fixture has a `.meta.json` (written by scripts/capture-fixture.mjs) and an
 * `.expected.json` snapshot of what the adapter reads from it. Regenerate the
 * snapshots after an intentional adapter change with:
 *
 *   UPDATE_FIXTURE_EXPECTED=1 pnpm --filter @signalyze/extension test
 *
 * and review the diff by hand (rating distribution, dates, a few texts).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PlaceIdSchema, ReviewSchema } from '@signalyze/shared';
import { describe, expect, it } from 'vitest';
import type { RawReview, SkippedCounts } from './index';
import {
  ADAPTER_VERSION,
  checkLayout,
  collectReviews,
  parsePlaceIdFromUrl,
  readPlaceContext,
  readVisibleReviewsDetailed,
} from './index';

// Vitest rewrites import.meta.url under jsdom, so resolve relative to the test file's directory.
const FIXTURE_DIR = join(__dirname, 'fixtures');
const UPDATE = process.env.UPDATE_FIXTURE_EXPECTED === '1';

interface FixtureMeta {
  url: string;
  capturedAt: string;
  hl: string;
  reviewCountLoaded: number;
  limitedView?: boolean;
}

interface ExpectedReview {
  reviewerId: string | null;
  rating: number;
  dateText: string;
  date: string;
  photoCount: number;
  reviewerReviewCount: number | null;
  localGuideLevel: number | null;
  ownerResponseLength: number | null;
  textLength: number;
  textStart: string;
}

interface ExpectedFixture {
  adapterVersion: string;
  placeId: string | null;
  name: string | null;
  totalReviewCount: number | null;
  overallRating: number | null;
  language: string | null;
  reviewCount: number;
  skipped: SkippedCounts;
  ratingDistribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  reviews: ExpectedReview[];
}

function summarise(review: RawReview): ExpectedReview {
  return {
    reviewerId: review.reviewerId,
    rating: review.rating,
    dateText: review.dateText,
    date: review.date,
    photoCount: review.photoCount,
    reviewerReviewCount: review.reviewerReviewCount,
    localGuideLevel: review.localGuideLevel,
    ownerResponseLength: review.ownerResponse?.length ?? null,
    textLength: review.text.length,
    textStart: review.text.slice(0, 60),
  };
}

function snapshot(doc: Document, meta: FixtureMeta): ExpectedFixture {
  const context = readPlaceContext(doc, meta.url);
  const { reviews, skipped } = readVisibleReviewsDetailed(doc, new Date(meta.capturedAt));
  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  } as ExpectedFixture['ratingDistribution'];
  for (const review of reviews) {
    const key = String(review.rating) as keyof ExpectedFixture['ratingDistribution'];
    ratingDistribution[key] += 1;
  }
  return {
    adapterVersion: ADAPTER_VERSION,
    placeId: parsePlaceIdFromUrl(meta.url),
    name: context?.name ?? null,
    totalReviewCount: context?.totalReviewCount ?? null,
    overallRating: context?.overallRating ?? null,
    language: reviews[0]?.language ?? null,
    reviewCount: reviews.length,
    skipped,
    ratingDistribution,
    reviews: reviews.map(summarise),
  };
}

const slugs = readdirSync(FIXTURE_DIR)
  .filter((name) => name.endsWith('.meta.json'))
  .map((name) => name.replace(/\.meta\.json$/, ''))
  .sort();

describe.each(slugs)('fixture %s', (slug) => {
  const html = readFileSync(join(FIXTURE_DIR, `${slug}.html`), 'utf8');
  const meta = JSON.parse(
    readFileSync(join(FIXTURE_DIR, `${slug}.meta.json`), 'utf8'),
  ) as FixtureMeta;
  const expectedPath = join(FIXTURE_DIR, `${slug}.expected.json`);
  const now = new Date(meta.capturedAt);

  function load(): Document {
    document.documentElement.setAttribute('lang', meta.hl);
    document.body.innerHTML = html;
    return document;
  }

  function expected(): ExpectedFixture {
    if (UPDATE) {
      writeFileSync(expectedPath, `${JSON.stringify(snapshot(load(), meta), null, 2)}\n`);
    }
    if (!existsSync(expectedPath)) {
      throw new Error(`${slug}.expected.json is missing; run with UPDATE_FIXTURE_EXPECTED=1`);
    }
    return JSON.parse(readFileSync(expectedPath, 'utf8')) as ExpectedFixture;
  }

  it('was captured with the full page, not the limited view', () => {
    expect(meta.limitedView ?? false).toBe(false);
  });

  it('parses the place id from the captured URL', () => {
    const placeId = parsePlaceIdFromUrl(meta.url);
    expect(placeId).toBe(expected().placeId);
    expect(PlaceIdSchema.safeParse(placeId).success).toBe(true);
  });

  it('passes the layout self-test', () => {
    expect(checkLayout(load())).toEqual({ ok: true });
  });

  it('reads the place header', () => {
    const context = readPlaceContext(load(), meta.url);
    const want = expected();
    expect(context).not.toBeNull();
    expect(context?.name).toBe(want.name);
    expect(context?.name).toContain(`Business ${slug}`);
    expect(context?.overallRating).toBe(want.overallRating);
    expect(context?.overallRating).toBeGreaterThanOrEqual(1);
    expect(context?.totalReviewCount).toBe(want.totalReviewCount);
    expect(context?.totalReviewCount).toBeGreaterThan(meta.reviewCountLoaded);
  });

  it('reads every loaded review with valid fields', () => {
    const { reviews, skipped } = readVisibleReviewsDetailed(load(), now);
    expect(reviews).toHaveLength(meta.reviewCountLoaded);
    expect(skipped).toEqual({ noRating: 0, noDate: 0, duplicate: 0 });
    for (const review of reviews) {
      expect(Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5).toBe(
        true,
      );
      expect(review.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(review.date <= now.toISOString().slice(0, 10)).toBe(true);
      expect(review.dateText.length).toBeGreaterThan(0);
      expect(review.photoCount).toBeGreaterThanOrEqual(0);
      expect(review.text.length).toBeLessThanOrEqual(2000);
      expect(review.language).toBe(meta.hl);
      // The API schema accepts the review once the id is hashed.
      const parsed = ReviewSchema.safeParse({
        ...review,
        reviewerHash: 'a'.repeat(64),
      });
      expect(parsed.success).toBe(true);
    }
    const withReviewer = reviews.filter((r) => r.reviewerId !== null).length;
    expect(withReviewer).toBeGreaterThanOrEqual(Math.ceil(reviews.length * 0.9));
    expect(new Set(reviews.map((r) => r.reviewerId)).size).toBeGreaterThan(1);
    expect(reviews.some((r) => r.text.length > 0)).toBe(true);
    expect(reviews.some((r) => r.reviewerReviewCount !== null)).toBe(true);
  });

  it('matches the reviewed snapshot', () => {
    expect(snapshot(load(), meta)).toEqual(expected());
  });

  it('collects the same reviews through collectReviews', async () => {
    const doc = load();
    const direct = readVisibleReviewsDetailed(doc, now).reviews;
    const sleep = (): Promise<void> => Promise.resolve();
    const all = await collectReviews(doc, { limit: 500, now, sleep });
    expect(all.status).toBe('exhausted');
    expect(all.reviews).toEqual(direct);
    const some = await collectReviews(doc, { limit: 10, now, sleep });
    expect(some.status).toBe('complete');
    expect(some.reviews).toEqual(direct.slice(0, 10));
  });
});
