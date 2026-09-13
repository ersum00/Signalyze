import type { AnalysisRequestInput } from '@signalyze/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, analyzeRemote, getRemoteProfile, type FetchLike } from './api';
import { PLACE, analysisResult, sampleReviews } from './test-helpers';

const REQUEST: AnalysisRequestInput = {
  placeId: PLACE.placeId,
  reviews: sampleReviews(15),
  totalReviewCount: 1240,
  overallRating: 4.4,
  locale: 'en',
  clientVersion: '0.1.0',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'resolved';
  } catch (error: unknown) {
    return error instanceof ApiRequestError ? error.kind : 'other';
  }
}

describe('analyzeRemote', () => {
  it('posts JSON to /v1/analyze and validates the result', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse(200, analysisResult({ source: 'server' })));
    const result = await analyzeRemote(REQUEST, { fetch: fetchMock, baseUrl: 'https://api.test' });
    expect(result.source).toBe('server');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/v1/analyze');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ placeId: PLACE.placeId });
  });

  it('maps HTTP statuses to error kinds', async () => {
    const cases: [number, string][] = [
      [429, 'rate_limited'],
      [400, 'invalid_request'],
      [422, 'invalid_request'],
      [500, 'unavailable'],
      [503, 'unavailable'],
    ];
    for (const [status, kind] of cases) {
      const fetchMock = vi
        .fn<FetchLike>()
        .mockResolvedValue(jsonResponse(status, { error: 'x', message: 'no' }));
      expect(await kindOf(analyzeRemote(REQUEST, { fetch: fetchMock })), String(status)).toBe(kind);
    }
  });

  it('treats a malformed body as unavailable', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse(200, { score: 'high' }));
    expect(await kindOf(analyzeRemote(REQUEST, { fetch: fetchMock }))).toBe('unavailable');
  });

  it('maps thrown fetch errors and timeouts to network', async () => {
    const failing = vi.fn<FetchLike>().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await kindOf(analyzeRemote(REQUEST, { fetch: failing }))).toBe('network');

    const hanging: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    expect(await kindOf(analyzeRemote(REQUEST, { fetch: hanging, timeoutMs: 5 }))).toBe('network');
  });
});

describe('getRemoteProfile', () => {
  it('returns null on 404 and the profile otherwise', async () => {
    const missing = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse(404, { error: 'not_found', message: '' }));
    expect(
      await getRemoteProfile('place-x', { fetch: missing, baseUrl: 'https://api.test' }),
    ).toBeNull();
    expect(missing.mock.calls[0]![0]).toBe('https://api.test/v1/place/place-x');

    const found = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse(200, analysisResult({ source: 'server-cache' })));
    const profile = await getRemoteProfile(PLACE.placeId, { fetch: found });
    expect(profile?.source).toBe('server-cache');
  });
});
