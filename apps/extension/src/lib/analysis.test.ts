import type { AnalysisRequestInput } from '@signalyze/shared';
import { describe, expect, it, vi } from 'vitest';
import { runAnalysis } from './analysis';
import { ApiRequestError } from './api';
import { PLACE, analysisResult, sampleReviews } from './test-helpers';

const REQUEST: AnalysisRequestInput = {
  placeId: PLACE.placeId,
  reviews: sampleReviews(20),
  totalReviewCount: 1240,
  overallRating: 4.4,
  locale: 'en',
  clientVersion: '0.1.0',
};

const NOW = () => new Date('2026-09-12T10:00:00Z');

describe('runAnalysis', () => {
  it('runs offline without touching the server when sending is off', async () => {
    const remote = vi.fn().mockResolvedValue(analysisResult({ source: 'server' }));
    const store = vi.fn().mockResolvedValue(undefined);
    const outcome = await runAnalysis(
      REQUEST,
      { sendToServer: false },
      { remote, store, now: NOW },
    );
    expect(remote).not.toHaveBeenCalled();
    expect(outcome.result.source).toBe('offline');
    expect(outcome.result.placeId).toBe(PLACE.placeId);
    expect(outcome.result.status).toBe('ok');
    expect(outcome.result.score).not.toBeNull();
    expect(outcome.fallbackReason).toBeUndefined();
    expect(store).toHaveBeenCalledWith(PLACE.placeId, outcome.result);
  });

  it('uses the server result when sending is on and the call succeeds', async () => {
    const remote = vi.fn().mockResolvedValue(analysisResult({ source: 'server', score: 33 }));
    const store = vi.fn().mockResolvedValue(undefined);
    const outcome = await runAnalysis(REQUEST, { sendToServer: true }, { remote, store, now: NOW });
    expect(remote).toHaveBeenCalledWith(REQUEST);
    expect(outcome.result.source).toBe('server');
    expect(outcome.result.score).toBe(33);
    expect(store).toHaveBeenCalledTimes(1);
  });

  it('falls back to the offline engine on any remote failure', async () => {
    const remote = vi.fn().mockRejectedValue(new ApiRequestError('rate_limited', 'slow down', 429));
    const store = vi.fn().mockResolvedValue(undefined);
    const outcome = await runAnalysis(REQUEST, { sendToServer: true }, { remote, store, now: NOW });
    expect(outcome.result.source).toBe('offline');
    expect(outcome.fallbackReason).toBe('rate_limited');

    const crashing = vi.fn().mockRejectedValue(new Error('boom'));
    const second = await runAnalysis(
      REQUEST,
      { sendToServer: true },
      { remote: crashing, store, now: NOW },
    );
    expect(second.result.source).toBe('offline');
    expect(second.fallbackReason).toBe('Error');
  });

  it('still returns the result when the cache write fails', async () => {
    const store = vi.fn().mockRejectedValue(new Error('quota'));
    const outcome = await runAnalysis(REQUEST, { sendToServer: false }, { store, now: NOW });
    expect(outcome.result.source).toBe('offline');
  });

  it('reports insufficient data below the minimum review count', async () => {
    const small: AnalysisRequestInput = { ...REQUEST, reviews: sampleReviews(5) };
    const store = vi.fn().mockResolvedValue(undefined);
    const outcome = await runAnalysis(small, { sendToServer: false }, { store, now: NOW });
    expect(outcome.result.status).toBe('insufficient_data');
    expect(outcome.result.score).toBeNull();
  });
});
