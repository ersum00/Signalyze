/**
 * Active-tab helpers for the side panel. `tabs.query` needs no `tabs`
 * permission; `tab.url` is readable for Google Maps tabs thanks to the host
 * permissions in the manifest.
 */
import { browser, type Browser } from 'wxt/browser';

/** www.google.<tld>/maps/... or maps.google.<tld>/... */
const MAPS_URL =
  /^https:\/\/(www\.google\.[a-z]{2,3}(\.[a-z]{2})?\/maps(\/|$|\?)|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?(\/|$|\?))/i;

export function isGoogleMapsUrl(url: string | undefined): boolean {
  return url !== undefined && MAPS_URL.test(url);
}

export async function getActiveTab(): Promise<Browser.tabs.Tab | null> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0] ?? null;
  } catch {
    return null;
  }
}
