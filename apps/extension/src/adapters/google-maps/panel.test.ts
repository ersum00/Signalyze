import { describe, expect, it, vi } from 'vitest';
import { collectReviews, expandTruncatedTexts, findScrollPanel, selectNewestSort } from './panel';
import { readVisibleReviewsDetailed } from './reviews';
import { checkLayout } from './selectors';

const NOW = new Date('2026-09-13T10:00:00Z');

interface MiniReview {
  id: string;
  reviewer: number;
  stars: number;
  when: string;
  text?: string;
  photos?: number;
  /** Photos beyond the rendered tiles, shown as "+ N more photos" on the last tile. */
  morePhotos?: number;
  stats?: string;
  owner?: string;
}

function reviewHtml(r: MiniReview): string {
  const tiles = r.photos ?? 0;
  const photos = Array.from({ length: tiles }, (_, i) => {
    const last = i === tiles - 1 && r.morePhotos;
    const label = last
      ? `+ ${r.morePhotos} more photos on Reviewer ${r.reviewer}'s review`
      : `Photo ${i + 1}`;
    const overlay = last ? `<div>+${r.morePhotos}</div>` : '';
    return `<button data-photo-index="${i}" data-review-id="${r.id}" aria-label="${label}">${overlay}</button>`;
  }).join('');
  const owner = r.owner
    ? `<div><div><span>Response from the owner</span><span>a week ago</span></div><div>${r.owner}</div></div>`
    : '';
  return `
    <div data-review-id="${r.id}" aria-label="Reviewer ${r.reviewer}">
      <div>
        <button data-review-id="${r.id}" data-href="https://www.google.com/maps/contrib/${r.reviewer}" aria-label="Photo of Reviewer ${r.reviewer}"><img alt="" src=""></button>
        <button data-href="https://www.google.com/maps/contrib/${r.reviewer}/reviews" data-review-id="${r.id}">
          <div>Reviewer ${r.reviewer}</div>
          <div>${r.stats ?? '3 reviews'}</div>
        </button>
        <button data-review-id="${r.id}" aria-label="Actions for Reviewer ${r.reviewer}'s review"></button>
      </div>
      <div>
        <div><span role="img" aria-label="${r.stars} stars"><span></span></span><span>${r.when}</span></div>
        <div><span>${r.text ?? ''}</span><button aria-expanded="false" aria-label="See more">More</button></div>
        <div>${photos}</div>
        ${owner}
      </div>
    </div>`;
}

interface SortLabels {
  button: string;
  items: string[];
  /** Google's stable data-value="Sort" attribute; omitted to exercise the label/position fallbacks. */
  dataValue?: boolean;
}

const ENGLISH_SORT: SortLabels = {
  button: 'Sort reviews',
  items: ['Most relevant', 'Newest', 'Highest rating', 'Lowest rating'],
  dataValue: true,
};

function sortHtml(labels: SortLabels): string {
  const value = labels.dataValue === true ? ' data-value="Sort"' : '';
  const items = labels.items
    .map(
      (item, i) =>
        `<div role="menuitemradio" data-index="${i}" aria-checked="${i === 0}">${item}</div>`,
    )
    .join('');
  return `<button aria-haspopup="true"${value} aria-label="${labels.button}">${labels.button}</button>
    <div role="menu">${items}</div>`;
}

function pageHtml(
  reviews: MiniReview[],
  options: { tabSelected?: boolean; sort?: SortLabels } = {},
): string {
  const selected = options.tabSelected ?? true;
  return `
    <div role="main" aria-label="Business test">
      <div><h1>Business test</h1>
        <div><span role="img" aria-label="4.3 stars"></span><span aria-label="1,240 reviews">(1,240)</span></div>
      </div>
      <div role="tablist">
        <button role="tab" aria-selected="${selected ? 'false' : 'true'}" aria-label="Overview of Business test">Overview</button>
        <button role="tab" aria-selected="${selected ? 'true' : 'false'}" aria-label="Reviews for Business test">Reviews</button>
      </div>
      ${options.sort ? sortHtml(options.sort) : ''}
      <div tabindex="-1">
        <div>${reviews.map(reviewHtml).join('')}</div>
      </div>
    </div>`;
}

function load(html: string): Document {
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = html;
  return document;
}

const THREE: MiniReview[] = [
  { id: 'r1', reviewer: 1, stars: 5, when: '2 weeks ago', text: 'Lovely place.', photos: 2 },
  {
    id: 'r2',
    reviewer: 2,
    stars: 3,
    when: 'a month ago',
    text: 'Fine.',
    stats: 'Local Guide · 45 reviews · 12 photos',
  },
  { id: 'r3', reviewer: 3, stars: 1, when: 'vor 3 Jahren', owner: 'Thank you for the feedback.' },
];

describe('readVisibleReviewsDetailed (hand-built DOM)', () => {
  it('reads every field and skips unparsable dates', () => {
    const doc = load(
      pageHtml([
        ...THREE,
        { id: 'r4', reviewer: 4, stars: 4, when: 'March 2024', text: 'skipped' },
      ]),
    );
    const result = readVisibleReviewsDetailed(doc, NOW);
    expect(result.skipped).toEqual({ noRating: 0, noDate: 1, duplicate: 0 });
    expect(result.reviews).toHaveLength(3);
    expect(result.reviews[0]).toEqual({
      reviewerId: '1',
      rating: 5,
      dateText: '2 weeks ago',
      date: '2026-08-30',
      text: 'Lovely place.',
      reviewerReviewCount: 3,
      photoCount: 2,
      localGuideLevel: null,
      ownerResponse: null,
      language: 'en',
    });
    expect(result.reviews[1]?.reviewerReviewCount).toBe(45);
    expect(result.reviews[1]?.photoCount).toBe(0);
    expect(result.reviews[2]).toMatchObject({
      rating: 1,
      date: '2023-09-13',
      text: '',
      ownerResponse: 'Thank you for the feedback.',
    });
  });

  it('counts photo tiles plus the "+ N more" overlay, never the avatar', () => {
    const doc = load(
      pageHtml([
        { id: 'p1', reviewer: 1, stars: 5, when: 'a day ago', photos: 4, morePhotos: 34 },
        { id: 'p2', reviewer: 2, stars: 5, when: 'a day ago', photos: 0 },
      ]),
    );
    const { reviews } = readVisibleReviewsDetailed(doc, NOW);
    expect(reviews.map((r) => r.photoCount)).toEqual([38, 0]);
  });

  it('counts repeated review ids once', () => {
    const doc = load(pageHtml([THREE[0]!, THREE[0]!]));
    const result = readVisibleReviewsDetailed(doc, NOW);
    expect(result.reviews).toHaveLength(1);
    expect(result.skipped.duplicate).toBe(1);
  });
});

describe('checkLayout', () => {
  it('passes on the hand-built page', () => {
    expect(checkLayout(load(pageHtml(THREE)))).toEqual({ ok: true });
  });

  it('lists the missing rule names on an unrelated document', () => {
    const doc = load('<p>hi</p>');
    const result = checkLayout(doc);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual([
      'mainPanel',
      'placeName',
      'reviewsTab',
      'reviewContainer',
      'reviewRating',
      'reviewDate',
      'reviewerLink',
    ]);
  });

  it('reports a review-level rule when every review lacks it', () => {
    const html = pageHtml(THREE).replace(/role="img" aria-label="\d stars"/g, '');
    const result = checkLayout(load(html));
    expect(result).toEqual({ ok: false, missing: ['reviewRating', 'reviewDate'] });
  });
});

describe('findScrollPanel / expandTruncatedTexts', () => {
  it('falls back to the tabindex="-1" ancestor when styles carry no overflow', () => {
    const doc = load(pageHtml(THREE));
    expect(findScrollPanel(doc)?.getAttribute('tabindex')).toBe('-1');
  });

  it('clicks every collapsed "More" button', () => {
    const doc = load(pageHtml(THREE));
    const clicks: string[] = [];
    for (const button of doc.querySelectorAll('button[aria-expanded="false"]')) {
      button.addEventListener('click', () =>
        clicks.push(button.closest('[data-review-id]')!.getAttribute('data-review-id')!),
      );
    }
    expect(expandTruncatedTexts(doc)).toBe(3);
    expect(clicks).toEqual(['r1', 'r2', 'r3']);
  });
});

describe('collectReviews (hand-built DOM)', () => {
  const instantSleep = (): Promise<void> => Promise.resolve();

  it('returns complete once the limit is reached', async () => {
    const doc = load(pageHtml(THREE));
    const progress: number[] = [];
    const result = await collectReviews(doc, {
      limit: 2,
      now: NOW,
      sleep: instantSleep,
      onProgress: (n) => progress.push(n),
    });
    expect(result.status).toBe('complete');
    expect(result.reviews).toHaveLength(2);
    expect(progress).toEqual([3]);
  });

  it('returns exhausted after two scrolls without new reviews', async () => {
    const doc = load(pageHtml(THREE));
    const sleeps: number[] = [];
    const sleep = (ms: number): Promise<void> => {
      sleeps.push(ms);
      return Promise.resolve();
    };
    const result = await collectReviews(doc, { limit: 10, now: NOW, sleep, scrollIntervalMs: 250 });
    expect(result.status).toBe('exhausted');
    expect(result.reviews).toHaveLength(3);
    expect(sleeps).toEqual([250, 250]);
  });

  it('keeps reading reviews that appear while scrolling', async () => {
    const doc = load(pageHtml([THREE[0]!]));
    const list = doc.querySelector('[data-review-id="r1"]')!.parentElement!;
    let round = 0;
    const sleep = (): Promise<void> => {
      round += 1;
      if (round === 1) list.insertAdjacentHTML('beforeend', reviewHtml(THREE[1]!));
      if (round === 2) list.insertAdjacentHTML('beforeend', reviewHtml(THREE[2]!));
      return Promise.resolve();
    };
    const result = await collectReviews(doc, { limit: 10, now: NOW, sleep });
    expect(result.status).toBe('exhausted');
    expect(result.reviews.map((r) => r.reviewerId)).toEqual(['1', '2', '3']);
  });

  it('opens the Reviews tab first when it is not selected', async () => {
    const doc = load(pageHtml(THREE, { tabSelected: false }));
    const tab = doc.querySelector('button[aria-label^="Reviews"]')!;
    const onClick = vi.fn(() => {
      tab.setAttribute('aria-selected', 'true');
    });
    tab.addEventListener('click', onClick);
    const result = await collectReviews(doc, { limit: 3, now: NOW, sleep: instantSleep });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('complete');
  });

  it('waits a few intervals for the list to render after opening the tab', async () => {
    const doc = load(pageHtml([], { tabSelected: false }));
    const list = doc.querySelector('[tabindex="-1"] > div')!;
    let sleeps = 0;
    const sleep = (): Promise<void> => {
      sleeps += 1;
      // Tab click sleep, then two empty polls, then the list renders.
      if (sleeps === 3) list.insertAdjacentHTML('beforeend', THREE.map(reviewHtml).join(''));
      return Promise.resolve();
    };
    const result = await collectReviews(doc, { limit: 3, now: NOW, sleep });
    expect(result.status).toBe('complete');
    expect(result.reviews).toHaveLength(3);
    expect(sleeps).toBe(3);
  });

  it('gives up with unsupported_layout when no review renders after the tab opens', async () => {
    const doc = load(pageHtml([], { tabSelected: true }));
    let sleeps = 0;
    const sleep = (): Promise<void> => {
      sleeps += 1;
      return Promise.resolve();
    };
    const result = await collectReviews(doc, { limit: 3, now: NOW, sleep });
    expect(result).toEqual({ reviews: [], status: 'unsupported_layout', sortedByNewest: false });
    expect(sleeps).toBe(5);
  });

  it('returns aborted when the signal is aborted during a scroll', async () => {
    const doc = load(pageHtml(THREE));
    const controller = new AbortController();
    const sleep = (): Promise<void> => {
      controller.abort();
      return Promise.resolve();
    };
    const result = await collectReviews(doc, {
      limit: 10,
      now: NOW,
      sleep,
      signal: controller.signal,
    });
    expect(result.status).toBe('aborted');
    expect(result.reviews).toHaveLength(3);
  });

  it('returns unsupported_layout on an unrelated document', async () => {
    const doc = load('<p>hi</p>');
    const result = await collectReviews(doc, { limit: 10, now: NOW, sleep: instantSleep });
    expect(result).toEqual({ reviews: [], status: 'unsupported_layout', sortedByNewest: false });
  });

  it('stops with exhausted when the time budget is spent while a spinner stays visible', async () => {
    const doc = load(pageHtml(THREE));
    doc
      .querySelector('[role="main"]')!
      .insertAdjacentHTML('beforeend', '<div role="progressbar"></div>');
    let sleeps = 0;
    const sleep = (): Promise<void> => {
      sleeps += 1;
      return Promise.resolve();
    };
    const result = await collectReviews(doc, { limit: 4, now: NOW, sleep, scrollIntervalMs: 100 });
    expect(result.status).toBe('exhausted');
    // Budget is limit * interval * 3 = 1200 ms, i.e. 12 scrolls of 100 ms.
    expect(sleeps).toBe(12);
  });
});

function clicksOf(doc: Document): string[] {
  const clicked: string[] = [];
  for (const item of Array.from(doc.querySelectorAll('[role="menuitemradio"]'))) {
    item.addEventListener('click', () => {
      clicked.push(item.textContent ?? '');
    });
  }
  return clicked;
}

describe('selectNewestSort', () => {
  it('opens the sort menu and clicks the Newest item by label', async () => {
    const doc = load(pageHtml(THREE, { sort: ENGLISH_SORT }));
    const clicked = clicksOf(doc);
    expect(
      await selectNewestSort(
        doc,
        () => Promise.resolve(),
        () => false,
      ),
    ).toBe(true);
    expect(clicked).toEqual(['Newest']);
  });

  it('finds the button by a known label and the item by a known word', async () => {
    const doc = load(
      pageHtml(THREE, {
        sort: {
          button: 'Rendezés',
          items: ['Legrelevánsabb', 'Legújabb', 'Legjobb', 'Legrosszabb'],
        },
      }),
    );
    const clicked = clicksOf(doc);
    expect(
      await selectNewestSort(
        doc,
        () => Promise.resolve(),
        () => false,
      ),
    ).toBe(true);
    expect(clicked).toEqual(['Legújabb']);
  });

  it('falls back to the popup before the list and the second item in an unknown language', async () => {
    const doc = load(
      pageHtml(THREE, {
        sort: {
          button: 'Panga',
          items: ['Zinazofaa zaidi', 'Mpya zaidi', 'Bora zaidi', 'Duni zaidi'],
        },
      }),
    );
    const clicked = clicksOf(doc);
    expect(
      await selectNewestSort(
        doc,
        () => Promise.resolve(),
        () => false,
      ),
    ).toBe(true);
    expect(clicked).toEqual(['Mpya zaidi']);
  });

  it('reports false when the page has no sort control', async () => {
    const doc = load(pageHtml(THREE));
    expect(
      await selectNewestSort(
        doc,
        () => Promise.resolve(),
        () => false,
      ),
    ).toBe(false);
  });
});

describe('collectReviews with a window', () => {
  const older = (i: number): MiniReview => ({
    id: `old${i}`,
    reviewer: 100 + i,
    stars: 4,
    when: '4 years ago',
  });

  it('stops after two rounds that only added reviews older than minDate', async () => {
    const doc = load(pageHtml(THREE, { sort: ENGLISH_SORT }));
    const list = doc.querySelector('[tabindex="-1"] > div')!;
    let round = 0;
    const result = await collectReviews(doc, {
      limit: 2000,
      minDate: '2026-08-01',
      now: NOW,
      sleep: async () => {
        round += 1;
        if (round > 40) throw new Error('collection did not stop');
        list.insertAdjacentHTML('beforeend', reviewHtml(older(round)));
      },
    });
    expect(result.sortedByNewest).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.reviews.length).toBeLessThan(8);
  });

  it('keeps collecting in the default order when the sort switch failed', async () => {
    const doc = load(pageHtml(THREE));
    const result = await collectReviews(doc, {
      limit: 3,
      minDate: '2026-08-01',
      now: NOW,
      sleep: () => Promise.resolve(),
    });
    expect(result.sortedByNewest).toBe(false);
    expect(result.status).toBe('complete');
    expect(result.reviews).toHaveLength(3);
  });

  it('reports sortedByNewest false without a window', async () => {
    const doc = load(pageHtml(THREE, { sort: ENGLISH_SORT }));
    const clicked = clicksOf(doc);
    const result = await collectReviews(doc, {
      limit: 3,
      now: NOW,
      sleep: () => Promise.resolve(),
    });
    expect(result.sortedByNewest).toBe(false);
    expect(clicked).toEqual([]);
  });
});
