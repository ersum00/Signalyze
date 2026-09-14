/**
 * Plain reading of a score: which band it falls in and how many points each
 * signal contributed. Both derive from the engine's published weights so the
 * side panel can never disagree with the number it shows.
 */
import { SIGNAL_IDS, type SignalId, type SignalResult } from '@signalyze/shared';
import { WEIGHTS } from '@signalyze/signals';

/** Bands of the 0-100 score, worded in the i18n files as measurement sentences. */
export type ScoreBand = 'typical' | 'some' | 'many' | 'most';

export const BAND_LIMITS: Readonly<Record<Exclude<ScoreBand, 'most'>, number>> = {
  typical: 20,
  some: 40,
  many: 60,
};

export function scoreBand(score: number): ScoreBand {
  if (score < BAND_LIMITS.typical) return 'typical';
  if (score < BAND_LIMITS.some) return 'some';
  if (score < BAND_LIMITS.many) return 'many';
  return 'most';
}

export interface Contribution {
  id: SignalId;
  /** Points this signal adds to the 0-100 score. */
  points: number;
}

function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Points each available signal adds: round(100 × w × u / Σ w over available
 * signals), the same renormalised mean the engine uses for the score. Sorted
 * largest first; signals that add nothing are left out.
 */
export function contributions(signals: readonly SignalResult[]): Contribution[] {
  let weightSum = 0;
  for (const id of SIGNAL_IDS) {
    const s = signals.find((x) => x.id === id);
    if (s?.available) weightSum += WEIGHTS[id];
  }
  if (weightSum === 0) return [];
  const out: Contribution[] = [];
  for (const id of SIGNAL_IDS) {
    const s = signals.find((x) => x.id === id);
    if (!s?.available) continue;
    const points = roundHalfUp((100 * WEIGHTS[id] * s.unusualness) / weightSum);
    if (points > 0) out.push({ id, points });
  }
  return out.sort((a, b) => b.points - a.points);
}

/** The most a single signal can add when every signal is available (its weight share). */
export const MAX_SIGNAL_POINTS: number = roundHalfUp(100 * Math.max(...Object.values(WEIGHTS)));
