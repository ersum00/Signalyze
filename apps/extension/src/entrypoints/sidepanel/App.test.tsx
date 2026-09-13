/**
 * Smoke test for the side panel: renders the real App against the in-memory
 * browser, walks through the consent screen and checks that the home view
 * reacts to "no Google Maps tab" without runtime errors.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fakeBrowser } from 'wxt/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SETTINGS_KEY } from '@/lib/storage';
import { App } from './App';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function buttonsIn(node: Element): HTMLButtonElement[] {
  const found: HTMLButtonElement[] = [];
  for (const child of Array.from(node.children)) {
    if (child instanceof HTMLButtonElement) found.push(child);
    found.push(...buttonsIn(child));
  }
  return found;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

describe('App', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    fakeBrowser.reset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('shows the consent screen first and the home hint after a choice', async () => {
    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
    });
    await flush();
    expect(container.textContent).toContain('Before the first analysis');
    expect(container.textContent).toContain('What is never sent');

    const localOnly = buttonsIn(container).find((b) => b.textContent === 'Analyze locally only');
    expect(localOnly).toBeDefined();
    await act(async () => {
      localOnly!.click();
      await Promise.resolve();
    });
    await flush();

    const stored = (await fakeBrowser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] as {
      onboardingDone: boolean;
      sendToServer: boolean;
    };
    expect(stored.onboardingDone).toBe(true);
    expect(stored.sendToServer).toBe(false);
    expect(container.textContent).toContain('Signalyze');
    expect(container.textContent).toContain('Open a business on Google Maps');
  });

  it('records consent when sending is allowed', async () => {
    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
    });
    await flush();
    const allow = buttonsIn(container).find((b) => b.textContent === 'Allow sending');
    await act(async () => {
      allow!.click();
      await Promise.resolve();
    });
    await flush();
    const stored = (await fakeBrowser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] as {
      sendToServer: boolean;
      consentGivenAt: string | null;
    };
    expect(stored.sendToServer).toBe(true);
    expect(stored.consentGivenAt).not.toBeNull();
  });
});
