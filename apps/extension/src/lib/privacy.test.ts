import { AnalysisRequestSchema } from '@signalyze/shared';
import { fakeBrowser } from 'wxt/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_TEXT_CHARS,
  SALT_STORAGE_KEY,
  buildAnalysisRequest,
  dailySalt,
  hashReviewer,
  toReview,
} from './privacy';
import { PLACE, rawReview } from './test-helpers';

const HEX64 = /^[0-9a-f]{64}$/;

describe('hashReviewer', () => {
  it('produces 64 hex characters, deterministic for the same inputs', async () => {
    const a = await hashReviewer('1001', PLACE.placeId, 'salt-a');
    const b = await hashReviewer('1001', PLACE.placeId, 'salt-a');
    expect(a).toMatch(HEX64);
    expect(a).toBe(b);
  });

  it('differs per place and per salt', async () => {
    const base = await hashReviewer('1001', PLACE.placeId, 'salt-a');
    expect(await hashReviewer('1001', 'ChIJother', 'salt-a')).not.toBe(base);
    expect(await hashReviewer('1001', PLACE.placeId, 'salt-b')).not.toBe(base);
    expect(await hashReviewer('1002', PLACE.placeId, 'salt-a')).not.toBe(base);
  });
});

describe('toReview', () => {
  it('drops reviewer id and date label and caps texts', () => {
    const raw = rawReview({
      text: 'x'.repeat(MAX_TEXT_CHARS + 50),
      ownerResponse: 'y'.repeat(MAX_TEXT_CHARS + 5),
    });
    const review = toReview(raw, 'a'.repeat(64));
    expect(Object.keys(review)).not.toContain('reviewerId');
    expect(Object.keys(review)).not.toContain('dateText');
    expect(Object.keys(review)).not.toContain('name');
    expect(review.text).toHaveLength(MAX_TEXT_CHARS);
    expect(review.ownerResponse).toHaveLength(MAX_TEXT_CHARS);
    expect(review.reviewerHash).toBe('a'.repeat(64));
  });
});

describe('dailySalt', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('stores a 64-hex salt and reuses it within the same UTC day', async () => {
    const first = await dailySalt(new Date('2026-09-12T01:00:00Z'));
    const second = await dailySalt(new Date('2026-09-12T23:59:00Z'));
    expect(first).toMatch(HEX64);
    expect(second).toBe(first);
    const stored = (await fakeBrowser.storage.local.get(SALT_STORAGE_KEY))[SALT_STORAGE_KEY] as {
      date: string;
    };
    expect(stored.date).toBe('2026-09-12');
  });

  it('rotates when the UTC day changes', async () => {
    const first = await dailySalt(new Date('2026-09-12T12:00:00Z'));
    const next = await dailySalt(new Date('2026-09-13T00:00:01Z'));
    expect(next).toMatch(HEX64);
    expect(next).not.toBe(first);
  });
});

describe('buildAnalysisRequest', () => {
  const SALT = 'f'.repeat(64);

  it('builds a request that passes the strict schema without any reviewer identifier', async () => {
    const raws = [
      rawReview({ reviewerId: '1' }),
      rawReview({ reviewerId: '2', rating: 1, date: '2026-07-01' }),
      rawReview({ reviewerId: null, text: '' }),
      rawReview({ reviewerId: null, text: '' }),
    ];
    const built = await buildAnalysisRequest(PLACE, raws, 'en', '0.1.0', { salt: SALT });
    expect(built.dropped).toBe(0);
    expect(built.request).not.toBeNull();
    const parsed = AnalysisRequestSchema.safeParse(built.request);
    expect(parsed.success).toBe(true);
    const wire = JSON.stringify(built.request);
    expect(wire).not.toContain('reviewerId');
    expect(wire).not.toContain('dateText');
    expect(wire).not.toContain('"name"');
    const hashes = built.request!.reviews.map((r) => r.reviewerHash);
    expect(new Set(hashes).size).toBe(4);
    expect(built.request!.placeId).toBe(PLACE.placeId);
    expect(built.request!.totalReviewCount).toBe(1240);
    expect(built.request!.overallRating).toBe(4.4);
  });

  it('drops individual invalid reviews and counts them', async () => {
    const raws = [rawReview(), rawReview({ rating: 7 }), rawReview({ date: 'yesterday' })];
    const built = await buildAnalysisRequest(PLACE, raws, 'tr', '0.1.0', { salt: SALT });
    expect(built.dropped).toBe(2);
    expect(built.request?.reviews).toHaveLength(1);
  });

  it('returns null when nothing is usable', async () => {
    const built = await buildAnalysisRequest(PLACE, [rawReview({ rating: 0 })], 'en', '0.1.0', {
      salt: SALT,
    });
    expect(built.request).toBeNull();
    expect(built.dropped).toBe(1);
  });
});
