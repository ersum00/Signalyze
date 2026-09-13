import { describe, expect, it } from 'vitest';
import { parsePlaceIdFromUrl } from './url';

describe('parsePlaceIdFromUrl', () => {
  it('extracts the feature id after !1s from the data segment', () => {
    const url =
      'https://www.google.com/maps/place/Pera+Museum/@41.0316,28.975,17z/data=!3m1!4b1!4m6!3m5!1s0x14cab7650656bd63:0x8ca058b28c20b6c3!8m2!3d41.0316!4d28.975!16s%2Fg%2F11c1abc?hl=en&entry=ttu';
    expect(parsePlaceIdFromUrl(url)).toBe('0x14cab7650656bd63:0x8ca058b28c20b6c3');
  });

  it('accepts a percent-encoded data segment', () => {
    const url =
      'https://www.google.com.tr/maps/place/X/@41,28,17z/data=%213m1%214b1%214m6%213m5%211s0xabc:0xdef?hl=tr';
    expect(parsePlaceIdFromUrl(url)).toBe('0xabc:0xdef');
  });

  it('prefers the place_id query param', () => {
    expect(
      parsePlaceIdFromUrl(
        'https://www.google.com/maps/place/?q=place_id:x&place_id=ChIJN1t_tDeuEmsRUsoyG83frY4',
      ),
    ).toBe('ChIJN1t_tDeuEmsRUsoyG83frY4');
  });

  it('falls back to a ChIJ token after !19s or !1s', () => {
    expect(
      parsePlaceIdFromUrl(
        'https://www.google.com/maps/place/X/data=!4m2!3m1!19sChIJN1t_tDeuEmsRUsoyG83frY4',
      ),
    ).toBe('ChIJN1t_tDeuEmsRUsoyG83frY4');
    expect(parsePlaceIdFromUrl('https://maps.google.de/maps/place/X/data=!1sChIJabc_def-123')).toBe(
      'ChIJabc_def-123',
    );
  });

  it('supports ftid and cid query params', () => {
    expect(parsePlaceIdFromUrl('https://www.google.com/maps?ftid=0x1:0x2abc')).toBe('0x1:0x2abc');
    expect(parsePlaceIdFromUrl('https://maps.google.com/?cid=1234567890')).toBe('cid:1234567890');
  });

  it('returns null when there is no place or the host is not Google', () => {
    expect(parsePlaceIdFromUrl('https://www.google.com/maps/@41,28,12z')).toBeNull();
    expect(parsePlaceIdFromUrl('https://www.google.com/maps/search/cafe/@41,28,12z')).toBeNull();
    expect(parsePlaceIdFromUrl('https://example.com/maps/place/X/data=!1s0x1:0x2')).toBeNull();
    expect(parsePlaceIdFromUrl('not a url')).toBeNull();
    expect(parsePlaceIdFromUrl('https://maps.google.com/?cid=abc')).toBeNull();
  });
});
