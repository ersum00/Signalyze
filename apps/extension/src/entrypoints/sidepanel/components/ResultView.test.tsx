/**
 * The score card must read plainly: a band sentence, the scale line, the
 * contributing signals, and for a period the period label and its source
 * note. Rendered with the real i18n provider in English.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n/react';
import { PLACE, analysisResult, signalResult } from '@/lib/test-helpers';
import { ResultView } from './ResultView';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** jsdom has no ResizeObserver; the charts only use it to follow their container width. */
class ResizeObserverStub {
  observe(): void {
    // A fixed jsdom box never resizes.
  }
  unobserve(): void {
    // See observe.
  }
  disconnect(): void {
    // See observe.
  }
}
(globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;

const SIGNALS = [
  signalResult({
    id: 'burst_ratio',
    unusualness: 0.27,
    value: 0.21,
    details: {
      peakShare: 0.21,
      peakCount: 105,
      peakWindowStart: '2021-09-14',
      peakWindowEnd: '2021-09-27',
      lifespanDays: 1900,
      expectedShare: 0.007,
      excess: 0.2,
      windowDays: 14,
    },
  }),
  signalResult({ id: 'rating_polarity', unusualness: 0, value: 0.79 }),
  signalResult({ id: 'single_review_accounts', unusualness: 0.1, value: 0.34 }),
  signalResult({ id: 'text_similarity', unusualness: 0, value: 0.05 }),
];

function noop(): void {
  // Static render.
}

describe('ResultView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('reads the score plainly and lists the contributing signals', async () => {
    await act(async () => {
      root.render(
        <I18nProvider locale="en">
          <ResultView
            context={PLACE}
            result={analysisResult({ score: 14, reviewCount: 500, signals: SIGNALS })}
            fallbackReason={null}
            collectStatus="complete"
            scope={{ limit: 500, window: 'all' }}
            sortedByNewest={false}
            loaded={500}
            onAnalyze={noop}
          />
        </I18nProvider>,
      );
      await Promise.resolve();
    });
    const text = container.textContent ?? '';
    expect(text).toContain('The measured patterns look like typical businesses.');
    expect(text).toContain('One signal can add at most 16 points.');
    expect(text).toContain('What makes up the score');
    expect(text).toContain('Burst ratio +');
    expect(text).toContain('Distance from typical: 27%');
    expect(text).toContain('500 of 1,240 reviews analysed');
    expect(text).not.toContain('Load more');
  });

  it('labels a period, its source and the sort fallback', async () => {
    await act(async () => {
      root.render(
        <I18nProvider locale="en">
          <ResultView
            context={PLACE}
            result={analysisResult({ score: 31, reviewCount: 120, signals: SIGNALS })}
            fallbackReason={null}
            collectStatus="complete"
            scope={{ limit: 'all', window: 'last3m' }}
            sortedByNewest={false}
            loaded={643}
            onAnalyze={noop}
          />
        </I18nProvider>,
      );
      await Promise.resolve();
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Last 3 months: 120 reviews (643 loaded)');
    expect(text).toContain('computed in your browser for this period');
    expect(text).toContain("Google's Newest order could not be selected");
    expect(text).toContain('Some measurements differ from typical businesses');
  });

  it('names the period when there are too few reviews in it', async () => {
    await act(async () => {
      root.render(
        <I18nProvider locale="en">
          <ResultView
            context={PLACE}
            result={analysisResult({ score: null, status: 'insufficient_data', reviewCount: 4 })}
            fallbackReason={null}
            collectStatus="complete"
            scope={{ limit: 200, window: 'thisMonth' }}
            sortedByNewest
            loaded={200}
            onAnalyze={noop}
          />
        </I18nProvider>,
      );
      await Promise.resolve();
    });
    expect(container.textContent).toContain(
      'This month: 4 reviews found; a score needs at least 15.',
    );
  });
});
