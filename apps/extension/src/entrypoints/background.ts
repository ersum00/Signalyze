/**
 * Service worker. Three duties only: let the toolbar icon toggle the side
 * panel, open the side panel when the on-page badge is clicked, and mark
 * the consent screen as pending on first install.
 */
import { browser } from 'wxt/browser';
import { isRuntimeMessage } from '@/lib/messages';
import { saveSettings } from '@/lib/storage';

function ignore(): void {
  // Best effort; the APIs involved are not critical.
}

export default defineBackground(() => {
  try {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(ignore);
  } catch {
    // sidePanel API unavailable in this browser.
  }

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      // The side panel shows the consent screen first while onboardingDone is false.
      saveSettings({ onboardingDone: false }).catch(ignore);
    }
  });

  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isRuntimeMessage(message) || message.type !== 'OPEN_SIDE_PANEL') return false;
    const tabId = sender.tab?.id;
    if (tabId !== undefined) {
      try {
        // Kept synchronous on purpose: sidePanel.open must run inside the
        // user-gesture window that started with the badge click.
        browser.sidePanel.open({ tabId }).catch(ignore);
      } catch {
        // sidePanel API unavailable in this browser.
      }
    }
    sendResponse({ ok: tabId !== undefined });
    return false;
  });
});
