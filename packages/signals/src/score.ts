import type { SignalId, SignalResult } from '@signalyze/shared';
import { SIGNAL_IDS } from '@signalyze/shared';
import weightsFile from './weights.json';
import { roundHalfUp } from './math';

export const WEIGHTS: Record<SignalId, number> = weightsFile.weights;
export const WEIGHTS_VERSION: string = weightsFile.version;

/**
 * 0-100 weighted mean of unusualness over available signals. Weights are
 * renormalised over the available subset so a missing signal never moves the
 * score. Returns null when no signal is available.
 */
export function computeScore(signals: readonly SignalResult[]): number | null {
  let weightSum = 0;
  let weighted = 0;
  for (const id of SIGNAL_IDS) {
    const s = signals.find((x) => x.id === id);
    if (!s?.available) continue;
    const w = WEIGHTS[id];
    weightSum += w;
    weighted += w * s.unusualness;
  }
  if (weightSum === 0) return null;
  return roundHalfUp((100 * weighted) / weightSum);
}
