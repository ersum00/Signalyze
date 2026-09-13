/**
 * Hand-built place panels in UI languages beyond en/tr/de/es, plus the
 * language-independent fallbacks (tab probing, structural owner reply).
 */
import { describe, expect, it } from 'vitest';
import { collectReviews, findReviewsTab } from './panel';
import { readPlaceContext } from './place';
import { readVisibleReviewsDetailed } from './reviews';
import { checkLayout, isReviewCount } from './selectors';

const NOW = new Date('2026-09-13T10:00:00Z');
const PLACE_URL = 'https://www.google.com/maps/place/X/data=!1s0x1:0x2';
const NNBSP = String.fromCharCode(0x202f);

interface Owner {
  heading: string;
  when: string;
  text: string;
}

interface MiniReview {
  id: string;
  reviewer: number;
  /** Star aria-label as Google renders it in the UI language. */
  stars: string;
  when: string;
  text?: string;
  stats?: string;
  owner?: Owner;
  /** Extra markup after the body block, to exercise the structural owner-reply fallback. */
  trailing?: string;
}

interface Tab {
  text: string;
  aria: string;
  selected?: boolean;
}

interface Page {
  lang: string;
  name: string;
  rating: string;
  count: string;
  tabs: Tab[];
  reviews: MiniReview[];
}

function reviewHtml(r: MiniReview, lang: string): string {
  const owner = r.owner
    ? `<div><div><span>${r.owner.heading}</span><span>${r.owner.when}</span></div><div>${r.owner.text}</div></div>`
    : '';
  return `
    <div data-review-id="${r.id}" aria-label="Reviewer ${r.reviewer}">
      <div>
        <button data-review-id="${r.id}" data-href="https://www.google.com/maps/contrib/${r.reviewer}" aria-label="Photo of Reviewer ${r.reviewer}"><img alt="" src=""></button>
        <button data-href="https://www.google.com/maps/contrib/${r.reviewer}/reviews" data-review-id="${r.id}">
          <div>Reviewer ${r.reviewer}</div>
          <div>${r.stats ?? ''}</div>
        </button>
      </div>
      <div>
        <div><span role="img" aria-label="${r.stars}"><span></span></span><span>${r.when}</span></div>
        <div><div tabindex="-1" lang="${lang}"><span>${r.text ?? ''}</span></div></div>
        ${r.trailing ?? ''}
        ${owner}
      </div>
    </div>`;
}

function pageHtml(page: Page): string {
  const tabs = page.tabs
    .map(
      (tab) =>
        `<button role="tab" aria-selected="${tab.selected ? 'true' : 'false'}" aria-label="${tab.aria}">${tab.text}</button>`,
    )
    .join('');
  return `
    <div role="main" aria-label="${page.name}">
      <div><h1>${page.name}</h1>
        <div><span role="img" aria-label="${page.rating}"></span><span aria-label="${page.count}">(${page.count})</span></div>
      </div>
      <div role="tablist">${tabs}</div>
      <div tabindex="-1">
        <div>${page.reviews.map((r) => reviewHtml(r, page.lang)).join('')}</div>
      </div>
    </div>`;
}

/**
 * Loads the page and makes the tabs behave: a click selects the clicked tab
 * and lets `render` replace the list content, like Google's panel does.
 */
function load(page: Page, render?: (tabText: string) => string): Document {
  document.documentElement.setAttribute('lang', page.lang);
  document.body.innerHTML = pageHtml(page);
  const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
  const list = document.querySelector('[tabindex="-1"] > div')!;
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      for (const other of tabs) other.setAttribute('aria-selected', String(other === tab));
      if (render) list.innerHTML = render(tab.textContent ?? '');
    });
  }
  return document;
}

const instantSleep = (): Promise<void> => Promise.resolve();

describe('French UI', () => {
  const page: Page = {
    lang: 'fr',
    name: 'Business fr',
    rating: '4,3 étoiles',
    count: `1${NNBSP}240 avis`,
    tabs: [
      { text: 'Présentation', aria: 'Présentation de Business fr' },
      { text: 'Avis', aria: 'Avis sur Business fr', selected: true },
      { text: 'À propos', aria: 'À propos de Business fr' },
    ],
    reviews: [
      {
        id: 'f1',
        reviewer: 1,
        stars: '5 étoiles',
        when: 'il y a 2 semaines',
        text: 'Très bel endroit.',
        stats: 'Local Guide · 45 avis · 12 photos',
        owner: {
          heading: 'Réponse du propriétaire',
          when: 'il y a une semaine',
          text: 'Merci pour votre visite.',
        },
      },
      {
        id: 'f2',
        reviewer: 2,
        stars: '3 étoiles',
        when: 'Modifié il y a un mois',
        text: 'Correct.',
        stats: '3 avis',
      },
      {
        id: 'f3',
        reviewer: 3,
        stars: '1 étoile',
        when: 'il y a 3 ans',
        stats: '12 avis · 4 photos',
      },
    ],
  };

  it('finds the Avis tab by its text and passes the layout self-test', () => {
    const doc = load(page);
    expect(findReviewsTab(doc)?.textContent).toBe('Avis');
    expect(checkLayout(doc)).toEqual({ ok: true });
  });

  it('reads header, dates, counts and the owner reply', () => {
    const doc = load(page);
    const context = readPlaceContext(doc, PLACE_URL);
    expect(context).toMatchObject({
      name: 'Business fr',
      overallRating: 4.3,
      totalReviewCount: 1240,
    });
    const { reviews, skipped } = readVisibleReviewsDetailed(doc, NOW);
    expect(skipped).toEqual({ noRating: 0, noDate: 0, duplicate: 0 });
    expect(reviews.map((r) => [r.rating, r.date, r.reviewerReviewCount, r.ownerResponse])).toEqual([
      [5, '2026-08-30', 45, 'Merci pour votre visite.'],
      [3, '2026-08-13', 3, null],
      [1, '2023-09-13', 12, null],
    ]);
    expect(reviews[0]?.text).toBe('Très bel endroit.');
    expect(reviews.every((r) => r.language === 'fr')).toBe(true);
  });

  it('collects through collectReviews', async () => {
    const result = await collectReviews(load(page), { limit: 3, now: NOW, sleep: instantSleep });
    expect(result.status).toBe('complete');
    expect(result.reviews).toHaveLength(3);
  });
});

describe('Japanese UI', () => {
  const page: Page = {
    lang: 'ja',
    name: 'Business ja',
    rating: '4.3 つ星',
    count: '1,240 件のクチコミ',
    tabs: [
      { text: '概要', aria: 'Business ja の概要', selected: true },
      { text: 'クチコミ', aria: 'Business ja のクチコミ' },
      { text: '情報', aria: 'Business ja の情報' },
    ],
    reviews: [
      {
        id: 'j1',
        reviewer: 1,
        stars: '5 つ星',
        when: '2 週間前',
        text: '素晴らしい場所でした。',
        stats: 'ローカルガイド · クチコミ 45 件 · 写真 12 枚',
        owner: {
          heading: 'オーナーからの返信',
          when: '1 週間前',
          text: 'ご来店ありがとうございます。',
        },
      },
      {
        id: 'j2',
        reviewer: 2,
        stars: '4 つ星',
        when: '編集済み: 3 か月前',
        text: 'よかった。',
        stats: 'クチコミ 3 件',
      },
    ],
  };

  it('finds the クチコミ tab and reads every field', () => {
    const doc = load(page);
    expect(findReviewsTab(doc)?.textContent).toBe('クチコミ');
    const context = readPlaceContext(doc, PLACE_URL);
    expect(context).toMatchObject({ overallRating: 4.3, totalReviewCount: 1240 });
    const { reviews, skipped } = readVisibleReviewsDetailed(doc, NOW);
    expect(skipped).toEqual({ noRating: 0, noDate: 0, duplicate: 0 });
    expect(reviews.map((r) => [r.rating, r.date, r.reviewerReviewCount, r.ownerResponse])).toEqual([
      [5, '2026-08-30', 45, 'ご来店ありがとうございます。'],
      [4, '2026-06-13', 3, null],
    ]);
    expect(reviews.map((r) => r.localGuideLevel)).toEqual([null, null]);
  });

  it('opens the クチコミ tab when the overview is selected', async () => {
    const clicks: string[] = [];
    const doc = load(page);
    for (const tab of doc.querySelectorAll('button[role="tab"]')) {
      tab.addEventListener('click', () => clicks.push(tab.textContent ?? ''));
    }
    const result = await collectReviews(doc, { limit: 2, now: NOW, sleep: instantSleep });
    expect(clicks).toEqual(['クチコミ']);
    expect(result.status).toBe('complete');
    expect(result.reviews).toHaveLength(2);
  });
});

describe('Korean UI', () => {
  const page: Page = {
    lang: 'ko',
    name: 'Business ko',
    rating: '별표 4.3개',
    count: '리뷰 1,240개',
    tabs: [
      { text: '개요', aria: 'Business ko 개요' },
      { text: '리뷰', aria: 'Business ko 리뷰', selected: true },
      { text: '정보', aria: 'Business ko 정보' },
    ],
    reviews: [
      {
        id: 'k1',
        reviewer: 1,
        stars: '별표 5개',
        when: '2주 전',
        text: '정말 좋았어요.',
        stats: '지역 가이드 · 리뷰 45개 · 사진 12장',
        owner: { heading: '업체의 답변', when: '1주 전', text: '방문해 주셔서 감사합니다.' },
      },
    ],
  };

  it('reads the number-last labels and the owner reply', () => {
    const doc = load(page);
    expect(findReviewsTab(doc)?.textContent).toBe('리뷰');
    expect(readPlaceContext(doc, PLACE_URL)).toMatchObject({
      overallRating: 4.3,
      totalReviewCount: 1240,
    });
    const { reviews } = readVisibleReviewsDetailed(doc, NOW);
    expect(reviews[0]).toMatchObject({
      rating: 5,
      date: '2026-08-30',
      reviewerReviewCount: 45,
      localGuideLevel: null,
      ownerResponse: '방문해 주셔서 감사합니다.',
    });
  });
});

describe('owner reply without a known heading (structural fallback)', () => {
  function englishPage(reviews: MiniReview[]): Page {
    return {
      lang: 'en',
      name: 'Business en',
      rating: '4.3 stars',
      count: '1,240 reviews',
      tabs: [
        { text: 'Overview', aria: 'Overview of Business en' },
        { text: 'Reviews', aria: 'Reviews for Business en', selected: true },
      ],
      reviews,
    };
  }

  it('takes a block after the body whose first row is a heading plus a relative date', () => {
    const doc = load(
      englishPage([
        {
          id: 's1',
          reviewer: 1,
          stars: '5 stars',
          when: '2 weeks ago',
          text: 'Lovely.',
          owner: { heading: 'Reply from the business', when: 'a week ago', text: 'Thank you!' },
        },
        {
          id: 's2',
          reviewer: 2,
          stars: '4 stars',
          when: 'a month ago',
          text: 'Fine.',
          owner: { heading: 'Antwort des Geschäftsinhabers', when: 'vor 3 Tagen', text: 'Danke.' },
        },
      ]),
    );
    const { reviews } = readVisibleReviewsDetailed(doc, NOW);
    expect(reviews.map((r) => [r.text, r.ownerResponse])).toEqual([
      ['Lovely.', 'Thank you!'],
      ['Fine.', 'Danke.'],
    ]);
  });

  it('never returns the review text and ignores rows without a date', () => {
    const doc = load(
      englishPage([
        {
          id: 'n1',
          reviewer: 1,
          stars: '5 stars',
          when: '2 weeks ago',
          text: 'Fine.',
          trailing:
            '<div><div><span>Shared on</span><span>2 weeks ago</span></div><div>Fine.</div></div>',
        },
        {
          id: 'n2',
          reviewer: 2,
          stars: '4 stars',
          when: 'a month ago',
          text: 'Good food.',
          trailing: '<div><div><span>Dine in</span><span>Lunch</span></div><div>$20–30</div></div>',
        },
        {
          id: 'n3',
          reviewer: 3,
          stars: '3 stars',
          when: 'a year ago',
          text: 'Okay.',
        },
      ]),
    );
    const { reviews } = readVisibleReviewsDetailed(doc, NOW);
    expect(reviews.map((r) => [r.text, r.ownerResponse])).toEqual([
      ['Fine.', null],
      ['Good food.', null],
      ['Okay.', null],
    ]);
  });
});

describe('tab probing when no label is recognised', () => {
  const THREE: MiniReview[] = [
    { id: 'p1', reviewer: 1, stars: '5 stars', when: '2 weeks ago', text: 'One.' },
    { id: 'p2', reviewer: 2, stars: '4 stars', when: 'a month ago', text: 'Two.' },
    { id: 'p3', reviewer: 3, stars: '3 stars', when: 'a year ago', text: 'Three.' },
  ];
  const SNIPPET: MiniReview = { id: 'p1', reviewer: 1, stars: '5 stars', when: '2 weeks ago' };

  function unknownPage(tabTexts: string[]): Page {
    return {
      lang: 'sw',
      name: 'Business sw',
      rating: '4.3 stars',
      count: '1,240 reviews',
      tabs: tabTexts.map((text, i) => ({ text, aria: `${text} Business sw`, selected: i === 0 })),
      reviews: [],
    };
  }

  function trackClicks(doc: Document): string[] {
    const clicks: string[] = [];
    for (const tab of doc.querySelectorAll('button[role="tab"]')) {
      tab.addEventListener('click', () => clicks.push(tab.textContent ?? ''));
    }
    return clicks;
  }

  it('keeps the tab that renders the most review containers and leaves it selected', async () => {
    const page = unknownPage(['Muhtasari', 'Tiketi', 'Maoni', 'Kuhusu']);
    const render = (tab: string): string => {
      if (tab === 'Muhtasari') return reviewHtml(SNIPPET, 'sw');
      if (tab === 'Maoni') return THREE.map((r) => reviewHtml(r, 'sw')).join('');
      return '';
    };
    const doc = load(page, render);
    const before = checkLayout(doc);
    expect(before.ok).toBe(false);
    if (!before.ok) expect(before.missing).toContain('reviewsTab');

    const clicks = trackClicks(doc);
    let sleeps = 0;
    const sleep = (): Promise<void> => {
      sleeps += 1;
      return Promise.resolve();
    };
    const result = await collectReviews(doc, { limit: 3, now: NOW, sleep });
    expect(result.status).toBe('complete');
    expect(result.reviews.map((r) => r.reviewerId)).toEqual(['1', '2', '3']);
    // Overview renders its snippet at once (1 wait), the empty tabs get 2 waits each,
    // Maoni renders at once (1 wait) and is clicked again at the end (1 wait).
    expect(clicks).toEqual(['Muhtasari', 'Tiketi', 'Maoni', 'Kuhusu', 'Maoni']);
    expect(sleeps).toBe(7);
    expect(doc.querySelector('button[role="tab"][aria-selected="true"]')?.textContent).toBe(
      'Maoni',
    );
    expect(checkLayout(doc)).toEqual({ ok: true });
  });

  it('probes at most four tabs and reports unsupported_layout when none renders reviews', async () => {
    const doc = load(unknownPage(['A', 'B', 'C', 'D', 'E', 'F']), () => '');
    const clicks = trackClicks(doc);
    let sleeps = 0;
    const sleep = (): Promise<void> => {
      sleeps += 1;
      return Promise.resolve();
    };
    const result = await collectReviews(doc, { limit: 3, now: NOW, sleep });
    expect(result).toEqual({ reviews: [], status: 'unsupported_layout' });
    expect(clicks).toEqual(['A', 'B', 'C', 'D']);
    expect(sleeps).toBe(8);
  });

  it('returns aborted when the signal fires during probing', async () => {
    const doc = load(unknownPage(['A', 'B', 'C']), () => '');
    const controller = new AbortController();
    const sleep = (): Promise<void> => {
      controller.abort();
      return Promise.resolve();
    };
    const result = await collectReviews(doc, {
      limit: 3,
      now: NOW,
      sleep,
      signal: controller.signal,
    });
    expect(result).toEqual({ reviews: [], status: 'aborted' });
  });
});

describe('reviewer stats line (positional)', () => {
  function withStats(stats: string): Page {
    return {
      lang: 'en',
      name: 'Business en',
      rating: '4.3 stars',
      count: '1,240 reviews',
      tabs: [{ text: 'Reviews', aria: 'Reviews for Business en', selected: true }],
      reviews: [{ id: 'x', reviewer: 4, stars: '5 stars', when: 'a day ago', stats }],
    };
  }

  it.each([
    ['Yerel Rehber · 1.107 yorum · 6.721 fotoğraf', 1107, null],
    ['지역 가이드 · 리뷰 45개 · 사진 12장', 45, null],
    ['ローカルガイド · クチコミ 45 件 · 写真 12 枚', 45, null],
    ['مرشد محلي · ٤٥ مراجعة · ١٢ صورة', 45, null],
    ['Local Guide · Level 7 · 45 reviews · 12 photos', 45, 7],
    ['Mwongozo wa Eneo · maoni 45 · picha 12', 45, null],
    ['3 reviews', 3, null],
    ['Local Guide', null, null],
    ['', null, null],
  ])('%s -> count %s, level %s', (stats, count, level) => {
    const { reviews } = readVisibleReviewsDetailed(load(withStats(stats)), NOW);
    expect(reviews[0]?.reviewerReviewCount).toBe(count);
    expect(reviews[0]?.localGuideLevel).toBe(level);
  });
});

describe('isReviewCount', () => {
  it.each([
    ['7,424 reviews', true],
    ['7,424 件のクチコミ', true],
    ['리뷰 7,424개', true],
    ['7.424 de recenzii', true],
    ['รีวิว 7,424 รายการ', true],
    [`1${NNBSP}240 avis`, true],
    ['1,2 B yorum', true],
    ['Reviewer 12', false],
    ['Search reviews', false],
    ['Reviews for Business 12', false],
    ['4.6 stars', false],
  ])('%s -> %s', (text, expected) => {
    expect(isReviewCount(text)).toBe(expected);
  });
});
