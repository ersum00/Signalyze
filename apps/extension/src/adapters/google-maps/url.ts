import { PlaceIdSchema } from '@signalyze/shared';

/**
 * Hosts on which Google Maps place pages are served: www.google.com,
 * google.com.tr, maps.google.de, ...
 */
const GOOGLE_HOST = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/i;

/** Feature id as found in the `data=` segment, e.g. `!1s0x14cab7650656bd63:0x8ca058b28c20b6c3`. */
const FEATURE_ID = /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i;
/** Place id tokens (`ChIJ...`) in the `data=` segment, in order of preference. */
const DATA_PLACE_ID = [/!19s(ChIJ[A-Za-z0-9_-]+)/, /!1s(ChIJ[A-Za-z0-9_-]+)/];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalise(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  return PlaceIdSchema.safeParse(trimmed).success ? trimmed : null;
}

/**
 * Extracts a stable place identifier from a Google Maps URL.
 *
 * Preference order: `place_id=` query param, the `0x…:0x…` feature id after
 * `!1s` in the `data=` segment, a `ChIJ…` token after `!19s`/`!1s`, the
 * `ftid=` query param, and finally `cid=` (returned as `cid:<number>`).
 * Returns null when the URL is not a Google host or carries no place.
 */
export function parsePlaceIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!GOOGLE_HOST.test(parsed.hostname)) return null;

  const fromQuery = normalise(parsed.searchParams.get('place_id'));
  if (fromQuery) return fromQuery;

  const decoded = safeDecode(parsed.pathname + parsed.search + parsed.hash);
  const feature = normalise(FEATURE_ID.exec(decoded)?.[1]);
  if (feature) return feature;
  for (const pattern of DATA_PLACE_ID) {
    const match = normalise(pattern.exec(decoded)?.[1]);
    if (match) return match;
  }

  const ftid = normalise(parsed.searchParams.get('ftid'));
  if (ftid) return ftid;

  const cid = parsed.searchParams.get('cid');
  if (cid && /^\d+$/.test(cid)) return normalise(`cid:${cid}`);
  return null;
}
