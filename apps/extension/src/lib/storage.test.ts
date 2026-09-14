import { fakeBrowser } from 'wxt/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CACHE_KEY,
  CACHE_MAX_ENTRIES,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  cacheSize,
  clearCache,
  getCachedResult,
  getSettings,
  cacheKey,
  saveSettings,
  setCachedResult,
} from './storage';
import { analysisResult } from './test-helpers';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('settings', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges patches and persists them', async () => {
    const saved = await saveSettings({
      sendToServer: true,
      consentGivenAt: '2026-09-12T10:00:00Z',
    });
    expect(saved).toEqual({
      ...DEFAULT_SETTINGS,
      sendToServer: true,
      consentGivenAt: '2026-09-12T10:00:00Z',
    });
    expect(await getSettings()).toEqual(saved);
    const again = await saveSettings({ locale: 'de' });
    expect(again.sendToServer).toBe(true);
    expect(again.locale).toBe('de');
  });

  it('sanitises malformed stored values', async () => {
    await fakeBrowser.storage.local.set({
      [SETTINGS_KEY]: { locale: 'xx', badgeEnabled: 'yes', onboardingDone: true },
    });
    const settings = await getSettings();
    expect(settings.locale).toBe('auto');
    expect(settings.badgeEnabled).toBe(true);
    expect(settings.onboardingDone).toBe(true);
  });
});

describe('result cache', () => {
  const NOW = new Date('2026-09-12T10:00:00Z');

  it('stores and returns a profile keyed by place id', async () => {
    await setCachedResult('place-a', analysisResult({ placeId: 'place-a', score: 17 }), 'all', NOW);
    const hit = await getCachedResult('place-a', 'all', NOW);
    expect(hit?.result.score).toBe(17);
    expect(hit?.storedAt).toBe(NOW.toISOString());
    expect(await getCachedResult('place-b', 'all', NOW)).toBeNull();
    expect(await cacheSize()).toBe(1);
  });

  it('expires entries after seven days', async () => {
    await setCachedResult('place-a', analysisResult(), 'all', NOW);
    const sixDays = new Date(NOW.getTime() + 6 * 86_400_000);
    const eightDays = new Date(NOW.getTime() + 8 * 86_400_000);
    expect(await getCachedResult('place-a', 'all', sixDays)).not.toBeNull();
    expect(await getCachedResult('place-a', 'all', eightDays)).toBeNull();
    expect(await cacheSize()).toBe(0);
  });

  it('evicts the oldest entries beyond the cap', async () => {
    for (let i = 0; i < CACHE_MAX_ENTRIES + 3; i += 1) {
      const at = new Date(NOW.getTime() + i * 1000);
      await setCachedResult(`place-${i}`, analysisResult({ placeId: `place-${i}` }), 'all', at);
    }
    expect(await cacheSize()).toBe(CACHE_MAX_ENTRIES);
    const later = new Date(NOW.getTime() + 10 * 60_000);
    expect(await getCachedResult('place-0', 'all', later)).toBeNull();
    expect(await getCachedResult('place-2', 'all', later)).toBeNull();
    expect(await getCachedResult('place-3', 'all', later)).not.toBeNull();
    expect(await getCachedResult(`place-${CACHE_MAX_ENTRIES + 2}`, 'all', later)).not.toBeNull();
  });

  it('drops malformed entries instead of returning them', async () => {
    await fakeBrowser.storage.local.set({
      [CACHE_KEY]: { 'place-a': { storedAt: NOW.toISOString(), result: { score: 'high' } } },
    });
    expect(await getCachedResult('place-a', 'all', NOW)).toBeNull();
  });

  it('clears everything', async () => {
    await setCachedResult('place-a', analysisResult(), 'all', NOW);
    await clearCache();
    expect(await cacheSize()).toBe(0);
  });
});

describe('analysis scope settings', () => {
  it('defaults to 200 reviews and all time', async () => {
    const settings = await getSettings();
    expect(settings.sampleLimit).toBe(200);
    expect(settings.window).toBe('all');
  });

  it('keeps valid choices and drops invalid ones', async () => {
    const saved = await saveSettings({ sampleLimit: 'all', window: 'last3m' });
    expect(saved.sampleLimit).toBe('all');
    expect(saved.window).toBe('last3m');
    await fakeBrowser.storage.local.set({
      [SETTINGS_KEY]: { ...saved, sampleLimit: 300, window: 'yesterday' },
    });
    const sanitised = await getSettings();
    expect(sanitised.sampleLimit).toBe(200);
    expect(sanitised.window).toBe('all');
  });
});

describe('windowed result cache', () => {
  it('keys windowed profiles separately from the all-time profile', async () => {
    expect(cacheKey('p1', 'all')).toBe('p1');
    expect(cacheKey('p1', 'last3m')).toBe('p1|last3m');
    const windowed = analysisResult({ score: 9 });
    await setCachedResult('p1', windowed, 'last3m');
    expect(await getCachedResult('p1')).toBeNull();
    expect((await getCachedResult('p1', 'last3m'))?.result.score).toBe(9);
    await setCachedResult('p1', analysisResult({ score: 40 }));
    expect((await getCachedResult('p1'))?.result.score).toBe(40);
    expect((await getCachedResult('p1', 'last3m'))?.result.score).toBe(9);
  });
});
