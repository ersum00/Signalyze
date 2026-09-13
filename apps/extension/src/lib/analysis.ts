/**
 * Runs one analysis: remote when the user allowed data sending, otherwise
 * (or on any remote failure) the bundled TypeScript engine. The result is
 * always stored in the local cache.
 */
import {
  AnalysisRequestSchema,
  type AnalysisRequestInput,
  type AnalysisResult,
} from '@signalyze/shared';
import { analyze } from '@signalyze/signals';
import { analyzeRemote, ApiRequestError } from './api';
import { setCachedResult, type Settings } from './storage';

export interface AnalysisDeps {
  /** Remote analysis; defaults to the API client. */
  remote?: (request: AnalysisRequestInput) => Promise<AnalysisResult>;
  /** Cache writer; defaults to chrome.storage.local. */
  store?: (placeId: string, result: AnalysisResult) => Promise<void>;
  /** Clock for the offline engine (deterministic tests). */
  now?: () => Date;
}

export interface AnalysisOutcome {
  result: AnalysisResult;
  /** Set when the remote path failed and the offline engine was used instead. */
  fallbackReason?: string;
}

export function analyzeOffline(request: AnalysisRequestInput, now?: () => Date): AnalysisResult {
  const parsed = AnalysisRequestSchema.parse(request);
  return analyze(parsed.reviews, {
    placeId: parsed.placeId,
    source: 'offline',
    now: now?.() ?? new Date(),
  });
}

function reasonOf(error: unknown): string {
  if (error instanceof ApiRequestError) return error.kind;
  if (error instanceof Error) return error.name;
  return 'unknown';
}

export async function runAnalysis(
  request: AnalysisRequestInput,
  settings: Pick<Settings, 'sendToServer'>,
  deps: AnalysisDeps = {},
): Promise<AnalysisOutcome> {
  const remote = deps.remote ?? ((body: AnalysisRequestInput) => analyzeRemote(body));
  const store = deps.store ?? setCachedResult;

  let outcome: AnalysisOutcome;
  if (settings.sendToServer) {
    try {
      outcome = { result: await remote(request) };
    } catch (error: unknown) {
      outcome = { result: analyzeOffline(request, deps.now), fallbackReason: reasonOf(error) };
    }
  } else {
    outcome = { result: analyzeOffline(request, deps.now) };
  }

  try {
    await store(request.placeId, outcome.result);
  } catch {
    // A cache write failure must never hide a computed result.
  }
  return outcome;
}
