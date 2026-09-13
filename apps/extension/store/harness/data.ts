/**
 * Real engine output for the screenshots: the `expected` AnalysisResult of the
 * synthetic datasets in packages/signals/fixtures, validated through the
 * shared schema. Nothing in here is typed by hand.
 */
import { AnalysisResultSchema, type AnalysisResult } from '@signalyze/shared';
import type { PlaceContext } from '@/adapters/google-maps';
import burstFixture from '../../../../packages/signals/fixtures/burst.json';
import normalFixture from '../../../../packages/signals/fixtures/normal.json';
import templateFixture from '../../../../packages/signals/fixtures/template.json';

export type FixtureName = 'template' | 'burst' | 'normal';

const EXPECTED: Record<FixtureName, unknown> = {
  template: templateFixture.expected,
  burst: burstFixture.expected,
  normal: normalFixture.expected,
};

export function fixtureResult(
  name: FixtureName,
  overrides: Partial<AnalysisResult> = {},
): AnalysisResult {
  return { ...AnalysisResultSchema.parse(EXPECTED[name]), ...overrides };
}

/**
 * The place header of the mock page, derived from the same result so the
 * rating, the review count and the analysed count agree with each other.
 */
export function placeFor(result: AnalysisResult): PlaceContext {
  const d = result.ratingDistribution;
  const total = d[1] + d[2] + d[3] + d[4] + d[5];
  const weighted = d[1] + 2 * d[2] + 3 * d[3] + 4 * d[4] + 5 * d[5];
  return {
    placeId: result.placeId,
    name: 'Example Café',
    totalReviewCount: total,
    overallRating: total > 0 ? Math.round((weighted / total) * 10) / 10 : null,
    url: 'https://www.google.com/maps/place/Example+Caf%C3%A9',
  };
}
