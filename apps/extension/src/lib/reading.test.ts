import { describe, expect, it } from 'vitest';
import { MAX_SIGNAL_POINTS, contributions, scoreBand } from './reading';
import { signalResult } from './test-helpers';

describe('scoreBand', () => {
  it('maps the four bands', () => {
    expect(scoreBand(0)).toBe('typical');
    expect(scoreBand(19)).toBe('typical');
    expect(scoreBand(20)).toBe('some');
    expect(scoreBand(39)).toBe('some');
    expect(scoreBand(40)).toBe('many');
    expect(scoreBand(59)).toBe('many');
    expect(scoreBand(60)).toBe('most');
    expect(scoreBand(100)).toBe('most');
  });
});

describe('contributions', () => {
  it('splits the score by weight share and drops zero and unavailable signals', () => {
    const signals = [
      signalResult({ id: 'burst_ratio', unusualness: 0.5 }),
      signalResult({ id: 'text_similarity', unusualness: 0 }),
      signalResult({ id: 'rating_polarity', unusualness: 1, available: false }),
    ];
    // Available weights: burst 0.16 + text 0.16 = 0.32; burst adds round(100 * 0.16 * 0.5 / 0.32) = 25.
    expect(contributions(signals)).toEqual([{ id: 'burst_ratio', points: 25 }]);
  });

  it('orders contributors by points, largest first', () => {
    const signals = [
      signalResult({ id: 'rating_polarity', unusualness: 0.5 }), // weight 0.08
      signalResult({ id: 'single_review_accounts', unusualness: 0.5 }), // weight 0.14
      signalResult({ id: 'local_guide_ratio', unusualness: 1 }), // weight 0.06
    ];
    expect(contributions(signals).map((c) => c.id)).toEqual([
      'single_review_accounts',
      'local_guide_ratio',
      'rating_polarity',
    ]);
  });

  it('adds up to the score within rounding', () => {
    const signals = [
      signalResult({ id: 'burst_ratio', unusualness: 0.27 }),
      signalResult({ id: 'rating_polarity', unusualness: 0 }),
      signalResult({ id: 'single_review_accounts', unusualness: 0.4 }),
      signalResult({ id: 'text_similarity', unusualness: 0.1 }),
    ];
    const total = contributions(signals).reduce((sum, c) => sum + c.points, 0);
    // score = 100 * (0.16*0.27 + 0.14*0.4 + 0.16*0.1) / 0.54 = 21.4 -> contributors 8 + 10 + 3 = 21
    expect(Math.abs(total - 21)).toBeLessThanOrEqual(1);
  });

  it('exposes the largest single-signal share', () => {
    expect(MAX_SIGNAL_POINTS).toBe(16);
  });
});
