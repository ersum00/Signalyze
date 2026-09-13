/**
 * Everything the extension keeps in chrome.storage.local: user settings and
 * a small cache of computed profiles keyed by place id (7-day TTL, at most
 * 200 entries). Nothing here is synced anywhere.
 */
import {
  AnalysisResultSchema,
  CACHE_TTL_DAYS,
  SUPPORTED_LOCALES,
  type AnalysisResult,
  type Locale,
} from '@signalyze/shared';
import { browser, type Browser } from 'wxt/browser';

export type LocaleSetting = 'auto' | Locale;

export interface Settings {
  locale: LocaleSetting;
  badgeEnabled: boolean;
  /** False until the user accepts the consent screen or enables it in Settings. */
  sendToServer: boolean;
  consentGivenAt: string | null;
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  locale: 'auto',
  badgeEnabled: true,
  sendToServer: false,
  consentGivenAt: null,
  onboardingDone: false,
};

export const SETTINGS_KEY = 'settings';
export const CACHE_KEY = 'resultCache';
export const CACHE_MAX_ENTRIES = 200;
export const CACHE_TTL_MS = CACHE_TTL_DAYS * 86_400_000;

function isLocaleSetting(value: unknown): value is LocaleSetting {
  return value === 'auto' || (SUPPORTED_LOCALES as readonly unknown[]).includes(value);
}

function sanitizeSettings(value: unknown): Settings {
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    locale: isLocaleSetting(record.locale) ? record.locale : DEFAULT_SETTINGS.locale,
    badgeEnabled:
      typeof record.badgeEnabled === 'boolean'
        ? record.badgeEnabled
        : DEFAULT_SETTINGS.badgeEnabled,
    sendToServer:
      typeof record.sendToServer === 'boolean'
        ? record.sendToServer
        : DEFAULT_SETTINGS.sendToServer,
    consentGivenAt:
      typeof record.consentGivenAt === 'string'
        ? record.consentGivenAt
        : DEFAULT_SETTINGS.consentGivenAt,
    onboardingDone:
      typeof record.onboardingDone === 'boolean'
        ? record.onboardingDone
        : DEFAULT_SETTINGS.onboardingDone,
  };
}

export async function getSettings(): Promise<Settings> {
  const stored: unknown = (await browser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  return sanitizeSettings(stored);
}

/** Merges `patch` into the stored settings and returns the result. */
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = sanitizeSettings({ ...(await getSettings()), ...patch });
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

/** Subscribes to settings changes made in any extension context. Returns an unsubscribe function. */
export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, Browser.storage.StorageChange>, area: string) => {
    if (area !== 'local') return;
    const change = changes[SETTINGS_KEY];
    if (change === undefined) return;
    listener(sanitizeSettings(change.newValue));
  };
  browser.storage.onChanged.addListener(handler);
  return () => {
    browser.storage.onChanged.removeListener(handler);
  };
}

export interface CachedResult {
  result: AnalysisResult;
  /** ISO timestamp of when the result was stored locally. */
  storedAt: string;
}

type CacheMap = Record<string, CachedResult>;

function isCachedEntry(value: unknown): value is CachedResult {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.storedAt === 'string' && typeof record.result === 'object';
}

async function readCache(): Promise<CacheMap> {
  const stored: unknown = (await browser.storage.local.get(CACHE_KEY))[CACHE_KEY];
  if (typeof stored !== 'object' || stored === null) return {};
  const map: CacheMap = {};
  for (const [key, entry] of Object.entries(stored as Record<string, unknown>)) {
    if (isCachedEntry(entry)) map[key] = entry;
  }
  return map;
}

async function writeCache(map: CacheMap): Promise<void> {
  await browser.storage.local.set({ [CACHE_KEY]: map });
}

function isFresh(entry: CachedResult, now: Date): boolean {
  const age = now.getTime() - Date.parse(entry.storedAt);
  return Number.isFinite(age) && age >= 0 && age <= CACHE_TTL_MS;
}

/** Returns the cached profile for a place, or null when absent, expired or malformed. */
export async function getCachedResult(
  placeId: string,
  now: Date = new Date(),
): Promise<CachedResult | null> {
  const cache = await readCache();
  const entry = cache[placeId];
  if (entry === undefined) return null;
  const parsed = AnalysisResultSchema.safeParse(entry.result);
  if (!isFresh(entry, now) || !parsed.success) {
    await writeCache(Object.fromEntries(Object.entries(cache).filter(([key]) => key !== placeId)));
    return null;
  }
  return { result: parsed.data, storedAt: entry.storedAt };
}

/** Stores a profile, dropping expired entries and the oldest ones beyond the cap. */
export async function setCachedResult(
  placeId: string,
  result: AnalysisResult,
  now: Date = new Date(),
): Promise<void> {
  const cache = await readCache();
  cache[placeId] = { result, storedAt: now.toISOString() };
  const kept = Object.entries(cache)
    .filter(([, entry]) => isFresh(entry, now))
    .sort((a, b) => Date.parse(b[1].storedAt) - Date.parse(a[1].storedAt))
    .slice(0, CACHE_MAX_ENTRIES);
  await writeCache(Object.fromEntries(kept));
}

export async function clearCache(): Promise<void> {
  await browser.storage.local.remove(CACHE_KEY);
}

export async function cacheSize(): Promise<number> {
  return Object.keys(await readCache()).length;
}
