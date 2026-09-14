/**
 * Signalyze signal engine: deterministic, explainable, no language model.
 * Reference implementation; the Python port in apps/api mirrors it and is held
 * to the shared fixtures in packages/signals/fixtures/.
 */
import type { AnalysisResult, Review, SignalResult } from '@signalyze/shared';
import { MIN_REVIEWS_FOR_SCORE, SIGNAL_IDS } from '@signalyze/shared';
import { monthlyCounts, ratingDistribution, reviewerProfile } from './aggregates';
import { prepareReviews } from './prepare';
import thresholds from '../data/thresholds.json';
import { computeScore, WEIGHTS_VERSION } from './score';
import { SIGNAL_FUNCTIONS } from './signals/index';

export const ENGINE_VERSION: string = WEIGHTS_VERSION;

/** Calibration points of every signal, shared byte-for-byte with the Python port. */
export const THRESHOLDS = thresholds;

export interface AnalyzeOptions {
  placeId: string;
  /** Where the engine runs; recorded in the result. */
  source: 'server' | 'offline';
  /** Injected clock for deterministic output. */
  now?: Date;
}

export function computeSignals(reviews: readonly Review[]): SignalResult[] {
  const prepared = prepareReviews(reviews);
  return SIGNAL_IDS.map((id) => SIGNAL_FUNCTIONS[id](prepared));
}

export function analyze(reviews: readonly Review[], options: AnalyzeOptions): AnalysisResult {
  const now = options.now ?? new Date();
  const prepared = prepareReviews(reviews);
  const sufficient = reviews.length >= MIN_REVIEWS_FOR_SCORE;
  const signals = sufficient ? SIGNAL_IDS.map((id) => SIGNAL_FUNCTIONS[id](prepared)) : [];
  const score = sufficient ? computeScore(signals) : null;
  return {
    placeId: options.placeId,
    score,
    status: sufficient ? 'ok' : 'insufficient_data',
    reviewCount: reviews.length,
    signals,
    monthly: monthlyCounts(prepared),
    ratingDistribution: ratingDistribution(prepared),
    reviewerProfile: reviewerProfile(prepared),
    source: options.source,
    engineVersion: ENGINE_VERSION,
    computedAt: now.toISOString(),
  };
}

export { computeScore, WEIGHTS } from './score';
export {
  normalizeText,
  charNgrams,
  jaccard,
  detectLanguage,
  tokenize,
  ENGINE_LANGUAGES,
  LANGUAGE_TABLE,
  MATCH_MODE,
} from './text';
export type { DetectedLanguage, EngineLanguage, LanguageEntry, MatchMode, Script } from './text';
export { toneOf } from './signals/rating-text-mismatch';
export type { PreparedReview } from './prepare';
