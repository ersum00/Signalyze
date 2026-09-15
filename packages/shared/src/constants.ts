/** Minimum number of reviews before a score is computed. Below this: "insufficient data". */
export const MIN_REVIEWS_FOR_SCORE = 15;

/** Default number of reviews the extension loads when the user clicks Analyze. */
export const DEFAULT_REVIEW_LIMIT = 200;

/** Review-count choices offered on the Home view; 'all' loads until Google shows no more. */
export const SAMPLE_LIMITS = [200, 500, 1000] as const;
export type SampleLimit = (typeof SAMPLE_LIMITS)[number] | 'all';

/** Hard ceiling for 'all': bounds the time budget, the request size and browser memory. */
export const ALL_REVIEWS_CEILING = 2000;

/** Hard cap accepted by the API (also enforced by the 8 MB body limit). */
export const MAX_REVIEWS_PER_REQUEST = ALL_REVIEWS_CEILING;

/** Periods an analysis can be restricted to. Start days are computed in UTC (see window.ts). */
export const ANALYSIS_WINDOWS = [
  'all',
  'thisYear',
  'last12m',
  'last6m',
  'last3m',
  'thisMonth',
] as const;
export type AnalysisWindow = (typeof ANALYSIS_WINDOWS)[number];

/** Server-side cache TTL for computed profiles, in days. */
export const CACHE_TTL_DAYS = 7;

/** Delay between programmatic scrolls of the review panel, in milliseconds. */
export const SCROLL_INTERVAL_MS = 600;

/** Window length used by the burst signal, in days. */
export const BURST_WINDOW_DAYS = 14;

export const API_BASE_URL = 'https://api.signalyze.veriskor.com';
export const LANDING_URL = 'https://signalyze.veriskor.com';
export const METHODOLOGY_URL = `${LANDING_URL}/methodology`;
export const PRIVACY_URL = `${LANDING_URL}/privacy`;

/** Length of the text-similarity character n-grams. */
export const NGRAM_SIZE = 3;

/** Reviews shorter than this many characters count as "short text". */
export const SHORT_TEXT_CHARS = 40;

/** Pair Jaccard similarity above this value counts as a "near-duplicate pair". */
export const SIMILAR_PAIR_THRESHOLD = 0.5;

/** Local Guide level considered "established" for the local_guide_ratio signal. */
export const LOCAL_GUIDE_ESTABLISHED_LEVEL = 3;

export const SUPPORTED_LOCALES = ['en', 'tr', 'de', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
