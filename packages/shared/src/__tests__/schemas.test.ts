import { describe, expect, it } from 'vitest';
import { AnalysisRequestSchema, AnalysisResultSchema, ReviewSchema } from '../schemas';
import { MAX_REVIEWS_PER_REQUEST } from '../constants';

const validReview = {
  reviewerHash: 'a'.repeat(64),
  rating: 5,
  date: '2026-03-14',
  text: 'Great place, friendly staff.',
  reviewerReviewCount: 12,
  photoCount: 1,
  localGuideLevel: 4,
  ownerResponse: null,
  language: 'en',
};

describe('ReviewSchema', () => {
  it('accepts a minimal, privacy-preserving review', () => {
    expect(ReviewSchema.safeParse(validReview).success).toBe(true);
  });

  it('never accepts reviewer-identifying fields in strict mode', () => {
    const withName = { ...validReview, reviewerName: 'Jane Doe' };
    expect(ReviewSchema.strict().safeParse(withName).success).toBe(false);
  });

  it('strips unknown fields by default so they never reach the engine', () => {
    const parsed = ReviewSchema.parse({ ...validReview, profileUrl: 'https://example.invalid' });
    expect('profileUrl' in parsed).toBe(false);
  });

  it('rejects timestamps with time-of-day precision', () => {
    expect(ReviewSchema.safeParse({ ...validReview, date: '2026-03-14T10:00:00Z' }).success).toBe(
      false,
    );
  });

  it('rejects non-hex reviewer hashes', () => {
    expect(ReviewSchema.safeParse({ ...validReview, reviewerHash: 'user-123' }).success).toBe(
      false,
    );
  });
});

describe('AnalysisRequestSchema', () => {
  it('defaults locale to en', () => {
    const parsed = AnalysisRequestSchema.parse({
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      reviews: [validReview],
      totalReviewCount: 120,
      overallRating: 4.4,
      clientVersion: '0.1.0',
    });
    expect(parsed.locale).toBe('en');
  });

  it('rejects more than the request cap of reviews', () => {
    const reviews = Array.from({ length: MAX_REVIEWS_PER_REQUEST + 1 }, () => validReview);
    const result = AnalysisRequestSchema.safeParse({
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      reviews,
      totalReviewCount: null,
      overallRating: null,
      clientVersion: '0.1.0',
    });
    expect(result.success).toBe(false);
  });
});

describe('AnalysisResultSchema', () => {
  it('allows a null score with insufficient_data status', () => {
    const result = AnalysisResultSchema.safeParse({
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      score: null,
      status: 'insufficient_data',
      reviewCount: 3,
      signals: [],
      monthly: [],
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
      reviewerProfile: {
        singleReviewShare: null,
        medianReviewCount: null,
        localGuideShare: null,
        withPhotosShare: 0,
      },
      source: 'offline',
      engineVersion: '1.0.0',
      computedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});
