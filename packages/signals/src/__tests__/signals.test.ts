import { describe, expect, it } from 'vitest';
import type { Review, SignalId } from '@signalyze/shared';
import { AnalysisResultSchema, MIN_REVIEWS_FOR_SCORE, SIGNAL_IDS } from '@signalyze/shared';
import { analyze, computeSignals } from '../index';
import { DATASETS, normalDataset, rng, randomHash } from '../testing/synthetic';

const NOW = new Date('2026-06-01T00:00:00Z');

function signal(reviews: Review[], id: SignalId) {
  const s = computeSignals(reviews).find((x) => x.id === id);
  if (!s) throw new Error(`missing signal ${id}`);
  return s;
}

describe('analyze', () => {
  it('produces a schema-valid result with every signal for a normal dataset', () => {
    const result = analyze(normalDataset({ count: 120, seed: 1 }), {
      placeId: '0x1:0x2',
      source: 'offline',
      now: NOW,
    });
    expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
    expect(result.status).toBe('ok');
    expect(result.signals.map((s) => s.id)).toEqual([...SIGNAL_IDS]);
    expect(result.score).not.toBeNull();
    expect(result.computedAt).toBe(NOW.toISOString());
    expect(result.monthly.length).toBeGreaterThan(24);
    expect(result.monthly.reduce((a, m) => a + m.count, 0)).toBe(120);
  });

  it('returns no score and no signals below the minimum review count', () => {
    const result = analyze(DATASETS.small({ count: 10, seed: 3 }), {
      placeId: '0x1:0x2',
      source: 'server',
      now: NOW,
    });
    expect(result.status).toBe('insufficient_data');
    expect(result.score).toBeNull();
    expect(result.signals).toEqual([]);
    expect(result.reviewCount).toBeLessThan(MIN_REVIEWS_FOR_SCORE);
    expect(Object.values(result.ratingDistribution).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('is deterministic for the same input', () => {
    const reviews = normalDataset({ count: 80, seed: 9 });
    const a = analyze(reviews, { placeId: 'p', source: 'offline', now: NOW });
    const b = analyze([...reviews], { placeId: 'p', source: 'offline', now: NOW });
    expect(a).toEqual(b);
  });

  it('is independent of review order', () => {
    const reviews = normalDataset({ count: 80, seed: 11 });
    const shuffled = [...reviews].reverse();
    const a = analyze(reviews, { placeId: 'p', source: 'offline', now: NOW });
    const b = analyze(shuffled, { placeId: 'p', source: 'offline', now: NOW });
    expect(a.score).toBe(b.score);
    expect(a.signals.map((s) => s.unusualness)).toEqual(b.signals.map((s) => s.unusualness));
  });

  it('scores the normal dataset low and the unusual datasets higher', () => {
    const score = (reviews: Review[]) =>
      analyze(reviews, { placeId: 'p', source: 'offline', now: NOW }).score ?? -1;
    const normal = score(normalDataset({ count: 150, seed: 5 }));
    const burst = score(DATASETS.burst({ count: 150, seed: 5 }));
    const template = score(DATASETS.template({ count: 150, seed: 5 }));
    const polarized = score(DATASETS.polarized({ count: 150, seed: 5 }));
    expect(normal).toBeLessThan(20);
    expect(burst).toBeGreaterThan(normal + 12);
    expect(template).toBeGreaterThan(normal + 30);
    expect(polarized).toBeGreaterThan(normal);
  });

  it('marks optional-field signals unavailable on a ratings-only dataset and still scores', () => {
    const result = analyze(DATASETS.sparse({ count: 60, seed: 2 }), {
      placeId: 'p',
      source: 'offline',
      now: NOW,
    });
    const byId = new Map(result.signals.map((s) => [s.id, s]));
    expect(byId.get('single_review_accounts')?.available).toBe(false);
    expect(byId.get('text_similarity')?.available).toBe(false);
    expect(byId.get('template_phrases')?.available).toBe(false);
    expect(byId.get('rating_text_mismatch')?.available).toBe(false);
    expect(byId.get('local_guide_ratio')?.available).toBe(false);
    expect(byId.get('owner_response_pattern')?.available).toBe(false);
    expect(byId.get('burst_ratio')?.available).toBe(true);
    expect(byId.get('no_photo_short_text')?.available).toBe(true);
    expect(byId.get('no_photo_short_text')?.value).toBe(1);
    expect(result.score).not.toBeNull();
    expect(result.reviewerProfile.singleReviewShare).toBeNull();
    expect(result.reviewerProfile.localGuideShare).toBeNull();
  });
});

describe('burst_ratio', () => {
  it('is near zero for an even flow and high for a burst', () => {
    expect(signal(normalDataset({ count: 200, seed: 7 }), 'burst_ratio').unusualness).toBeLessThan(
      0.2,
    );
    const burst = signal(DATASETS.burst({ count: 200, seed: 7 }), 'burst_ratio');
    expect(burst.value).toBeGreaterThanOrEqual(0.6);
    expect(burst.unusualness).toBeGreaterThan(0.8);
    expect(burst.details.peakWindowStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('reports zero excess when the whole lifespan fits in the window', () => {
    const r = rng(1);
    const reviews: Review[] = Array.from({ length: 20 }, (_, i) => ({
      reviewerHash: randomHash(r),
      rating: 5,
      date: `2026-05-${String(1 + (i % 10)).padStart(2, '0')}`,
      text: '',
      reviewerReviewCount: null,
      photoCount: 0,
      localGuideLevel: null,
      ownerResponse: null,
      language: null,
    }));
    const s = signal(reviews, 'burst_ratio');
    expect(s.value).toBe(1);
    expect(s.unusualness).toBe(0);
    expect(s.details.expectedShare).toBe(1);
  });
});

describe('rating_polarity', () => {
  it('is high for a 5/1 heavy distribution', () => {
    expect(
      signal(DATASETS.polarized({ count: 200, seed: 4 }), 'rating_polarity').unusualness,
    ).toBeGreaterThan(0.4);
    expect(signal(normalDataset({ count: 200, seed: 4 }), 'rating_polarity').unusualness).toBe(0);
  });
});

describe('single_review_accounts', () => {
  it('is high when most reviewers have at most one review', () => {
    const s = signal(DATASETS.template({ count: 100, seed: 8 }), 'single_review_accounts');
    expect(s.value).toBeGreaterThan(0.6);
    expect(s.unusualness).toBeGreaterThan(0.6);
  });

  it('is unavailable when too few counts are known', () => {
    const reviews = normalDataset({ count: 30, seed: 8 }).map((r) => ({
      ...r,
      reviewerReviewCount: null,
    }));
    expect(signal(reviews, 'single_review_accounts').available).toBe(false);
  });
});

describe('text_similarity and template_phrases', () => {
  it('flag near-duplicate stock-phrase texts', () => {
    const template = DATASETS.template({ count: 100, seed: 6 });
    const sim = signal(template, 'text_similarity');
    const tpl = signal(template, 'template_phrases');
    expect(sim.available).toBe(true);
    expect(sim.unusualness).toBeGreaterThan(0.5);
    expect(tpl.value).toBeGreaterThan(0.5);
    expect(tpl.unusualness).toBe(1);
    expect(String(tpl.details.topPhrases)).toContain('(');
  });

  it('stay low on natural texts', () => {
    const normal = normalDataset({ count: 120, seed: 6 });
    expect(signal(normal, 'text_similarity').unusualness).toBeLessThan(0.2);
    expect(signal(normal, 'template_phrases').unusualness).toBe(0);
  });

  it('report exact duplicates as near-duplicate pairs', () => {
    const base = normalDataset({ count: 40, seed: 6 });
    const duplicated = base.map((r, i) => ({
      ...r,
      text:
        i % 2 === 0
          ? 'The espresso was smooth and the staff let us stay late to finish our books.'
          : r.text,
    }));
    const s = signal(duplicated, 'text_similarity');
    expect(s.details.highPairs).toBeGreaterThan(100);
    expect(s.unusualness).toBe(1);
  });

  it('work on Turkish texts through language detection', () => {
    const tr = DATASETS.turkish({ count: 60, seed: 6 });
    const tpl = signal(tr, 'template_phrases');
    expect(tpl.available).toBe(true);
    expect(tpl.value).toBeGreaterThan(0.2);
  });
});

describe('rating_text_mismatch', () => {
  it('detects 5-star ratings with negative texts', () => {
    const base = normalDataset({ count: 60, seed: 12 });
    const flipped = base.map((r, i) =>
      i % 3 === 0
        ? { ...r, rating: 5, text: 'Terrible, rude staff, dirty tables, worst evening, avoid.' }
        : r,
    );
    const s = signal(flipped, 'rating_text_mismatch');
    expect(s.available).toBe(true);
    expect(s.value).toBeGreaterThan(0.25);
    expect(s.unusualness).toBe(1);
  });
});

describe('date_entropy', () => {
  it('is low for even spread and high for clustered months', () => {
    expect(
      signal(normalDataset({ count: 200, seed: 13 }), 'date_entropy').unusualness,
    ).toBeLessThan(0.2);
    const burst = signal(DATASETS.burst({ count: 200, seed: 13 }), 'date_entropy');
    expect(burst.unusualness).toBeGreaterThan(0.1);
    expect(burst.value).toBeLessThan(0.8);
    expect(burst.details.busiestMonth).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('local_guide_ratio', () => {
  it('is unavailable when no level is exposed and high when established guides are absent', () => {
    const noLevels = normalDataset({ count: 40, seed: 14 }).map((r) => ({
      ...r,
      localGuideLevel: null,
    }));
    expect(signal(noLevels, 'local_guide_ratio').available).toBe(false);
    const lowLevels = normalDataset({ count: 40, seed: 14 }).map((r, i) => ({
      ...r,
      localGuideLevel: i === 0 ? 1 : null,
    }));
    const s = signal(lowLevels, 'local_guide_ratio');
    expect(s.available).toBe(true);
    expect(s.value).toBe(0);
    expect(s.unusualness).toBe(1);
  });
});

describe('owner_response_pattern', () => {
  it('is high when every response is identical', () => {
    const s = signal(DATASETS.template({ count: 100, seed: 15 }), 'owner_response_pattern');
    expect(s.available).toBe(true);
    expect(s.value).toBeGreaterThan(0.9);
    expect(s.unusualness).toBe(1);
  });

  it('is unavailable with fewer than 5 responses', () => {
    const reviews = normalDataset({ count: 40, seed: 15 }).map((r, i) => ({
      ...r,
      ownerResponse: i < 3 ? 'Thanks' : null,
    }));
    expect(signal(reviews, 'owner_response_pattern').available).toBe(false);
  });
});
