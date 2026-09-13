/**
 * The complete table of DOM rules the adapter relies on. Google's class names
 * are obfuscated and change without notice, so every rule here uses structure
 * and stable attributes only (roles, aria-*, data-review-id, data-photo-index,
 * contributor links). `checkLayout` runs every `required` rule as a self-test.
 */
import { parseRating, parseStarCount } from './numbers';

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

/** Words for "review(s)" in the supported UI languages, used for tab matching. */
export const REVIEW_WORDS =
  /(reviews?|yorum(lar)?|rezension(en)?|bewertung(en)?|rese(ñ|n)as?|opini(ó|o)n(es)?|valoraci(ó|o)n(es)?)/i;

/**
 * A review count: a number (with separators or a K/B/M style suffix) directly
 * followed by a review word, e.g. "1,240 reviews", "45 yorum", "1,2 B Rezensionen".
 * The number must come first so that "Reviewer 12" is not a count.
 */
export const REVIEW_COUNT_PATTERN = new RegExp(
  `(\\d[\\d.,\\s]*)\\s*(k|b|bin|m|mn|mil|mio\\.?|tsd\\.?)?\\s*${REVIEW_WORDS.source}`,
  'i',
);

/** A label or text that IS a review count, e.g. "1,240 reviews" or "(1,240 reviews)". */
const REVIEW_COUNT_ONLY = new RegExp(`^\\s*\\(?${REVIEW_COUNT_PATTERN.source}`, 'i');

/** Words for "star(s)" in the supported UI languages. */
const STAR_WORDS = /(stars?|yıldız|yildiz|sterne?|estrellas?)/i;

/**
 * Numbered photo tile labels ("Photo 1", "Fotoğraf 2", "Foto 3"). The number is
 * required so the reviewer avatar ("Photo of <name>") is not counted.
 */
const PHOTO_WORDS = /^(photo|fotoğraf|fotograf|foto)\s*\d/i;

/** Headings that introduce an owner reply. */
export const OWNER_RESPONSE_WORDS =
  /(response from the owner|owner'?s response|sahibinin yan(ı|i)t(ı|i)|sahibinden yan(ı|i)t|antwort vom inhaber|antwort des inhabers|respuesta del propietario|respuesta del due(ñ|n)o)/i;

/** "5/5" style textual ratings used for some categories instead of star icons. */
const FRACTION_RATING = /^\s*([1-5])\s*\/\s*5\s*$/;

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

function labelOf(el: Element): string {
  return `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`;
}

/** Outermost elements carrying data-review-id (buttons inside a review repeat the id). */
function reviewContainers(root: ParentNode): Element[] {
  return all(root, '[data-review-id]').filter(
    (el) => el.tagName !== 'BUTTON' && el.parentElement?.closest('[data-review-id]') === null,
  );
}

function isInsideOwnerResponse(el: Element, container: ParentNode): boolean {
  const block = ownerResponseBlock(container);
  return block !== null && block !== el && block.contains(el);
}

function ownerResponseBlock(container: ParentNode): Element | null {
  const heading = all(container, 'span, div').find((el) => OWNER_RESPONSE_WORDS.test(ownText(el)));
  if (!heading) return null;
  // Heading and date share a row; the reply text is a sibling of that row.
  const row = heading.parentElement;
  return row?.parentElement ?? row;
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
        return !REVIEW_COUNT_PATTERN.test(label) && parseRating(label) !== null;
      }),
  },
  {
    name: 'headerReviewCount',
    scope: 'document',
    required: false,
    reliesOn:
      'an element outside the review containers whose aria-label or own text starts with a review count such as "1,240 reviews" and names no star rating',
    find: (root) => {
      const isCount = (text: string): boolean =>
        REVIEW_COUNT_ONLY.test(text) && !STAR_WORDS.test(text);
      return all(root, '*').filter((el) => {
        if (el.closest('[data-review-id]') !== null || el.getAttribute('role') === 'tab') {
          return false;
        }
        return isCount(el.getAttribute('aria-label') ?? '') || isCount(ownText(el));
      });
    },
  },
  {
    name: 'reviewsTab',
    scope: 'document',
    required: true,
    reliesOn: 'button[role="tab"] whose aria-label or text contains the word "reviews"',
    find: (root) => all(root, 'button[role="tab"]').filter((el) => REVIEW_WORDS.test(labelOf(el))),
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
    reliesOn: '[role="img"] with an aria-label such as "5 stars" / "5 yıldız", or a "5/5" text',
    find: (container) => {
      const stars = all(container, '[role="img"][aria-label]').filter(
        (el) =>
          !isInsideOwnerResponse(el, container) &&
          parseStarCount(el.getAttribute('aria-label') ?? '') !== null,
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
      'text such as "Local Guide · 45 reviews · 12 photos" inside one of the contributor links',
    find: (container) =>
      (RULES_BY_NAME.reviewerLink?.find(container) ?? []).flatMap((link) =>
        all(link, '*').filter((el) => REVIEW_COUNT_PATTERN.test(ownText(el))),
      ),
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
      const body = all(container, '[lang]').find((el) => !isInsideOwnerResponse(el, container));
      if (body) {
        const firstSpan = Array.from(body.children).find((el) => el.tagName === 'SPAN');
        return [firstSpan ?? body];
      }
      const expand = all(container, 'button[aria-expanded]').find(
        (el) => !isInsideOwnerResponse(el, container),
      );
      const before = expand?.previousElementSibling;
      if (before && ownText(before).length > 0) return [before];
      const link = RULES_BY_NAME.reviewerLink?.find(container)[0] ?? null;
      const rating = RULES_BY_NAME.reviewRating?.find(container)[0] ?? null;
      const ratingRow = rating?.parentElement ?? null;
      const candidates = all(container, 'span').filter((el) => {
        if (el.closest('button') !== null) return false;
        if (link?.contains(el) || ratingRow?.contains(el)) return false;
        if (isInsideOwnerResponse(el, container)) return false;
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
      'button[data-photo-index] tiles (the last may read "+ N more photos"), otherwise buttons labelled "Photo N" / "Fotoğraf N"',
    find: (container) => {
      const indexed = all(container, 'button[data-photo-index]');
      if (indexed.length > 0) return indexed;
      return all(container, 'button[aria-label]').filter((el) =>
        PHOTO_WORDS.test(el.getAttribute('aria-label') ?? ''),
      );
    },
  },
  {
    name: 'ownerResponse',
    scope: 'review',
    required: false,
    reliesOn: 'a block whose heading reads "Response from the owner" (or its translation)',
    find: (container) => {
      const block = ownerResponseBlock(container);
      return block ? [block] : [];
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
