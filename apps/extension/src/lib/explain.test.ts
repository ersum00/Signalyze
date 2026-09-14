import { SIGNAL_IDS, SUPPORTED_LOCALES, type SignalResult } from '@signalyze/shared';
import { analyze } from '@signalyze/signals';
import { describe, expect, it } from 'vitest';
import {
  baselineParams,
  explainSignal,
  signalBaseline,
  signalLookAt,
  signalName,
  signalPlain,
  signalShort,
  signalWhy,
} from './explain';
import { sampleReviews, signalResult } from './test-helpers';

const LEFTOVER = /\{\w+\}/;

/** Full-detail results mirroring the engine's `details` keys for each signal. */
const AVAILABLE: SignalResult[] = [
  signalResult({
    id: 'burst_ratio',
    value: 0.62,
    details: {
      peakShare: 0.62,
      peakCount: 124,
      peakWindowStart: '2026-03-12',
      peakWindowEnd: '2026-03-25',
      lifespanDays: 900,
      expectedShare: 0.015,
      excess: 0.61,
      windowDays: 14,
    },
  }),
  signalResult({
    id: 'rating_polarity',
    value: 0.84,
    details: { share5: 0.64, share1: 0.2, shareMid: 0.16 },
  }),
  signalResult({
    id: 'single_review_accounts',
    value: 0.71,
    details: { share: 0.71, known: 180, singles: 128 },
  }),
  signalResult({
    id: 'no_photo_short_text',
    value: 0.44,
    details: { share: 0.44, count: 88, noTextCount: 40, shortTextChars: 40 },
  }),
  signalResult({
    id: 'text_similarity',
    value: 0.31,
    details: {
      meanJaccard: 0.31,
      highPairShare: 0.05,
      highPairs: 995,
      pairs: 19900,
      maxPair: 0.9,
      eligible: 200,
    },
  }),
  signalResult({
    id: 'template_phrases',
    value: 0.18,
    details: {
      share: 0.18,
      phraseBased: 36,
      withText: 200,
      anyPhraseShare: 0.4,
      topPhrases: 'highly recommend (20); great service (12); friendly staff (9)',
    },
  }),
  signalResult({
    id: 'rating_text_mismatch',
    value: 0.09,
    details: { share: 0.09, scored: 150, mismatches: 14 },
  }),
  signalResult({
    id: 'date_entropy',
    value: 0.53,
    details: {
      normalizedEntropy: 0.53,
      monthsInSpan: 30,
      activeMonths: 22,
      busiestMonth: '2026-03',
      busiestMonthShare: 0.4,
    },
  }),
  signalResult({
    id: 'local_guide_ratio',
    value: 0.18,
    details: { share: 0.18, established: 36, exposed: 120, establishedLevel: 3 },
  }),
  signalResult({
    id: 'owner_response_pattern',
    value: 0.35,
    details: {
      identicalShare: 0.35,
      responded: 120,
      responseRate: 0.6,
      distinctResponses: 78,
      largestGroupShare: 0.2,
    },
  }),
];

const UNAVAILABLE: SignalResult[] = [
  signalResult({ id: 'burst_ratio', available: false }),
  signalResult({ id: 'rating_polarity', available: false }),
  signalResult({
    id: 'single_review_accounts',
    available: false,
    details: { known: 4, minKnown: 15 },
  }),
  signalResult({ id: 'no_photo_short_text', available: false }),
  signalResult({
    id: 'text_similarity',
    available: false,
    details: { eligible: 3, minEligible: 10 },
  }),
  signalResult({
    id: 'template_phrases',
    available: false,
    details: { withText: 2, minWithText: 10 },
  }),
  signalResult({
    id: 'rating_text_mismatch',
    available: false,
    details: { scored: 1, minScored: 10 },
  }),
  signalResult({
    id: 'date_entropy',
    available: false,
    details: { monthsInSpan: 2, minMonths: 3 },
  }),
  signalResult({ id: 'local_guide_ratio', available: false, details: { levelExposed: false } }),
  signalResult({
    id: 'owner_response_pattern',
    available: false,
    details: { responded: 2, responseRate: 0.1, minResponded: 5 },
  }),
];

describe('explainSignal', () => {
  it('covers every signal id', () => {
    expect(AVAILABLE.map((s) => s.id)).toEqual([...SIGNAL_IDS]);
    expect(UNAVAILABLE.map((s) => s.id)).toEqual([...SIGNAL_IDS]);
  });

  it('renders every available signal in every locale without leftover placeholders', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const signal of AVAILABLE) {
        const text = explainSignal(signal, locale);
        expect(text, `${locale}:${signal.id}`).not.toMatch(LEFTOVER);
        expect(text.length).toBeGreaterThan(10);
      }
    }
  });

  it('renders every unavailable reason in every locale without leftover placeholders', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const signal of UNAVAILABLE) {
        const text = explainSignal(signal, locale);
        expect(text, `${locale}:${signal.id}`).not.toMatch(LEFTOVER);
      }
    }
  });

  it('falls back gracefully when details are missing entirely', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const id of SIGNAL_IDS) {
        const text = explainSignal(signalResult({ id, value: 0.4, details: {} }), locale);
        expect(text, `${locale}:${id}`).not.toMatch(LEFTOVER);
      }
    }
  });

  it('formats the burst window with localized dates and the percentage from the details', () => {
    const text = explainSignal(AVAILABLE[0]!, 'en');
    expect(text).toContain('62%');
    expect(text).toContain('14-day');
    expect(text).toMatch(/Mar 12, 2026/);
    expect(text).toMatch(/Mar 25, 2026/);
    expect(explainSignal(AVAILABLE[0]!, 'tr')).toContain('%62');
  });

  it('works on real engine output', () => {
    const result = analyze(sampleReviews(20), {
      placeId: 'place-test',
      source: 'offline',
      now: new Date('2026-09-12T00:00:00Z'),
    });
    expect(result.signals).toHaveLength(SIGNAL_IDS.length);
    for (const locale of SUPPORTED_LOCALES) {
      for (const signal of result.signals) {
        expect(explainSignal(signal, locale), `${locale}:${signal.id}`).not.toMatch(LEFTOVER);
      }
    }
  });
});

describe('signal copy', () => {
  it('has a name, a short description and a rationale for every signal in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const id of SIGNAL_IDS) {
        expect(signalName(id, locale).length).toBeGreaterThan(0);
        expect(signalShort(id, locale).length).toBeGreaterThan(0);
        expect(signalWhy(id, locale).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('plain language', () => {
  it('renders plain, baseline and look-at sentences without leftovers in every locale', () => {
    for (const signal of AVAILABLE) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(signalPlain(signal, locale), `${locale}:${signal.id}`).not.toMatch(LEFTOVER);
        expect(signalBaseline(signal.id, locale), `${locale}:${signal.id}`).not.toMatch(LEFTOVER);
        expect(signalLookAt(signal.id, locale).length, `${locale}:${signal.id}`).toBeGreaterThan(
          10,
        );
      }
    }
  });

  it('quotes the thresholds file, not hard-coded numbers', () => {
    expect(baselineParams('burst_ratio')).toEqual({ low: 5, high: 65 });
    expect(baselineParams('single_review_accounts')).toEqual({ low: 30, high: 75 });
    expect(baselineParams('text_similarity')).toEqual({
      meanLow: 18,
      meanHigh: 45,
      pairLow: 2,
      pairHigh: 15,
    });
    expect(baselineParams('date_entropy')).toEqual({ typicalAbove: 75, extremeBelow: 35 });
    expect(baselineParams('local_guide_ratio')).toEqual({ typicalAtLeast: 20 });
  });

  it('explains the burst window against an even spread', () => {
    const burst = AVAILABLE.find((s) => s.id === 'burst_ratio')!;
    const text = signalPlain(burst, 'en');
    expect(text).toContain('62%');
    expect(text).toContain('124');
    expect(text).toContain('2.5 years');
    expect(text).toContain('1.5%');
  });

  it('mentions sampling only when it happened', () => {
    const sampled = signalResult({
      id: 'text_similarity',
      value: 0.2,
      details: {
        meanJaccard: 0.2,
        highPairShare: 0.01,
        highPairs: 2,
        pairs: 179700,
        maxPair: 0.7,
        eligible: 812,
        sampled: 600,
      },
    });
    expect(signalPlain(sampled, 'en')).toContain('600 of 812');
    const full = signalResult({
      id: 'text_similarity',
      value: 0.2,
      details: {
        meanJaccard: 0.2,
        highPairShare: 0.01,
        highPairs: 2,
        pairs: 190,
        maxPair: 0.7,
        eligible: 20,
        sampled: 20,
      },
    });
    expect(signalPlain(full, 'en')).not.toContain('20 of 20');
  });
});
