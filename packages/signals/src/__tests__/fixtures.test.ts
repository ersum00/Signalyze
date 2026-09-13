import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { AnalysisResult, Review } from '@signalyze/shared';
import { analyze } from '../index';

interface Fixture {
  name: string;
  now: string;
  placeId: string;
  reviews: Review[];
  expected: AnalysisResult;
}

const dir = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'fixtures');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('fixtures', () => {
  it('exist for every synthetic dataset', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  for (const file of files) {
    it(`${file} replays exactly`, () => {
      const fixture = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Fixture;
      const result = analyze(fixture.reviews, {
        placeId: fixture.placeId,
        source: 'server',
        now: new Date(fixture.now),
      });
      expect(result).toEqual(fixture.expected);
    });
  }
});
