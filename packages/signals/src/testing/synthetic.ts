/**
 * Seeded synthetic review datasets used by the engine tests and to generate
 * the cross-runtime fixtures. Deterministic: same seed, same output.
 */
import type { Review } from '@signalyze/shared';

/** mulberry32 PRNG: small, fast, deterministic. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (p: number) => boolean;
}

export function rng(seed: number): Rng {
  const next = createRng(seed);
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)] as (typeof items)[number],
    chance: (p) => next() < p,
  };
}

const HEX = '0123456789abcdef';
export function randomHash(r: Rng): string {
  let s = '';
  for (let i = 0; i < 64; i += 1) s += HEX.charAt(r.int(0, 15));
  return s;
}

export function isoDay(dayNumber: number): string {
  return new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);
}

export const DAY_2026_06_01 = Math.floor(Date.UTC(2026, 5, 1) / 86_400_000);

const OPENERS = [
  'We came here on a Saturday afternoon',
  'Stopped by after work',
  'Visited with my parents',
  'Second time here',
  'Found this place by accident',
  'Booked a table for four',
  'Came for the brunch menu',
  'Dropped in for a quick coffee',
];
const MIDDLES = [
  'and the soup of the day was surprisingly rich',
  'and the waiter remembered our order from last month',
  'but the music was a bit loud for a conversation',
  'and the terrace view over the river is lovely in the evening',
  'and parking nearby was tricky on a weekday',
  'and the portions were larger than we expected',
  'and the espresso had a pleasant bitter finish',
  'and the kids menu kept our daughter busy',
  'and the bathroom could use some attention',
  'and the pastry case looked tempting',
];
const CLOSERS = [
  'Would come back for the dessert alone.',
  'Prices are fair for the area.',
  'Service was slow but the staff apologised.',
  'Worth the detour if you are nearby.',
  'Not sure about the new menu, the old one had more variety.',
  'The owner came out to chat, which was a nice touch.',
  'Reservations recommended on weekends.',
  'The lighting makes it hard to read the menu.',
];
const NEGATIVE = [
  'The chicken was cold and the waiter was rude, never again.',
  'Dirty tables and slow service, very disappointing evening.',
  'Overpriced for what you get, the salad was stale.',
  'We waited forty minutes and the order was wrong twice.',
];
const TEMPLATE_TEXTS = [
  'Highly recommend, great service and friendly staff.',
  'Great place, excellent service, will definitely come back.',
  'Best place in town, very professional, five stars.',
  'Amazing experience, great food, highly recommended.',
  'Very satisfied, top notch, thank you so much.',
];

function naturalText(r: Rng): string {
  return `${r.pick(OPENERS)} ${r.pick(MIDDLES)}. ${r.pick(CLOSERS)}`;
}

export interface DatasetOptions {
  count: number;
  seed: number;
}

function baseReview(r: Rng, overrides: Partial<Review>): Review {
  return {
    reviewerHash: randomHash(r),
    rating: 5,
    date: isoDay(DAY_2026_06_01),
    text: '',
    reviewerReviewCount: null,
    photoCount: 0,
    localGuideLevel: null,
    ownerResponse: null,
    language: 'en',
    ...overrides,
  };
}

const OWNER_OPENERS = [
  'Thanks for visiting',
  'We appreciate the feedback',
  'Glad you came by',
  'Thank you',
];
const OWNER_CLOSERS = [
  'hope to see you again soon.',
  'we will pass this on to the kitchen.',
  'the terrace is open again from May.',
  'please ask for the seasonal menu next time.',
  'our team will be happy to hear this.',
  'we are sorry about the wait that evening.',
];

function ownerReply(r: Rng): string {
  return `${r.pick(OWNER_OPENERS)}, ${r.pick(OWNER_CLOSERS)}`;
}

/** Steady flow over ~3 years, mixed ratings, natural texts, mixed reviewer histories. */
export function normalDataset({ count, seed }: DatasetOptions): Review[] {
  const r = rng(seed);
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const rating = r.pick([5, 5, 5, 5, 4, 4, 3, 2, 1] as const);
    const hasText = r.chance(0.75);
    const level = r.chance(0.35) ? r.int(1, 8) : null;
    out.push(
      baseReview(r, {
        rating,
        date: isoDay(DAY_2026_06_01 - r.int(0, 1095)),
        text: hasText ? (rating <= 2 ? r.pick(NEGATIVE) : naturalText(r)) : '',
        reviewerReviewCount: r.chance(0.9) ? (r.chance(0.25) ? r.int(0, 1) : r.int(2, 120)) : null,
        photoCount: r.chance(0.3) ? r.int(1, 4) : 0,
        localGuideLevel: level,
        ownerResponse: r.chance(0.2) ? ownerReply(r) : null,
      }),
    );
  }
  return out;
}

/** 60% of reviews inside one 14-day window, the rest spread over 2 years. */
export function burstDataset({ count, seed }: DatasetOptions): Review[] {
  const r = rng(seed);
  const burstStart = DAY_2026_06_01 - 400;
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const inBurst = i < Math.floor(count * 0.6);
    out.push(
      baseReview(r, {
        rating: inBurst ? 5 : r.pick([5, 4, 4, 3, 1] as const),
        date: isoDay(inBurst ? burstStart + r.int(0, 13) : DAY_2026_06_01 - r.int(0, 730)),
        text: r.chance(0.7) ? naturalText(r) : '',
        reviewerReviewCount: inBurst ? r.int(0, 2) : r.int(2, 80),
        photoCount: r.chance(0.2) ? 1 : 0,
        localGuideLevel: inBurst ? null : r.chance(0.4) ? r.int(2, 7) : null,
      }),
    );
  }
  return out;
}

/** Almost only 5-star and 1-star ratings. */
export function polarizedDataset({ count, seed }: DatasetOptions): Review[] {
  const r = rng(seed);
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const rating = r.pick([5, 5, 5, 5, 5, 1, 1, 1, 1, 4, 5, 1] as const);
    out.push(
      baseReview(r, {
        rating,
        date: isoDay(DAY_2026_06_01 - r.int(0, 900)),
        text: r.chance(0.6) ? (rating === 1 ? r.pick(NEGATIVE) : naturalText(r)) : '',
        reviewerReviewCount: r.int(0, 60),
        photoCount: r.chance(0.25) ? 1 : 0,
        localGuideLevel: r.chance(0.3) ? r.int(1, 6) : null,
        ownerResponse: rating === 1 ? ownerReply(r) : null,
      }),
    );
  }
  return out;
}

/** Stock-phrase texts, near-duplicate wording, single-review accounts, identical owner replies. */
export function templateDataset({ count, seed }: DatasetOptions): Review[] {
  const r = rng(seed);
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const templated = r.chance(0.8);
    out.push(
      baseReview(r, {
        rating: templated ? 5 : r.pick([5, 4, 3] as const),
        date: isoDay(DAY_2026_06_01 - r.int(0, 120)),
        text: templated ? r.pick(TEMPLATE_TEXTS) : naturalText(r),
        reviewerReviewCount: templated ? r.int(0, 1) : r.int(3, 40),
        photoCount: 0,
        localGuideLevel: templated ? null : r.chance(0.5) ? r.int(3, 6) : null,
        ownerResponse: templated ? 'Thank you for your kind words!' : null,
      }),
    );
  }
  return out;
}

/** Fewer than 15 reviews: no score. */
export function smallDataset({ count, seed }: DatasetOptions): Review[] {
  return normalDataset({ count: Math.min(count, 10), seed });
}

/** Ratings only: no text, no counts, no levels, no photos, no responses. */
export function sparseDataset({ count, seed }: DatasetOptions): Review[] {
  const r = rng(seed);
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(
      baseReview(r, {
        rating: r.pick([5, 4, 3, 2, 1] as const),
        date: isoDay(DAY_2026_06_01 - r.int(0, 700)),
        language: null,
      }),
    );
  }
  return out;
}

/** Turkish texts (exercise language detection and the tr dictionaries). */
export function turkishDataset({ count, seed }: DatasetOptions): Review[] {
  const r = rng(seed);
  const positive = [
    'Kesinlikle tavsiye ederim, çok memnun kaldım.',
    'Harika bir yer, güler yüzlü personel, teşekkür ederim.',
    'Lezzetli yemekler ve temiz bir ortam, tekrar geleceğim.',
    'Fiyat performans olarak çok başarılı, herkese tavsiye.',
  ];
  const openers = [
    'Cumartesi öğleden sonra geldik',
    'İş çıkışı uğradık',
    'Ailemle birlikte gittik',
    'İkinci gelişimiz',
    'Tesadüfen bulduk',
    'Dört kişilik masa ayırttık',
  ];
  const middles = [
    've günün çorbası beklediğimden zengindi',
    've garson geçen ayki siparişimizi hatırladı',
    'ama müzik sohbet için biraz yüksekti',
    've nehir manzaralı teras akşam çok keyifliydi',
    'ama hafta içi park yeri bulmak zordu',
    've porsiyonlar beklediğimizden büyüktü',
    've espresso hoş bir acılıkla bitiyordu',
  ];
  const closers = [
    'Sırf tatlı için bile tekrar gelinir.',
    'Fiyatlar semte göre makul.',
    'Servis yavaştı ama ekip özür diledi.',
    'Yakındaysanız uğramaya değer.',
    'Yeni menü eskisi kadar çeşitli değil.',
    'Hafta sonu rezervasyon şart.',
  ];
  const negative = [
    'Tavuk soğuktu ve garson kaba davrandı, bir daha asla.',
    'Masalar kirli, servis yavaş, hayal kırıklığı.',
    'Fiyatlar pahalı ve ekmek bayattı, tavsiye etmem.',
  ];
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const rating = r.pick([5, 5, 5, 4, 3, 1] as const);
    const text =
      rating === 1
        ? r.pick(negative)
        : r.chance(0.5)
          ? r.pick(positive)
          : `${r.pick(openers)} ${r.pick(middles)}. ${r.pick(closers)}`;
    out.push(
      baseReview(r, {
        rating,
        date: isoDay(DAY_2026_06_01 - r.int(0, 800)),
        text,
        reviewerReviewCount: r.int(0, 50),
        photoCount: r.chance(0.3) ? 1 : 0,
        language: 'tr',
      }),
    );
  }
  return out;
}

export const DATASETS = {
  normal: normalDataset,
  burst: burstDataset,
  polarized: polarizedDataset,
  template: templateDataset,
  small: smallDataset,
  sparse: sparseDataset,
  turkish: turkishDataset,
} as const;

export type DatasetName = keyof typeof DATASETS;
