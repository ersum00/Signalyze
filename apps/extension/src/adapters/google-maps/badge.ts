/**
 * The on-page badge: a small pill under the business name showing the
 * Signalyze state (idle, loading, score, "n/a"). It lives in a closed shadow
 * root with inline styles so Google's stylesheets and ours never interact,
 * and it is the only element the extension adds to the page.
 */
import { rule } from './selectors';

export type BadgeStatus =
  { state: 'idle' | 'loading' | 'insufficient' | 'unsupported' } | { state: 'done'; score: number };

export interface BadgeLabels {
  /** Product name shown in every state. */
  brand: string;
  /** Accessible name of the pill. */
  title: string;
  /** Accessible status while reviews are being read. */
  loading: string;
  /** Text for the insufficient-data state. */
  insufficient: string;
}

export interface BadgeOptions {
  onClick: () => void;
  labels: BadgeLabels;
  initial?: BadgeStatus;
}

export interface BadgeHandle {
  readonly host: HTMLElement;
  update(status: BadgeStatus): void;
  /** Visible text of the pill, for tests and diagnostics. */
  text(): string;
  unmount(): void;
}

export const BADGE_HOST_ATTRIBUTE = 'data-signalyze-badge';
const REMOUNT_DEBOUNCE_MS = 300;

const STYLE = `
:host { display: inline-block; margin: 6px 0 0; line-height: 0; }
:host([hidden]) { display: none; }
.pill {
  all: initial;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 10px 0 8px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font: 600 12px/1 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: 0.01em;
  cursor: pointer;
  user-select: none;
}
.pill:hover { border-color: #2563eb; color: #1e40af; }
.pill:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; flex: none; box-sizing: border-box; }
.brand { font-weight: 600; }
.value { font-variant-numeric: tabular-nums; font-weight: 700; }
.value:empty { display: none; }
.pill[data-state='done'] { border-color: #2563eb; background: #eef6ff; color: #1e40af; }
.pill[data-state='done'] .dot { background: #2563eb; }
.pill[data-state='insufficient'] .value { font-weight: 500; color: #64748b; }
.pill[data-state='loading'] .dot {
  width: 10px; height: 10px; background: transparent;
  border: 2px solid #d9eaff; border-top-color: #2563eb;
  animation: signalyze-spin 0.8s linear infinite;
}
@keyframes signalyze-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .pill[data-state='loading'] .dot { animation: none; } }
`;

function findHeader(doc: Document): Element | null {
  return rule('placeName').find(doc)[0] ?? null;
}

/**
 * Inserts the badge right after the place name. Returns null when the header
 * is not rendered yet; callers may retry later.
 */
export function mountBadge(doc: Document, options: BadgeOptions): BadgeHandle | null {
  const header = findHeader(doc);
  if (!header) return null;

  let status: BadgeStatus = options.initial ?? { state: 'idle' };

  const host = doc.createElement('span');
  host.setAttribute(BADGE_HOST_ATTRIBUTE, '');
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = doc.createElement('style');
  style.textContent = STYLE;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'pill';
  button.title = options.labels.title;
  const dot = doc.createElement('span');
  dot.className = 'dot';
  const brand = doc.createElement('span');
  brand.className = 'brand';
  brand.textContent = options.labels.brand;
  const value = doc.createElement('span');
  value.className = 'value';
  button.append(dot, brand, value);
  shadow.append(style, button);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    options.onClick();
  });

  const render = (): void => {
    button.dataset.state = status.state;
    const hidden = status.state === 'unsupported';
    host.hidden = hidden;
    host.style.display = hidden ? 'none' : '';
    switch (status.state) {
      case 'done':
        value.textContent = String(Math.round(status.score));
        break;
      case 'insufficient':
        value.textContent = options.labels.insufficient;
        break;
      default:
        value.textContent = '';
    }
    const shown = value.textContent ?? '';
    const suffix = status.state === 'loading' ? options.labels.loading : shown;
    button.setAttribute(
      'aria-label',
      suffix === '' ? options.labels.title : `${options.labels.title}: ${suffix}`,
    );
    button.setAttribute('aria-busy', status.state === 'loading' ? 'true' : 'false');
  };

  const place = (target: Element): void => {
    target.insertAdjacentElement('afterend', host);
  };
  place(header);
  render();

  // Google re-renders the header on SPA navigation; put the badge back when
  // that happens, debounced so a burst of mutations costs one lookup.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      const next = findHeader(doc);
      if (next && (!host.isConnected || host.previousElementSibling !== next)) place(next);
    }, REMOUNT_DEBOUNCE_MS);
  });
  const main = rule('mainPanel').find(doc)[0];
  observer.observe(main?.parentElement ?? doc.body, { childList: true, subtree: true });

  return {
    host,
    update(next) {
      status = next;
      render();
    },
    text() {
      return `${brand.textContent ?? ''} ${value.textContent ?? ''}`.trim();
    },
    unmount() {
      observer.disconnect();
      if (timer !== null) clearTimeout(timer);
      host.remove();
    },
  };
}
