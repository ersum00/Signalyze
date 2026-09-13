import { describe, expect, it } from 'vitest';
import { AnalysisResultSchema } from '@signalyze/shared';
import { analyze, ENGINE_VERSION } from '../index';

describe('analyze (skeleton)', () => {
  it('returns a schema-valid result for an empty input', () => {
    const result = analyze([], { placeId: 'ChIJtest', source: 'offline', now: new Date(0) });
    expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
    expect(result.status).toBe('insufficient_data');
    expect(result.engineVersion).toBe(ENGINE_VERSION);
  });
});
