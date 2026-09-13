import { describe, expect, it, vi } from 'vitest';
import { BADGE_HOST_ATTRIBUTE, mountBadge, type BadgeLabels } from './badge';

const LABELS: BadgeLabels = {
  brand: 'Signalyze',
  title: 'Open the Signalyze Review Profile',
  loading: 'Reading reviews',
  insufficient: 'n/a',
};

const PAGE = `
  <div role="main" aria-label="Harbour Street Bakery">
    <div class="header"><h1>Harbour Street Bakery</h1><div>4.4</div></div>
    <div role="tablist"><button role="tab" aria-selected="true">Reviews</button></div>
  </div>`;

function load(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('mountBadge', () => {
  it('inserts a host right after the place name showing the product name', () => {
    const doc = load(PAGE);
    const handle = mountBadge(doc, { onClick: vi.fn(), labels: LABELS });
    expect(handle).not.toBeNull();
    const h1 = doc.querySelector('h1')!;
    expect(h1.nextElementSibling).toBe(handle!.host);
    expect(handle!.host.hasAttribute(BADGE_HOST_ATTRIBUTE)).toBe(true);
    expect(handle!.text()).toBe('Signalyze');
    // Closed shadow root: nothing is reachable from the page.
    expect(handle!.host.shadowRoot).toBeNull();
    handle!.unmount();
  });

  it('returns null when the header is not rendered', () => {
    const doc = load('<div role="main"><p>loading</p></div>');
    expect(mountBadge(doc, { onClick: vi.fn(), labels: LABELS })).toBeNull();
  });

  it('update() changes the visible text per state', () => {
    const doc = load(PAGE);
    const handle = mountBadge(doc, { onClick: vi.fn(), labels: LABELS })!;
    handle.update({ state: 'done', score: 41.6 });
    expect(handle.text()).toBe('Signalyze 42');
    expect(handle.host.hidden).toBe(false);
    handle.update({ state: 'insufficient' });
    expect(handle.text()).toBe('Signalyze n/a');
    handle.update({ state: 'loading' });
    expect(handle.text()).toBe('Signalyze');
    handle.update({ state: 'unsupported' });
    expect(handle.host.hidden).toBe(true);
    handle.update({ state: 'idle' });
    expect(handle.host.hidden).toBe(false);
    expect(handle.text()).toBe('Signalyze');
    handle.unmount();
  });

  it('starts from the initial status when given', () => {
    const doc = load(PAGE);
    const handle = mountBadge(doc, {
      onClick: vi.fn(),
      labels: LABELS,
      initial: { state: 'done', score: 17 },
    })!;
    expect(handle.text()).toBe('Signalyze 17');
    handle.unmount();
  });

  it('unmount() removes the host', () => {
    const doc = load(PAGE);
    const handle = mountBadge(doc, { onClick: vi.fn(), labels: LABELS })!;
    expect(doc.querySelector(`[${BADGE_HOST_ATTRIBUTE}]`)).not.toBeNull();
    handle.unmount();
    expect(doc.querySelector(`[${BADGE_HOST_ATTRIBUTE}]`)).toBeNull();
  });

  it('re-mounts after the header node is replaced', async () => {
    const doc = load(PAGE);
    const handle = mountBadge(doc, { onClick: vi.fn(), labels: LABELS })!;
    handle.update({ state: 'done', score: 63 });
    const main = doc.querySelector('div[role="main"]')!;
    main.querySelector('.header')!.remove();
    expect(handle.host.isConnected).toBe(false);
    const replacement = doc.createElement('div');
    replacement.innerHTML = '<h1>Harbour Street Bakery</h1>';
    main.prepend(replacement);
    await wait(400);
    expect(handle.host.isConnected).toBe(true);
    expect(doc.querySelector('h1')!.nextElementSibling).toBe(handle.host);
    expect(handle.text()).toBe('Signalyze 63');
    handle.unmount();
  });
});
