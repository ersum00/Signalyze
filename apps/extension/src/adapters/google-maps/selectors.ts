/**
 * The complete table of DOM rules the adapter relies on. Google's class names
 * are obfuscated and change without notice, so every rule here uses structure
 * and stable attributes only (roles, aria-*, data-review-id, data-photo-index,
 * contributor links). Localised UI strings (the Reviews tab, the owner-reply
 * heading, review nouns) come from the dictionaries below, each with a
 * structural fallback so an unlisted UI language degrades gracefully.
 * `checkLayout` runs every `required` rule as a self-test.
 */
import { isRelativeDate } from './dates';
import { COUNT_SUFFIX_SOURCE, parseRating, parseStarCount } from './numbers';
import { compileTerms, dictionaryTerms, foldText } from './text';

export type RuleScope = 'document' | 'review';

export interface SelectorRule {
  /** Stable name reported by checkLayout when a required rule finds nothing. */
  readonly name: string;
  /** Whether the rule is evaluated on the document or on a single review container. */
  readonly scope: RuleScope;
  /** Required rules must find at least one element for the layout to be supported. */
  readonly required: boolean;
  /** What the rule relies on, for maintainers. */
  readonly reliesOn: string;
  readonly find: (root: ParentNode) => Element[];
}

/** Label of the Reviews tab per Google Maps UI language (matched as a whole word, case-folded). */
export const REVIEWS_TAB_LABELS: Readonly<Record<string, readonly string[]>> = {
  en: ['Reviews'],
  tr: ['Yorumlar'],
  de: ['Rezensionen', 'Bewertungen'],
  es: ['Reseñas', 'Opiniones', 'Valoraciones'],
  fr: ['Avis'],
  it: ['Recensioni'],
  pt: ['Avaliações', 'Comentários'],
  nl: ['Reviews', 'Recensies', 'Beoordelingen'],
  pl: ['Opinie', 'Recenzje'],
  ru: ['Отзывы'],
  uk: ['Відгуки'],
  cs: ['Recenze'],
  sv: ['Recensioner'],
  da: ['Anmeldelser'],
  nb: ['Anmeldelser'],
  fi: ['Arvostelut', 'Arviot'],
  el: ['Κριτικές', 'Αξιολογήσεις'],
  hu: ['Vélemények', 'Értékelések'],
  ro: ['Recenzii'],
  id: ['Ulasan'],
  ms: ['Ulasan'],
  vi: ['Bài đánh giá', 'Đánh giá'],
  th: ['รีวิว'],
  ja: ['クチコミ', '口コミ', 'レビュー'],
  zh: ['评价', '评论', '評論', '評價'],
  ko: ['리뷰'],
  ar: ['المراجعات', 'التعليقات', 'مراجعات', 'التقييمات'],
  he: ['ביקורות'],
  hi: ['समीक्षाएं', 'समीक्षाएँ', 'समीक्षा'],
};

/** Inflected forms of "review" as they appear next to a count ("1,240 reviews", "45 yorum"). */
export const REVIEW_NOUNS: Readonly<Record<string, readonly string[]>> = {
  en: ['review', 'reviews'],
  tr: ['yorum'],
  de: ['Rezension', 'Rezensionen', 'Bewertung', 'Bewertungen'],
  es: ['reseña', 'reseñas', 'opinión', 'opiniones', 'valoración', 'valoraciones'],
  fr: ['avis'],
  it: ['recensione', 'recensioni'],
  pt: ['avaliação', 'avaliações', 'comentário', 'comentários'],
  nl: ['review', 'reviews', 'recensie', 'recensies', 'beoordeling', 'beoordelingen'],
  pl: ['opinia', 'opinie', 'opinii', 'recenzja', 'recenzje', 'recenzji'],
  ru: ['отзыв', 'отзыва', 'отзывов', 'отзывы'],
  uk: ['відгук', 'відгуки', 'відгуків'],
  cs: ['recenze', 'recenzí'],
  sv: ['recension', 'recensioner'],
  da: ['anmeldelse', 'anmeldelser'],
  nb: ['anmeldelse', 'anmeldelser'],
  fi: ['arvostelu', 'arvostelua', 'arvostelut', 'arvio', 'arviota'],
  el: ['κριτική', 'κριτικές', 'αξιολόγηση', 'αξιολογήσεις'],
  hu: ['vélemény', 'vélemények', 'értékelés', 'értékelések'],
  ro: ['recenzie', 'recenzii'],
  id: ['ulasan'],
  ms: ['ulasan'],
  vi: ['bài đánh giá', 'đánh giá'],
  th: ['รีวิว'],
  ja: ['クチコミ', '口コミ', 'レビュー'],
  zh: ['评价', '评论', '評論', '評價'],
  ko: ['리뷰'],
  ar: ['مراجعة', 'مراجعات', 'المراجعات', 'تعليق', 'تعليقات', 'التعليقات', 'تقييم', 'تقييمات'],
  he: ['ביקורת', 'ביקורות'],
  hi: ['समीक्षा', 'समीक्षाएं', 'समीक्षाएँ'],
};

/** Heading Google puts above an owner reply. */
export const OWNER_RESPONSE_HEADINGS: Readonly<Record<string, readonly string[]>> = {
  en: ['Response from the owner', "Owner's response", 'Response from owner'],
  tr: ['İşletme sahibinin yanıtı', 'İşletme sahibi yanıtı', 'İşletme sahibinden yanıt'],
  de: ['Antwort vom Inhaber', 'Antwort des Inhabers'],
  es: ['Respuesta del propietario', 'Respuesta del dueño'],
  fr: ['Réponse du propriétaire'],
  it: ['Risposta del proprietario'],
  pt: ['Resposta do proprietário', 'Resposta da empresa'],
  nl: ['Reactie van de eigenaar', 'Antwoord van de eigenaar'],
  pl: ['Odpowiedź właściciela'],
  ru: ['Ответ владельца'],
  uk: ['Відповідь власника'],
  cs: ['Odpověď majitele', 'Odpověď vlastníka'],
  sv: ['Svar från ägaren'],
  da: ['Svar fra ejeren'],
  nb: ['Svar fra eieren'],
  fi: ['Omistajan vastaus'],
  el: ['Απάντηση από τον ιδιοκτήτη', 'Απάντηση ιδιοκτήτη'],
  hu: ['A tulajdonos válasza', 'Tulajdonos válasza'],
  ro: ['Răspunsul proprietarului', 'Răspuns de la proprietar'],
  id: ['Tanggapan dari pemilik', 'Respons dari pemilik'],
  ms: ['Respons daripada pemilik', 'Maklum balas daripada pemilik'],
  vi: ['Phản hồi từ chủ sở hữu', 'Phản hồi của chủ sở hữu'],
  th: ['การตอบกลับจากเจ้าของ', 'คำตอบจากเจ้าของ'],
  ja: ['オーナーからの返信', 'オーナーの返信'],
  zh: ['业主回复', '业主的回复', '商家回覆', '店家回覆', '擁有者的回覆', '所有者回复'],
  ko: ['업체의 답변', '소유자의 답변', '사장님 답변'],
  ar: ['رد المالك', 'رد من المالك', 'ردّ المالك'],
  he: ['תגובת הבעלים', 'תגובה מהבעלים'],
  hi: ['मालिक का जवाब', 'मालिक की ओर से जवाब'],
};

/** The Local Guide badge text; Google keeps the English name in many languages. */
export const LOCAL_GUIDE_PHRASES: Readonly<Record<string, readonly string[]>> = {
  en: ['Local Guide'],
  tr: ['Yerel Rehber'],
  pl: ['Lokalny przewodnik'],
  ru: ['Местный эксперт'],
  uk: ['Місцевий експерт', 'Місцевий гід'],
  cs: ['Místní průvodce'],
  fi: ['Paikallisopas'],
  el: ['Τοπικός οδηγός'],
  hu: ['Helyi idegenvezető'],
  ro: ['Ghid local'],
  id: ['Pemandu Lokal'],
  ms: ['Pemandu Tempatan'],
  vi: ['Hướng dẫn viên địa phương'],
  th: ['ไกด์ท้องถิ่น'],
  ja: ['ローカルガイド'],
  zh: ['本地向导', '在地嚮導', '本地嚮導'],
  ko: ['지역 가이드'],
  ar: ['مرشد محلي', 'المرشد المحلي'],
  he: ['מדריך מקומי'],
  hi: ['स्थानीय गाइड'],
};

/** Label of the review sort control ("Sort reviews", "Yorumları sırala"). Google also sets data-value="Sort". */
export const SORT_BUTTON_LABELS: Readonly<Record<string, readonly string[]>> = {
  en: ['Sort'],
  tr: ['Sırala', 'Sıralama'],
  de: ['Sortieren'],
  es: ['Ordenar'],
  fr: ['Trier'],
  it: ['Ordina'],
  pt: ['Ordenar', 'Classificar'],
  nl: ['Sorteren'],
  pl: ['Sortuj'],
  ru: ['Сортировать', 'Сортировка'],
  uk: ['Сортувати', 'Сортування'],
  cs: ['Seřadit', 'Řadit'],
  sv: ['Sortera'],
  da: ['Sortér', 'Sorter'],
  nb: ['Sorter'],
  fi: ['Lajittele', 'Järjestä'],
  el: ['Ταξινόμηση'],
  hu: ['Rendezés'],
  ro: ['Sortează', 'Sortare'],
  id: ['Urutkan'],
  ms: ['Isih', 'Susun'],
  vi: ['Sắp xếp'],
  th: ['จัดเรียง', 'เรียง'],
  ja: ['並べ替え', '並び替え'],
  zh: ['排序'],
  ko: ['정렬'],
  ar: ['ترتيب', 'فرز'],
  he: ['מיון'],
  hi: ['क्रमबद्ध', 'क्रम से लगाएं'],
};

/** The "Newest" entry of the sort menu. Google's menu order is fixed: most relevant, newest, highest, lowest. */
export const NEWEST_LABELS: Readonly<Record<string, readonly string[]>> = {
  en: ['Newest'],
  tr: ['En yeni', 'En yeniler'],
  de: ['Neueste'],
  es: ['Más recientes', 'Más reciente'],
  fr: ['Plus récents', 'Les plus récents'],
  it: ['Più recenti'],
  pt: ['Mais recentes'],
  nl: ['Nieuwste'],
  pl: ['Najnowsze'],
  ru: ['Сначала новые', 'Новые'],
  uk: ['Спочатку нові', 'Найновіші'],
  cs: ['Nejnovější'],
  sv: ['Nyaste', 'Senaste'],
  da: ['Nyeste'],
  nb: ['Nyeste'],
  fi: ['Uusimmat'],
  el: ['Πιο πρόσφατες', 'Νεότερες'],
  hu: ['Legújabb'],
  ro: ['Cele mai recente', 'Cele mai noi'],
  id: ['Terbaru'],
  ms: ['Terbaru'],
  vi: ['Mới nhất'],
  th: ['ใหม่ล่าสุด', 'ล่าสุด'],
  ja: ['新しい順'],
  zh: ['最新', '最新的'],
  ko: ['최신순'],
  ar: ['الأحدث'],
  he: ['החדשות ביותר', 'הכי חדש'],
  hi: ['सबसे नए', 'नवीनतम'],
};

/** Words for "star(s)"; used to keep star labels out of the review-count rule. */
const STAR_WORDS: Readonly<Record<string, readonly string[]>> = {
  en: ['star', 'stars'],
  tr: ['yıldız'],
  de: ['Stern', 'Sterne', 'Sternen'],
  es: ['estrella', 'estrellas'],
  fr: ['étoile', 'étoiles'],
  it: ['stella', 'stelle'],
  pt: ['estrela', 'estrelas'],
  nl: ['ster', 'sterren'],
  pl: ['gwiazdka', 'gwiazdki', 'gwiazdek', 'gwiazd'],
  ru: ['звезда', 'звезды', 'звёзд', 'звезд'],
  uk: ['зірка', 'зірки', 'зірок'],
  cs: ['hvězda', 'hvězdy', 'hvězd', 'hvězdičky', 'hvězdiček'],
  sv: ['stjärna', 'stjärnor'],
  da: ['stjerne', 'stjerner'],
  nb: ['stjerne', 'stjerner'],
  fi: ['tähti', 'tähteä', 'tähden'],
  el: ['αστέρι', 'αστέρια'],
  hu: ['csillag'],
  ro: ['stea', 'stele'],
  id: ['bintang'],
  ms: ['bintang'],
  vi: ['sao'],
  th: ['ดาว'],
  ja: ['つ星', '星'],
  zh: ['星', '顆星', '颗星'],
  ko: ['별표', '별'],
  ar: ['نجمة', 'نجوم', 'نجمتين', 'نجمتان'],
  he: ['כוכב', 'כוכבים'],
  hi: ['स्टार', 'तारे', 'तारा'],
};

/** Words for "photo" in numbered tile labels ("Photo 1", "Fotoğraf 2", "写真 3"). */
const PHOTO_WORDS: readonly string[] = [
  'photo',
  'photographie',
  'fotoğraf',
  'fotograf',
  'foto',
  'fotografía',
  'fotografia',
  'fotografie',
  'afbeelding',
  'zdjęcie',
  'фото',
  'фотография',
  'фотографія',
  'світлина',
  'fotka',
  'bild',
  'kuva',
  'φωτογραφία',
  'fénykép',
  'kép',
  'ảnh',
  'hình ảnh',
  'รูปภาพ',
  'รูป',
  '写真',
  '照片',
  '相片',
  '图片',
  '圖片',
  '사진',
  'صورة',
  'תמונה',
  'फ़ोटो',
  'फोटो',
];

const TAB_LABEL_REGEX = compileTerms(dictionaryTerms(REVIEWS_TAB_LABELS));
export const REVIEW_WORDS = compileTerms([
  ...dictionaryTerms(REVIEW_NOUNS),
  ...dictionaryTerms(REVIEWS_TAB_LABELS),
]);
const OWNER_HEADING_REGEX = compileTerms(dictionaryTerms(OWNER_RESPONSE_HEADINGS));
const SORT_LABEL_REGEX = compileTerms(dictionaryTerms(SORT_BUTTON_LABELS));
const NEWEST_LABEL_REGEX = compileTerms(dictionaryTerms(NEWEST_LABELS));
export const LOCAL_GUIDE_REGEX = compileTerms(dictionaryTerms(LOCAL_GUIDE_PHRASES));
const STAR_WORD_REGEX = compileTerms(dictionaryTerms(STAR_WORDS));
const PHOTO_TILE_REGEX = new RegExp(`^\\s*${compileTerms(PHOTO_WORDS).source}\\s*\\d`, 'u');

/** A displayed number with any separators, e.g. "1,240", "1 240", "1.2". */
const NUMBER = "\\d[\\d.,'\\s]*";
/** A count suffix that may sit between the number and the review noun ("1,2 B yorum"). */
const SUFFIX = `${COUNT_SUFFIX_SOURCE}?`;
/** Counters and particles between the number and the noun: "7.424 de recenzii", "7,424 件のクチコミ", "7,424 条评价". */
const BRIDGE = '(?:de\\s+|件\\s*の?\\s*|条|條|則|篇|개의?\\s*)?';

/**
 * A review count: a number followed by a review noun ("1,240 reviews",
 * "45 yorum", "1,2 B Rezensionen", "7,424 件のクチコミ"), or a review noun
 * followed by a number where the language puts the noun first
 * ("리뷰 7,424개", "รีวิว 7,424 รายการ"). Test it against foldText() output.
 * "Reviewer 12" is not a count because the noun must be a whole word.
 */
export const REVIEW_COUNT_PATTERN = new RegExp(
  `(?:(${NUMBER})\\s*${SUFFIX}\\s*${BRIDGE}${REVIEW_WORDS.source}|${REVIEW_WORDS.source}\\s*[:：]?\\s*\\(?\\s*(${NUMBER}))`,
  'u',
);

/** A label or text that IS a review count, e.g. "1,240 reviews" or "(1,240 reviews)". */
const REVIEW_COUNT_ONLY = new RegExp(`^\\s*\\(?${REVIEW_COUNT_PATTERN.source}`, 'u');

/** "5/5" style textual ratings used for some categories instead of star icons. */
const FRACTION_RATING = /^\s*([1-5])\s*\/\s*5\s*$/;

/** Longest text accepted as the date line or the heading of an owner reply found structurally. */
const MAX_OWNER_LINE_CHARS = 80;

function all(root: ParentNode, selector: string): Element[] {
  return Array.from(root.querySelectorAll(selector));
}

export function mainPanelOf(root: ParentNode): ParentNode {
  return root.querySelector('div[role="main"]') ?? root;
}

/** Own text of an element: text nodes directly under it, joined. */
export function ownText(el: Element): string {
  let text = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === node.TEXT_NODE) text += node.textContent ?? '';
  }
  return text.replace(/\s+/g, ' ').trim();
}

/** Whether a displayed text names a review count in any supported language. */
export function isReviewCount(text: string): boolean {
  return REVIEW_COUNT_PATTERN.test(foldText(text));
}

/** Outermost elements carrying data-review-id (buttons inside a review repeat the id). */
function reviewContainers(root: ParentNode): Element[] {
  return all(root, '[data-review-id]').filter(
    (el) => el.tagName !== 'BUTTON' && el.parentElement?.closest('[data-review-id]') === null,
  );
}

function panelTabs(root: ParentNode): Element[] {
  return all(root, 'button[role="tab"]');
}

/**
 * Tabs whose visible text carries the Reviews label in a known language; when
 * none does, tabs whose aria-label carries it. Text comes first so a business
 * name that happens to contain a review word does not turn every tab into a
 * candidate.
 */
export function labelledReviewsTabs(root: ParentNode): Element[] {
  const tabs = panelTabs(root);
  const byText = tabs.filter((el) => TAB_LABEL_REGEX.test(foldText(el.textContent ?? '')));
  if (byText.length > 0) return byText;
  return tabs.filter((el) => TAB_LABEL_REGEX.test(foldText(el.getAttribute('aria-label') ?? '')));
}

/** The selected tab while review containers are rendered: the tab the probing in panel.ts settled on. */
function selectedTabWithReviews(root: ParentNode): Element[] {
  if (reviewContainers(mainPanelOf(root)).length === 0) return [];
  return panelTabs(root).filter((el) => el.getAttribute('aria-selected') === 'true');
}

function firstStarElement(container: ParentNode): Element | null {
  return (
    all(container, '[role="img"][aria-label]').find(
      (el) => parseStarCount(el.getAttribute('aria-label') ?? '') !== null,
    ) ?? null
  );
}

export interface OwnerResponseParts {
  /** The block holding the heading row and the reply text. */
  block: Element;
  /** The row with the heading and the reply date; everything else in the block is the reply. */
  headingRow: Element;
}

/** Owner reply located by its localised heading. */
function ownerResponseByHeading(container: ParentNode): OwnerResponseParts | null {
  const heading = all(container, 'span, div').find((el) =>
    OWNER_HEADING_REGEX.test(foldText(ownText(el))),
  );
  const row = heading?.parentElement;
  if (!heading || !row) return null;
  // Heading and date share a row; the reply text is a sibling of that row.
  const block = row.parentElement ?? row;
  if (block === container) return null;
  const star = firstStarElement(container);
  const body = all(container, '[lang]')[0];
  if ((star && block.contains(star)) || (body && block.contains(body))) return null;
  return { block, headingRow: row === block ? heading : row };
}

/**
 * Language-independent fallback: after the review body, a block whose first
 * row holds exactly two short lines, one of them a relative date and the other
 * a heading without digits, followed by a text body. The review's own rating
 * row and body block are excluded, so an unlisted heading language still
 * yields the reply and never the review text.
 */
function ownerResponseByStructure(container: ParentNode): OwnerResponseParts | null {
  const star = firstStarElement(container);
  const body = all(container, '[lang]')[0];
  if (!star || !body) return null;
  for (const block of all(container, 'div')) {
    if (block.contains(star) || block.contains(body) || body.contains(block)) continue;
    if (!(body.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (block.closest('button') !== null || block.children.length < 2) continue;
    const headingRow = block.firstElementChild;
    if (!headingRow) continue;
    const lines = all(headingRow, '*')
      .map((el) => ownText(el))
      .filter((text) => text.length > 0 && text.length <= MAX_OWNER_LINE_CHARS);
    if (lines.length !== 2) continue;
    const dated = lines.filter((line) => isRelativeDate(line));
    const heading = lines.find((line) => !dated.includes(line));
    if (dated.length !== 1 || heading === undefined || /\d/.test(heading)) continue;
    const text = Array.from(block.children)
      .slice(1)
      .map((child) => (child.textContent ?? '').trim())
      .join('');
    if (text.length === 0) continue;
    return { block, headingRow };
  }
  return null;
}

/** The owner reply block of a review container, by heading dictionary first, then by structure. */
interface OwnerResponseCacheEntry {
  fingerprint: string;
  parts: OwnerResponseParts | null;
}

/**
 * Several rules ask for the owner reply of the same container in one read
 * round, and the list is re-read after every scroll; the answer is cached per
 * container and recomputed only when its element count or text length changes
 * (a "More" expansion, a reply rendered late).
 */
const ownerResponseCache = new WeakMap<ParentNode, OwnerResponseCacheEntry>();

function fingerprintOf(container: ParentNode): string {
  return `${container.querySelectorAll('*').length}:${(container.textContent ?? '').length}`;
}

export function findOwnerResponse(container: ParentNode): OwnerResponseParts | null {
  const fingerprint = fingerprintOf(container);
  const cached = ownerResponseCache.get(container);
  if (cached?.fingerprint === fingerprint) return cached.parts;
  const parts = ownerResponseByHeading(container) ?? ownerResponseByStructure(container);
  ownerResponseCache.set(container, { fingerprint, parts });
  return parts;
}

function outside(el: Element, block: Element | null): boolean {
  return block === null || (block !== el && !block.contains(el));
}

export const RULES: readonly SelectorRule[] = [
  {
    name: 'mainPanel',
    scope: 'document',
    required: true,
    reliesOn: 'div[role="main"] wrapping the place panel',
    find: (root) => all(root, 'div[role="main"]'),
  },
  {
    name: 'placeName',
    scope: 'document',
    required: true,
    reliesOn:
      'the h1 of the place header (rendered inside or above the main panel); when the reviews page hides it, the aria-label of div[role="main"]',
    find: (root) => {
      const headings = all(root, 'h1').filter((el) => (el.textContent ?? '').trim().length > 0);
      if (headings.length > 0) return headings;
      return all(root, 'div[role="main"][aria-label]').filter(
        (el) => (el.getAttribute('aria-label') ?? '').trim().length > 0,
      );
    },
  },
  {
    name: 'headerRating',
    scope: 'document',
    required: false,
    reliesOn:
      'a [role="img"] outside the review containers labelled like "4.4 stars"; labels that also carry a review count (per-star distribution rows, nearby places) are ignored',
    find: (root) =>
      all(root, '[role="img"][aria-label]').filter((el) => {
        if (el.closest('[data-review-id]') !== null) return false;
        const label = el.getAttribute('aria-label') ?? '';
        return !isReviewCount(label) && parseRating(label) !== null;
      }),
  },
  {
    name: 'headerReviewCount',
    scope: 'document',
    required: false,
    reliesOn:
      'an element outside the review containers whose aria-label or own text starts with a review count such as "1,240 reviews" (or "리뷰 1,240개") and names no star rating',
    find: (root) => {
      const isCount = (text: string): boolean => {
        const folded = foldText(text);
        return REVIEW_COUNT_ONLY.test(folded) && !STAR_WORD_REGEX.test(folded);
      };
      return all(root, '*').filter((el) => {
        if (el.closest('[data-review-id]') !== null || el.getAttribute('role') === 'tab') {
          return false;
        }
        return isCount(el.getAttribute('aria-label') ?? '') || isCount(ownText(el));
      });
    },
  },
  {
    name: 'panelTabs',
    scope: 'document',
    required: false,
    reliesOn:
      'button[role="tab"] elements of the place panel, in document order (probed when no label is recognised)',
    find: (root) => panelTabs(root),
  },
  {
    name: 'reviewsTab',
    scope: 'document',
    required: true,
    reliesOn:
      'button[role="tab"] whose text or aria-label carries the Reviews label in a known UI language; otherwise the selected tab while review containers are rendered',
    find: (root) => {
      const labelled = labelledReviewsTabs(root);
      return labelled.length > 0 ? labelled : selectedTabWithReviews(root);
    },
  },
  {
    name: 'sortButton',
    scope: 'document',
    required: false,
    reliesOn:
      'button[aria-haspopup] in the main panel outside the review containers: data-value="Sort", else a label with a "sort" word in a known UI language, else the last such button before the first review container',
    find: (root) => {
      const main = mainPanelOf(root);
      const first = reviewContainers(main)[0] ?? null;
      const candidates = all(main, 'button[aria-haspopup]').filter(
        (el) => el.closest('[data-review-id]') === null,
      );
      const byValue = candidates.filter((el) => el.getAttribute('data-value') === 'Sort');
      if (byValue.length > 0) return byValue;
      const byLabel = candidates.filter((el) =>
        SORT_LABEL_REGEX.test(
          foldText(`${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`),
        ),
      );
      if (byLabel.length > 0) return byLabel;
      const before = candidates.filter(
        (el) =>
          first === null ||
          (el.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      );
      const last = before[before.length - 1];
      return last === undefined ? [] : [last];
    },
  },
  {
    name: 'sortMenuNewest',
    scope: 'document',
    required: false,
    reliesOn:
      "inside [role=menu], the [role=menuitemradio] whose text carries a 'newest' word in a known UI language; else the second item (Google's fixed order: most relevant, newest, highest, lowest)",
    find: (root) => {
      const items = all(
        root,
        '[role="menu"] [role="menuitemradio"], [role="menu"] [role="menuitem"]',
      );
      const byLabel = items.find((el) => NEWEST_LABEL_REGEX.test(foldText(el.textContent ?? '')));
      if (byLabel !== undefined) return [byLabel];
      const second = items[1];
      return items.length >= 2 && second !== undefined ? [second] : [];
    },
  },
  {
    name: 'reviewContainer',
    scope: 'document',
    required: true,
    reliesOn: 'outermost non-button elements with a data-review-id attribute',
    find: (root) => reviewContainers(mainPanelOf(root)),
  },
  {
    name: 'loadingIndicator',
    scope: 'document',
    required: false,
    reliesOn:
      '[role="progressbar"] or [aria-busy="true"] in the main panel while more reviews load',
    find: (root) => all(mainPanelOf(root), '[role="progressbar"], [aria-busy="true"]'),
  },
  {
    name: 'reviewRating',
    scope: 'review',
    required: true,
    reliesOn:
      '[role="img"] with an aria-label such as "5 stars" / "5 yıldız" / "별표 5개", or a "5/5" text',
    find: (container) => {
      const owner = findOwnerResponse(container)?.block ?? null;
      const stars = all(container, '[role="img"][aria-label]').filter(
        (el) => outside(el, owner) && parseStarCount(el.getAttribute('aria-label') ?? '') !== null,
      );
      if (stars.length > 0) return stars;
      return all(container, 'span').filter((el) => FRACTION_RATING.test(ownText(el)));
    },
  },
  {
    name: 'reviewDate',
    scope: 'review',
    required: true,
    reliesOn: 'the text next to the rating element (same row), e.g. "2 weeks ago"',
    find: (container) => {
      const rating = RULES_BY_NAME.reviewRating?.find(container)[0];
      const row = rating?.parentElement;
      if (!row) return [];
      const siblings = Array.from(row.children).filter(
        (el) => el !== rating && ownText(el).length > 0,
      );
      return siblings.length > 0 ? siblings : [];
    },
  },
  {
    name: 'reviewerLink',
    scope: 'review',
    required: true,
    reliesOn: 'an element with data-href or href pointing to /maps/contrib/<id>',
    find: (container) => all(container, '[data-href*="/maps/contrib/"], a[href*="/maps/contrib/"]'),
  },
  {
    name: 'reviewerStats',
    scope: 'review',
    required: false,
    reliesOn:
      'inside a contributor link, the line with a review count or Local Guide badge ("Local Guide · 45 reviews · 12 photos"); in an unlisted language, any numbered line after the first text line',
    find: (container) =>
      (RULES_BY_NAME.reviewerLink?.find(container) ?? []).flatMap((link) => {
        const texts = all(link, '*').filter((el) => ownText(el).length > 0);
        const numbered = texts.filter((el) => /\d/.test(foldText(ownText(el))));
        const known = numbered.filter((el) => {
          const text = foldText(ownText(el));
          return REVIEW_COUNT_PATTERN.test(text) || LOCAL_GUIDE_REGEX.test(text);
        });
        return known.length > 0 ? known : numbered.filter((el) => el !== texts[0]);
      }),
  },
  {
    name: 'reviewExpandButton',
    scope: 'review',
    required: false,
    reliesOn: 'button[aria-expanded="false"] that reveals the truncated text ("More")',
    find: (container) => all(container, 'button[aria-expanded="false"]'),
  },
  {
    name: 'reviewText',
    scope: 'review',
    required: false,
    reliesOn:
      'the review body block carrying a lang attribute (its first span holds the text); otherwise the span before a button[aria-expanded]; otherwise the longest text span outside the reviewer link, rating row and owner reply',
    find: (container) => {
      const owner = findOwnerResponse(container)?.block ?? null;
      const body = all(container, '[lang]').find((el) => outside(el, owner));
      if (body) {
        const firstSpan = Array.from(body.children).find((el) => el.tagName === 'SPAN');
        return [firstSpan ?? body];
      }
      const expand = all(container, 'button[aria-expanded]').find((el) => outside(el, owner));
      const before = expand?.previousElementSibling;
      if (before && ownText(before).length > 0) return [before];
      const link = RULES_BY_NAME.reviewerLink?.find(container)[0] ?? null;
      const rating = RULES_BY_NAME.reviewRating?.find(container)[0] ?? null;
      const ratingRow = rating?.parentElement ?? null;
      const candidates = all(container, 'span').filter((el) => {
        if (el.closest('button') !== null) return false;
        if (link?.contains(el) || ratingRow?.contains(el)) return false;
        if (!outside(el, owner)) return false;
        return ownText(el).length > 0;
      });
      candidates.sort((a, b) => ownText(b).length - ownText(a).length);
      return candidates.slice(0, 1);
    },
  },
  {
    name: 'reviewPhotos',
    scope: 'review',
    required: false,
    reliesOn:
      'button[data-photo-index] tiles (the last may read "+ N more photos"), otherwise buttons labelled "Photo N" / "Fotoğraf N" / "写真 N"',
    find: (container) => {
      const indexed = all(container, 'button[data-photo-index]');
      if (indexed.length > 0) return indexed;
      return all(container, 'button[aria-label]').filter((el) =>
        PHOTO_TILE_REGEX.test(foldText(el.getAttribute('aria-label') ?? '')),
      );
    },
  },
  {
    name: 'ownerResponse',
    scope: 'review',
    required: false,
    reliesOn:
      'a block whose heading reads "Response from the owner" (or its translation); otherwise a block after the review body whose first row holds a relative date and a short heading',
    find: (container) => {
      const parts = findOwnerResponse(container);
      return parts ? [parts.block] : [];
    },
  },
];

export const RULES_BY_NAME: Partial<Record<string, SelectorRule>> = Object.fromEntries(
  RULES.map((rule) => [rule.name, rule]),
);

export function rule(name: string): SelectorRule {
  const found = RULES_BY_NAME[name];
  if (!found) throw new Error(`Unknown selector rule: ${name}`);
  return found;
}

export type LayoutCheck = { ok: true } | { ok: false; missing: string[] };

/**
 * Self-test: runs every required rule. Document rules run on `doc`; review
 * rules run on the first review containers found. Callers must show a
 * "layout changed" state instead of numbers when `ok` is false.
 */
export function checkLayout(doc: Document): LayoutCheck {
  const missing: string[] = [];
  const containers = rule('reviewContainer').find(doc).slice(0, 5);
  for (const item of RULES) {
    if (!item.required) continue;
    if (item.scope === 'document') {
      if (item.find(doc).length === 0) missing.push(item.name);
      continue;
    }
    // A review rule passes when it matches at least one of the first containers;
    // without any container every review rule is reported as missing.
    if (!containers.some((container) => item.find(container).length > 0)) missing.push(item.name);
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
