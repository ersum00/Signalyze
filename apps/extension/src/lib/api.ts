/**
 * Client for the Signalyze API. Every failure is mapped to a typed
 * ApiRequestError so the caller can decide to fall back to the offline
 * engine without inspecting HTTP details.
 */
import {
  AnalysisResultSchema,
  API_BASE_URL,
  ApiErrorSchema,
  type AnalysisRequestInput,
  type AnalysisResult,
} from '@signalyze/shared';

export type ApiErrorKind = 'rate_limited' | 'invalid_request' | 'unavailable' | 'network';

export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.kind = kind;
    this.status = status;
  }
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface ApiOptions {
  baseUrl?: string;
  /** Injected for tests; defaults to the global fetch. */
  fetch?: FetchLike;
  timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 20_000;

function kindForStatus(status: number): ApiErrorKind {
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 413 || status === 415 || status === 422) {
    return 'invalid_request';
  }
  return 'unavailable';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

async function errorFromResponse(response: Response): Promise<ApiRequestError> {
  const body = ApiErrorSchema.safeParse(await readJson(response));
  const message = body.success ? body.data.message : `HTTP ${response.status}`;
  return new ApiRequestError(kindForStatus(response.status), message, response.status);
}

async function request(path: string, init: RequestInit, options: ApiOptions): Promise<Response> {
  const fetchImpl: FetchLike = options.fetch ?? ((input, requestInit) => fetch(input, requestInit));
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetchImpl(`${options.baseUrl ?? API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'network error';
    throw new ApiRequestError('network', message);
  } finally {
    clearTimeout(timer);
  }
}

async function parseResult(response: Response): Promise<AnalysisResult> {
  const parsed = AnalysisResultSchema.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new ApiRequestError('unavailable', 'unexpected response shape', response.status);
  }
  return parsed.data;
}

/** POST /v1/analyze. Resolves with a validated AnalysisResult or throws ApiRequestError. */
export async function analyzeRemote(
  requestBody: AnalysisRequestInput,
  options: ApiOptions = {},
): Promise<AnalysisResult> {
  const response = await request(
    '/v1/analyze',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(requestBody),
    },
    options,
  );
  if (!response.ok) throw await errorFromResponse(response);
  return parseResult(response);
}

/** GET /v1/place/{placeId}. Resolves with null when the server has no profile (404). */
export async function getRemoteProfile(
  placeId: string,
  options: ApiOptions = {},
): Promise<AnalysisResult | null> {
  const response = await request(
    `/v1/place/${encodeURIComponent(placeId)}`,
    { method: 'GET', headers: { accept: 'application/json' } },
    options,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw await errorFromResponse(response);
  return parseResult(response);
}
