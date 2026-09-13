/**
 * Numeric helpers. Every function here has a line-for-line twin in the Python
 * port (apps/api/signalyze_api/engine/mathutil.py); keep them identical.
 */

export function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Linear ramp: 0 at `low` and below, 1 at `high` and above. */
export function ramp(value: number, low: number, high: number): number {
  if (high <= low) return value >= high ? 1 : 0;
  return clamp01((value - low) / (high - low));
}

/** Round half up to 6 decimals (avoids banker's rounding differences across languages). */
export function round6(x: number): number {
  return Math.floor(x * 1e6 + 0.5) / 1e6;
}

/** Round half up to an integer. */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let total = 0;
  for (const v of values) total += v;
  return total / values.length;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Shannon entropy in bits of a count vector. */
export function entropyBits(counts: readonly number[]): number {
  let total = 0;
  for (const c of counts) total += c;
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Days since 1970-01-01 (UTC) for a YYYY-MM-DD string. */
export function dayNumber(isoDay: string): number {
  const year = Number(isoDay.slice(0, 4));
  const month = Number(isoDay.slice(5, 7));
  const day = Number(isoDay.slice(8, 10));
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function monthKey(isoDay: string): string {
  return isoDay.slice(0, 7);
}

/** Number of calendar months from monthKey a to monthKey b, inclusive. */
export function monthsBetweenInclusive(a: string, b: string): number {
  const ay = Number(a.slice(0, 4));
  const am = Number(a.slice(5, 7));
  const by = Number(b.slice(0, 4));
  const bm = Number(b.slice(5, 7));
  return (by - ay) * 12 + (bm - am) + 1;
}

export function addMonths(key: string, offset: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1 + offset;
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12;
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;
}
