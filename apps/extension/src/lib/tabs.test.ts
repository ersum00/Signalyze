import { describe, expect, it } from 'vitest';
import { isGoogleMapsUrl } from './tabs';

describe('isGoogleMapsUrl', () => {
  it('accepts Google Maps hosts and paths', () => {
    expect(isGoogleMapsUrl('https://www.google.com/maps/place/X/@1,2,3z/data=!4m5')).toBe(true);
    expect(isGoogleMapsUrl('https://www.google.com.tr/maps')).toBe(true);
    expect(isGoogleMapsUrl('https://www.google.de/maps?q=x')).toBe(true);
    expect(isGoogleMapsUrl('https://maps.google.com/')).toBe(true);
    expect(isGoogleMapsUrl('https://maps.google.co.uk/maps/place/Y')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isGoogleMapsUrl(undefined)).toBe(false);
    expect(isGoogleMapsUrl('https://www.google.com/search?q=maps')).toBe(false);
    expect(isGoogleMapsUrl('https://example.com/maps')).toBe(false);
    expect(isGoogleMapsUrl('http://www.google.com/maps')).toBe(false);
    expect(isGoogleMapsUrl('chrome://extensions')).toBe(false);
  });
});
