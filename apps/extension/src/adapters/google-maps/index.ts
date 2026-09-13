/**
 * Google Maps adapter: the only place in the extension that touches the DOM.
 * Everything else consumes the plain data returned here. See docs/DECISIONS.md.
 */
export { parseRelativeDate } from './dates';
export type { CollectOptions, CollectResult, CollectStatus } from './panel';
export { collectReviews } from './panel';
export type { PlaceContext } from './place';
export { readPlaceContext } from './place';
export type { RawReview, ReadResult, SkippedCounts } from './reviews';
export { readVisibleReviews, readVisibleReviewsDetailed } from './reviews';
export type { LayoutCheck, SelectorRule } from './selectors';
export { RULES, checkLayout } from './selectors';
export { parsePlaceIdFromUrl } from './url';

export const ADAPTER_VERSION = '1.0.0';
