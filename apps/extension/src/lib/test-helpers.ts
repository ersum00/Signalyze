/**
 * Small deterministic fixtures shared by the extension unit tests. Not
 * imported by production code.
 */
import type { AnalysisResult, Review, SignalResult } from '@signalyze/shared';
import type { PlaceContext, RawReview } from '@/adapters/google-maps';

export const PLACE: PlaceContext = {
  placeId: '0x14cab7650656bd63:0x8ca058b28c20b6c3',
  name: 'Harbour Street Bakery',
  totalReviewCount: 1240,
  overallRating: 4.4,
  url: 'https://www.google.com/maps/place/Harbour+Street+Bakery/data=!4m5!3m4!1s0x14cab7650656bd63:0x8ca058b28c20b6c3',
};

export function hexHash(seed: number): string {
  return seed.toString(16).padStart(64, '0');
}

export function rawReview(overrides: Partial<RawReview> = {}): RawReview {
  return {
    reviewerId: '1001',
    rating: 5,
    dateText: '2 weeks ago',
    date: '2026-08-30',
    text: 'Lovely place, the sourdough is worth the queue.',
    reviewerReviewCount: 12,
    photoCount: 1,
    localGuideLevel: null,
    ownerResponse: null,
    language: 'en',
    ...overrides,
  };
}

export function review(overrides: Partial<Review> = {}): Review {
  return {
    reviewerHash: hexHash(1),
    rating: 5,
    date: '2026-08-30',
    text: 'Lovely place, the sourdough is worth the queue.',
    reviewerReviewCount: 12,
    photoCount: 1,
    localGuideLevel: null,
    ownerResponse: null,
    language: 'en',
    ...overrides,
  };
}

const TEXTS = [
  'We came here on a Saturday afternoon and the soup of the day was surprisingly rich.',
  'Stopped by after work, the waiter remembered our order from last month.',
  'Visited with my parents; the terrace view over the river is lovely in the evening.',
  'Second time here. Parking nearby was tricky on a weekday but worth the detour.',
  'Found this place by accident and the espresso had a pleasant bitter finish.',
  'Booked a table for four, portions were larger than we expected.',
  'Came for the brunch menu, the pastry case looked tempting.',
  'The chicken was cold and the waiter was rude, never again.',
  'Dirty tables and slow service, very disappointing evening.',
  'Prices are fair for the area, reservations recommended on weekends.',
];

/** Twenty varied reviews spread over ten months, enough for every signal to be computed. */
export function sampleReviews(count = 20): Review[] {
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const month = String((i % 10) + 1).padStart(2, '0');
    const day = String((i % 27) + 1).padStart(2, '0');
    const rating = i % 7 === 0 ? 1 : i % 5 === 0 ? 3 : i % 3 === 0 ? 4 : 5;
    out.push(
      review({
        reviewerHash: hexHash(i + 1),
        rating,
        date: `2026-${month}-${day}`,
        text: TEXTS[i % TEXTS.length] ?? '',
        reviewerReviewCount: i % 4 === 0 ? 1 : 5 + i,
        photoCount: i % 3 === 0 ? 1 : 0,
        localGuideLevel: i % 5 === 0 ? 4 : null,
        ownerResponse: i % 2 === 0 ? 'Thank you for visiting, see you soon.' : null,
      }),
    );
  }
  return out;
}

export function signalResult(
  overrides: Partial<SignalResult> & Pick<SignalResult, 'id'>,
): SignalResult {
  return { unusualness: 0.5, value: 0.5, details: {}, available: true, ...overrides };
}

export function analysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    placeId: PLACE.placeId,
    score: 42,
    status: 'ok',
    reviewCount: 20,
    signals: [],
    monthly: [{ month: '2026-08', count: 20 }],
    ratingDistribution: { 1: 2, 2: 0, 3: 3, 4: 5, 5: 10 },
    reviewerProfile: {
      singleReviewShare: 0.25,
      medianReviewCount: 8,
      localGuideShare: null,
      withPhotosShare: 0.3,
    },
    source: 'offline',
    engineVersion: '1.0.0',
    computedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  };
}
