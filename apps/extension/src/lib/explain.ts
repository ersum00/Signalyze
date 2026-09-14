/**
 * Turns a SignalResult into the localized, factual sentences shown in the
 * side panel: the compact `explain` line, the plain-language sentence, the
 * baseline sentence (typical range and extreme threshold, read from the
 * engine's thresholds file so wording can never drift from the maths) and
 * the "what to look at" hint. Parameters are taken from the engine's
 * `details` keys; every parameter has a fallback so a result from another
 * engine version still renders without leftover placeholders.
 */
import {
  BURST_WINDOW_DAYS,
  LOCAL_GUIDE_ESTABLISHED_LEVEL,
  SHORT_TEXT_CHARS,
  type Locale,
  type SignalDetailValue,
  type SignalId,
  type SignalResult,
} from '@signalyze/shared';
import { THRESHOLDS } from '@signalyze/signals';
import { translate, type MessageParams } from '@/i18n';
import { formatDay, formatMonth, formatNumber, percent } from './format';

type Details = Record<string, SignalDetailValue>;

function num(details: Details, key: string, fallback: number): number {
  const value = details[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(details: Details, key: string, fallback: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : fallback;
}

/** Parameters for `signal.<id>.explain` and `signal.<id>.unavailable`. */
export function explanationParams(signal: SignalResult, locale: Locale): MessageParams {
  const d = signal.details;
  const valuePercent = percent(signal.value);
  switch (signal.id) {
    case 'burst_ratio':
      return {
        peakPercent: percent(num(d, 'peakShare', signal.value)),
        peakCount: num(d, 'peakCount', 0),
        windowDays: num(d, 'windowDays', BURST_WINDOW_DAYS),
        start: formatDay(str(d, 'peakWindowStart', ''), locale),
        end: formatDay(str(d, 'peakWindowEnd', ''), locale),
      };
    case 'rating_polarity':
      return {
        percent: valuePercent,
        share5: percent(num(d, 'share5', 0)),
        share1: percent(num(d, 'share1', 0)),
      };
    case 'single_review_accounts':
      return {
        percent: valuePercent,
        singles: num(d, 'singles', 0),
        known: num(d, 'known', 0),
        minKnown: num(d, 'minKnown', 15),
      };
    case 'no_photo_short_text':
      return {
        percent: valuePercent,
        count: num(d, 'count', 0),
        chars: num(d, 'shortTextChars', SHORT_TEXT_CHARS),
      };
    case 'text_similarity':
      return {
        mean: formatNumber(num(d, 'meanJaccard', signal.value), locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        pairPercent: percent(num(d, 'highPairShare', 0)),
        highPairs: num(d, 'highPairs', 0),
        pairs: num(d, 'pairs', 0),
        eligible: num(d, 'eligible', 0),
        minEligible: num(d, 'minEligible', 10),
      };
    case 'template_phrases': {
      const top = str(d, 'topPhrases', '');
      return {
        percent: valuePercent,
        phraseBased: num(d, 'phraseBased', 0),
        withText: num(d, 'withText', 0),
        minWithText: num(d, 'minWithText', 10),
        top: top === '' ? translate(locale, 'signals.none') : top,
      };
    }
    case 'rating_text_mismatch':
      return {
        percent: valuePercent,
        mismatches: num(d, 'mismatches', 0),
        scored: num(d, 'scored', 0),
        minScored: num(d, 'minScored', 10),
      };
    case 'date_entropy':
      return {
        percent: percent(num(d, 'normalizedEntropy', signal.value)),
        months: num(d, 'monthsInSpan', 0),
        busiest: formatMonth(str(d, 'busiestMonth', ''), locale),
        busiestPercent: percent(num(d, 'busiestMonthShare', 0)),
        minMonths: num(d, 'minMonths', 3),
      };
    case 'local_guide_ratio':
      return {
        percent: valuePercent,
        level: num(d, 'establishedLevel', LOCAL_GUIDE_ESTABLISHED_LEVEL),
        established: num(d, 'established', 0),
        exposed: num(d, 'exposed', 0),
      };
    case 'owner_response_pattern':
      return {
        percent: valuePercent,
        responded: num(d, 'responded', 0),
        distinct: num(d, 'distinctResponses', 0),
        minResponded: num(d, 'minResponded', 5),
      };
  }
}

/** The explanation sentence, or the reason the signal could not be computed. */
export function explainSignal(signal: SignalResult, locale: Locale): string {
  const key = signal.available
    ? (`signal.${signal.id}.explain` as const)
    : (`signal.${signal.id}.unavailable` as const);
  return translate(locale, key, explanationParams(signal, locale));
}

export function signalName(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.name`);
}

export function signalShort(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.short`);
}

export function signalWhy(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.why`);
}

const T = THRESHOLDS;

/**
 * Whole-percent calibration points for `signal.<id>.baseline`. Signals whose
 * low direction is the unusual one (date entropy, Local Guide share) are
 * expressed as "typical above / extreme below".
 */
export function baselineParams(id: SignalId): MessageParams {
  switch (id) {
    case 'burst_ratio':
      return { low: percent(T.burst_ratio.excessLow), high: percent(T.burst_ratio.excessHigh) };
    case 'rating_polarity':
      return { low: percent(T.rating_polarity.low), high: percent(T.rating_polarity.high) };
    case 'single_review_accounts':
      return {
        low: percent(T.single_review_accounts.low),
        high: percent(T.single_review_accounts.high),
      };
    case 'no_photo_short_text':
      return {
        low: percent(T.no_photo_short_text.low),
        high: percent(T.no_photo_short_text.high),
      };
    case 'text_similarity':
      return {
        meanLow: percent(T.text_similarity.meanLow),
        meanHigh: percent(T.text_similarity.meanHigh),
        pairLow: percent(T.text_similarity.pairShareLow),
        pairHigh: percent(T.text_similarity.pairShareHigh),
      };
    case 'template_phrases':
      return { low: percent(T.template_phrases.low), high: percent(T.template_phrases.high) };
    case 'rating_text_mismatch':
      return {
        low: percent(T.rating_text_mismatch.low),
        high: percent(T.rating_text_mismatch.high),
      };
    case 'date_entropy':
      return {
        typicalAbove: percent(1 - T.date_entropy.low),
        extremeBelow: percent(1 - T.date_entropy.high),
      };
    case 'local_guide_ratio':
      return { typicalAtLeast: percent(T.local_guide_ratio.shareHigh) };
    case 'owner_response_pattern':
      return {
        low: percent(T.owner_response_pattern.low),
        high: percent(T.owner_response_pattern.high),
      };
  }
}

/** Extra parameters the plain sentence uses on top of `explanationParams`. */
function plainParams(signal: SignalResult, locale: Locale): MessageParams {
  const d = signal.details;
  const base = explanationParams(signal, locale);
  switch (signal.id) {
    case 'burst_ratio': {
      const lifespanDays = num(d, 'lifespanDays', 0);
      const expectedShare = num(d, 'expectedShare', 0);
      return {
        ...base,
        years: formatNumber(lifespanDays / 365.25, locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        expectedPercent: formatNumber(expectedShare * 100, locale, { maximumFractionDigits: 1 }),
        excessPercent: percent(num(d, 'excess', 0)),
      };
    }
    case 'rating_polarity':
      return { ...base, middle: percent(1 - signal.value) };
    case 'text_similarity':
      return {
        ...base,
        meanPercent: percent(num(d, 'meanJaccard', signal.value)),
        sampled: num(d, 'sampled', num(d, 'eligible', 0)),
      };
    default:
      return base;
  }
}

/**
 * The plain-language sentence for an available signal (the reason it could
 * not be computed otherwise). Text similarity adds a note when the engine
 * compared a sample of the texts.
 */
export function signalPlain(signal: SignalResult, locale: Locale): string {
  if (!signal.available) return explainSignal(signal, locale);
  const params = plainParams(signal, locale);
  let text = translate(locale, `signal.${signal.id}.plain`, params);
  if (signal.id === 'text_similarity') {
    const sampled = num(signal.details, 'sampled', 0);
    const eligible = num(signal.details, 'eligible', 0);
    if (sampled > 0 && sampled < eligible) {
      text += ` ${translate(locale, 'signal.text_similarity.sampledNote', params)}`;
    }
  }
  return text;
}

/** Typical range and extreme threshold of a signal, in whole percents. */
export function signalBaseline(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.baseline`, baselineParams(id));
}

/** What a reader can check on the page for this signal. */
export function signalLookAt(id: SignalId, locale: Locale): string {
  return translate(locale, `signal.${id}.lookAt`);
}
