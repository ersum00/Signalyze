/**
 * Seeded synthetic review datasets used by the engine tests and to generate
 * the cross-runtime fixtures. Deterministic: same seed, same output.
 */
import type { Review } from '@signalyze/shared';
import type { DetectedLanguage } from '../text';

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

/** Natural sentences and stock-phrase texts in one language (or in scripts without a dictionary). */
export interface LanguagePool {
  /** Client-side language tag written into the reviews (null for the mixed-script pool). */
  language: string | null;
  /** What the engine's detection must return for every text of the pool. */
  detected: DetectedLanguage;
  positive: readonly string[];
  negative: readonly string[];
  stock: readonly string[];
}

/**
 * One pool per covered language plus one of scripts without a dictionary
 * (Thai, Hindi, Greek). Every text is detected as `detected`; that is
 * asserted by the tests, so the pools double as detection samples.
 */
export const MULTILINGUAL_POOLS: readonly LanguagePool[] = [
  {
    language: 'en',
    detected: 'en',
    positive: [
      'The pasta was fresh and the waiter was attentive without hovering.',
      'Cozy little place, the soup of the day was excellent and the prices are fair.',
    ],
    negative: [
      'The chicken was cold and the waiter was rude, never again.',
      'Dirty tables and slow service, very disappointing evening.',
    ],
    stock: [
      'Highly recommend, great service and friendly staff.',
      'Great place, excellent food, will definitely come back.',
    ],
  },
  {
    language: 'tr',
    detected: 'tr',
    positive: [
      'Çorba çok lezzetli ve garson çok ilgili, fiyatlar da uygun.',
      'Temiz ve keyifli bir yer, tatlılar taze ve porsiyonlar büyük.',
    ],
    negative: [
      'Tavuk soğuktu ve garson kaba davrandı, bir daha asla.',
      'Masalar kirli ve servis çok yavaş, hayal kırıklığı.',
    ],
    stock: [
      'Kesinlikle tavsiye ederim, çok güler yüzlü personel, çok teşekkürler.',
      'Harika bir yer, mükemmel hizmet, tekrar geleceğim.',
    ],
  },
  {
    language: 'de',
    detected: 'de',
    positive: [
      'Das Essen war sehr lecker und die Bedienung war aufmerksam und freundlich.',
      'Gemütliches Lokal mit fairen Preisen, der Kuchen war hervorragend.',
    ],
    negative: [
      'Das Schnitzel war kalt und der Kellner war unfreundlich, nie wieder.',
      'Schmutzige Tische und langsamer Service, sehr enttäuschend.',
    ],
    stock: [
      'Sehr zu empfehlen, sehr freundliches Personal, vielen Dank.',
      'Immer wieder gerne, sehr lecker und top Service.',
    ],
  },
  {
    language: 'es',
    detected: 'es',
    positive: [
      'La comida es muy buena y el trato es genial, volveremos.',
      'Un sitio acogedor con precios justos y postres deliciosos.',
    ],
    negative: [
      'El pollo estaba frío y el camarero fue grosero, nunca más.',
      'Mesas sucias y servicio lento, una decepción.',
    ],
    stock: [
      'Muy recomendable, excelente atención y muy amables.',
      'Todo perfecto, muy buen servicio, sin duda volveré.',
    ],
  },
  {
    language: 'fr',
    detected: 'fr',
    positive: [
      'Le service est très bon et la cuisine est délicieuse, nous reviendrons.',
      'Un endroit agréable avec des prix corrects et un personnel souriant.',
    ],
    negative: [
      'Le poulet était froid et le serveur était impoli, plus jamais.',
      'Tables sales et service lent, une soirée décevante.',
    ],
    stock: [
      'Je recommande, très bon accueil et service impeccable.',
      'Tout était parfait et le rapport qualité prix est au top, merci beaucoup.',
    ],
  },
  {
    language: 'it',
    detected: 'it',
    positive: [
      'Il servizio è ottimo e la cucina è deliziosa, ci torneremo.',
      'Un locale accogliente con prezzi giusti e un personale cortese.',
    ],
    negative: [
      'Il pollo era freddo e il cameriere era scortese, mai più.',
      'Tavoli sporchi e servizio lento, una serata deludente.',
    ],
    stock: [
      'Consigliatissimo, personale gentile e servizio eccellente, ci torneremo di sicuro.',
      'Tutto perfetto, ottimo rapporto qualità prezzo, grazie mille.',
    ],
  },
  {
    language: 'pt',
    detected: 'pt',
    positive: [
      'A comida é muito boa e o atendimento foi excelente, voltaremos.',
      'Um lugar aconchegante com preços justos e sobremesas deliciosas.',
    ],
    negative: [
      'O frango estava frio e o garçom foi grosseiro, nunca mais.',
      'Mesas sujas e serviço lento, uma noite decepcionante.',
    ],
    stock: [
      'Recomendo muito, atendimento excelente e equipe atenciosa.',
      'Tudo perfeito, muito bom, voltarei com certeza.',
    ],
  },
  {
    language: 'nl',
    detected: 'nl',
    positive: [
      'Het eten was heerlijk en de bediening was erg vriendelijk, we komen terug.',
      'Gezellige zaak met eerlijke prijzen en een lekker kopje koffie.',
    ],
    negative: [
      'De kip was koud en de ober was onbeschoft, nooit meer.',
      'Vieze tafels en trage bediening, erg teleurstellend.',
    ],
    stock: [
      'Een aanrader, vriendelijk personeel en uitstekende service.',
      'Heerlijk gegeten en helemaal top, we komen zeker terug.',
    ],
  },
  {
    language: 'pl',
    detected: 'pl',
    positive: [
      'Jedzenie było pyszne i obsługa bardzo miła, na pewno wrócimy.',
      'Klimatyczne miejsce z przystępnymi cenami i świetną kawą.',
    ],
    negative: [
      'Kurczak był zimny i kelner był niemiły, nigdy więcej.',
      'Brudne stoliki i wolna obsługa, bardzo rozczarowani.',
    ],
    stock: [
      'Polecam, miła obsługa i pyszne jedzenie.',
      'Wszystko super i świetne miejsce, na pewno wrócę.',
    ],
  },
  {
    language: 'ru',
    detected: 'ru',
    positive: [
      'Еда очень вкусная и официант приветливый, всё быстро и недорого.',
      'Уютный зал, очень вежливый персонал и отличный кофе.',
    ],
    negative: [
      'Курица была холодной и официант был грубым, больше никогда.',
      'Грязный стол и очень медленно обслуживают, разочарована.',
    ],
    stock: [
      'Рекомендую, приветливый персонал и отличное обслуживание.',
      'Всё было вкусно, обязательно вернёмся, спасибо большое.',
    ],
  },
  {
    language: 'uk',
    detected: 'uk',
    positive: [
      'Їжа була дуже смачна і офіціант був уважний, ціни приємні.',
      'Затишний зал, дуже ввічливий персонал і смачна кава.',
    ],
    negative: [
      'Курка була холодна і офіціант був грубий, більше ніколи.',
      'Брудний стіл і дуже повільно обслуговують, розчарована.',
    ],
    stock: [
      'Рекомендую, привітний персонал і чудове обслуговування.',
      "Все було смачно, обов'язково повернемось, дуже дякую.",
    ],
  },
  {
    language: 'ar',
    detected: 'ar',
    positive: [
      'الأكل لذيذ جدا والموظفين محترمين والأسعار مناسبة.',
      'مكان جميل وهادئ والقهوة ممتازة.',
    ],
    negative: [
      'الدجاج كان بارد والخدمة سيئة، لن أعود أبدا.',
      'الطاولات متسخة والخدمة بطيئة جدا، تجربة سيئة.',
    ],
    stock: ['أنصح به بشدة، خدمة ممتازة ومكان رائع.', 'أكل لذيذ وتعامل راقي، سأعود مرة أخرى.'],
  },
  {
    language: 'ja',
    detected: 'ja',
    positive: [
      '料理はとても美味しくて、店員さんの対応も丁寧でした。',
      '落ち着いた雰囲気で、コーヒーも絶品でした。',
    ],
    negative: [
      'チキンは冷めていて、店員の態度も悪い。二度と行きません。',
      'テーブルが汚くて、料理が出てくるのも遅い。がっかりしました。',
    ],
    stock: [
      'とても美味しかったです。また来たいです。',
      'おすすめです。店員さんが親切で、コスパ最高でした。',
    ],
  },
  {
    language: 'zh',
    detected: 'zh',
    positive: ['菜很新鲜，服务员也很热情，价格实惠。', '环境安静舒服，咖啡也很好喝。'],
    negative: ['鸡肉是凉的，服务员态度差，再也不来了。', '桌子很脏，上菜太慢，非常失望。'],
    stock: ['强烈推荐，服务很好，环境不错。', '很好吃，性价比很高，下次再来。'],
  },
  {
    language: 'ko',
    detected: 'ko',
    positive: [
      '음식이 정말 맛있고 직원분들이 친절하세요, 가격도 착해요.',
      '분위기가 조용하고 커피도 훌륭해요.',
    ],
    negative: [
      '치킨이 차갑고 직원이 불친절해요, 다시는 안 갑니다.',
      '테이블이 더럽고 음식이 너무 느려요, 실망했어요.',
    ],
    stock: [
      '강력 추천, 친절하고 맛있어요, 또 올게요.',
      '가성비 최고, 분위기 좋아요, 다시 오고 싶어요.',
    ],
  },
  {
    language: 'id',
    detected: 'id',
    positive: [
      'Makanannya enak dan pelayanannya sangat ramah, harganya juga murah.',
      'Tempatnya nyaman dan bersih, kopinya juga mantap.',
    ],
    negative: [
      'Ayamnya dingin dan pelayannya kasar, kapok saya.',
      'Meja kotor dan pelayanan lambat, sangat mengecewakan.',
    ],
    stock: [
      'Sangat recommended, pelayanan ramah dan makanannya enak.',
      'Puas banget, harga terjangkau, pasti balik lagi.',
    ],
  },
  {
    language: 'vi',
    detected: 'vi',
    positive: [
      'Đồ ăn rất ngon và nhân viên rất nhiệt tình, giá cũng hợp lý.',
      'Không gian yên tĩnh và sạch sẽ, cà phê cũng rất thơm.',
    ],
    negative: [
      'Gà bị nguội và nhân viên thì thô lỗ, không bao giờ quay lại.',
      'Bàn bẩn và phục vụ chậm, rất thất vọng.',
    ],
    stock: [
      'Rất đáng thử, nhân viên nhiệt tình và đồ ăn ngon.',
      'Rất hài lòng, giá cả hợp lý, sẽ quay lại.',
    ],
  },
  {
    language: 'sv',
    detected: 'sv',
    positive: [
      'Maten var god och personalen var mycket trevlig, vi kommer tillbaka.',
      'Mysigt ställe med bra priser och riktigt gott kaffe.',
    ],
    negative: [
      'Kycklingen var kall och servitören var otrevlig, aldrig mer.',
      'Smutsiga bord och långsam service, mycket besviken.',
    ],
    stock: [
      'Rekommenderas, trevlig personal och utmärkt service.',
      'Allt var perfekt, god mat, kommer gärna tillbaka.',
    ],
  },
  {
    language: null,
    detected: 'other',
    positive: [
      'อาหารอร่อยมาก พนักงานบริการดี',
      'खाना बहुत स्वादिष्ट था और स्टाफ बहुत अच्छा था',
      'Το φαγητό ήταν υπέροχο και το προσωπικό πολύ ευγενικό',
    ],
    negative: [
      'อาหารเย็นและพนักงานไม่สุภาพ ไม่กลับมาอีก',
      'खाना ठंडा था और सेवा बहुत धीमी थी',
      'Το κοτόπουλο ήταν κρύο και ο σερβιτόρος αγενής',
    ],
    stock: [
      'อาหารอร่อยมาก พนักงานบริการดี',
      'Το φαγητό ήταν υπέροχο και το προσωπικό πολύ ευγενικό',
    ],
  },
];

/**
 * Reviews cycling through every language pool: natural positive and negative
 * sentences, stock-phrase texts, and a tenth of 5-star ratings paired with a
 * negative text (exercises rating_text_mismatch in every language).
 */
export function multilingualDataset({ count, seed }: DatasetOptions): Review[] {
  const r = rng(seed);
  const out: Review[] = [];
  for (let i = 0; i < count; i += 1) {
    const pool = MULTILINGUAL_POOLS[i % MULTILINGUAL_POOLS.length]!;
    const mismatch = r.chance(0.1);
    const rating = mismatch ? 5 : r.pick([5, 5, 5, 4, 4, 3, 2, 1] as const);
    const text =
      mismatch || rating <= 2
        ? r.pick(pool.negative)
        : r.chance(0.4)
          ? r.pick(pool.stock)
          : r.pick(pool.positive);
    out.push(
      baseReview(r, {
        rating,
        date: isoDay(DAY_2026_06_01 - r.int(0, 900)),
        text,
        reviewerReviewCount: r.int(0, 60),
        photoCount: r.chance(0.3) ? r.int(1, 3) : 0,
        localGuideLevel: r.chance(0.3) ? r.int(1, 7) : null,
        ownerResponse: r.chance(0.15) ? ownerReply(r) : null,
        language: pool.language,
      }),
    );
  }
  return out;
}

/** A normal place with enough texts to trigger the text-similarity sampling cap. */
export function largeDataset({ count, seed }: DatasetOptions): Review[] {
  return normalDataset({ count: Math.max(count, 700), seed });
}

export const DATASETS = {
  normal: normalDataset,
  large: largeDataset,
  burst: burstDataset,
  polarized: polarizedDataset,
  template: templateDataset,
  small: smallDataset,
  sparse: sparseDataset,
  turkish: turkishDataset,
  multilingual: multilingualDataset,
} as const;

export type DatasetName = keyof typeof DATASETS;
