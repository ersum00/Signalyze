/**
 * Regenerates packages/signals/fixtures/*.json from the synthetic datasets.
 * Run after ANY change to a signal, threshold, dictionary or weight:
 *   pnpm --filter @signalyze/signals fixtures:generate
 * The Python port's test suite replays these fixtures and must match to 1e-9.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../src/index';
import { DATASETS, type DatasetName } from '../src/testing/synthetic';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(here, '..', 'fixtures');
mkdirSync(outDir, { recursive: true });

const NOW = '2026-06-01T00:00:00.000Z';
const CASES: { name: DatasetName; count: number; seed: number }[] = [
  { name: 'normal', count: 150, seed: 101 },
  { name: 'burst', count: 150, seed: 102 },
  { name: 'polarized', count: 150, seed: 103 },
  { name: 'template', count: 150, seed: 104 },
  { name: 'small', count: 10, seed: 105 },
  { name: 'sparse', count: 60, seed: 106 },
  { name: 'turkish', count: 60, seed: 107 },
  { name: 'multilingual', count: 95, seed: 108 },
];

for (const c of CASES) {
  const reviews = DATASETS[c.name]({ count: c.count, seed: c.seed });
  const placeId = `0xfixture:0x${c.name}`;
  const expected = analyze(reviews, { placeId, source: 'server', now: new Date(NOW) });
  const fixture = { name: c.name, seed: c.seed, now: NOW, placeId, reviews, expected };
  writeFileSync(join(outDir, `${c.name}.json`), JSON.stringify(fixture, null, 2) + '\n');
  console.log(`${c.name}: ${reviews.length} reviews, score ${String(expected.score)}`);
}
