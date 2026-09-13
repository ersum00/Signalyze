/**
 * Conversion of the relative date strings Google Maps displays ("2 weeks ago",
 * "vor 3 Monaten", "3 ay önce", "hace un mes") into a calendar day.
 *
 * Precision is inherently limited: "a month ago" can mean anywhere between
 * roughly 4 and 8 weeks. The result is the best-effort day obtained by
 * subtracting the displayed amount from `now`.
 */

type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** Unit words per language (lower-cased). Turkish forms are listed with and without dotted/dotless i. */
const UNIT_WORDS: Record<Unit, readonly string[]> = {
  second: ['second', 'seconds', 'saniye', 'sekunde', 'sekunden', 'segundo', 'segundos'],
  minute: ['minute', 'minutes', 'dakika', 'minuten', 'minuto', 'minutos'],
  hour: ['hour', 'hours', 'saat', 'stunde', 'stunden', 'hora', 'horas'],
  day: ['day', 'days', 'gün', 'gun', 'tag', 'tage', 'tagen', 'día', 'días', 'dia', 'dias'],
  week: ['week', 'weeks', 'hafta', 'woche', 'wochen', 'semana', 'semanas'],
  month: ['month', 'months', 'ay', 'monat', 'monate', 'monaten', 'mes', 'meses'],
  year: [
    'year',
    'years',
    'yıl',
    'yil',
    'sene',
    'jahr',
    'jahre',
    'jahren',
    'año',
    'años',
    'ano',
    'anos',
  ],
};

/** Words meaning "one" in the supported languages. */
const ONE_WORDS = [
  'a',
  'an',
  'one',
  'bir',
  'ein',
  'eine',
  'einem',
  'einer',
  'einen',
  'un',
  'una',
  'uno',
];

/** Phrases meaning "now". */
const NOW_PHRASES = [
  'just now',
  'az önce',
  'az once',
  'şimdi',
  'gerade eben',
  'justo ahora',
  'ahora mismo',
];

/** Markers that make a "<n> <unit>" phrase a relative past date. */
const AGO_MARKER = /(?<![\p{L}])(ago|önce|once|vor|hace)(?![\p{L}])/u;

const unitAlternatives = Object.values(UNIT_WORDS).flat().join('|');
const RELATIVE_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(\\d{1,4}|${ONE_WORDS.join('|')})\\s+(${unitAlternatives})(?![\\p{L}])`,
  'u',
);

function unitOf(word: string): Unit | null {
  for (const [unit, words] of Object.entries(UNIT_WORDS) as [Unit, readonly string[]][]) {
    if (words.includes(word)) return unit;
  }
  return null;
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Calendar subtraction in UTC, clamping the day to the target month's length. */
function subtractCalendar(now: Date, months: number): Date {
  const totalMonths = now.getUTCFullYear() * 12 + now.getUTCMonth() - months;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = totalMonths - year * 12;
  const day = Math.min(now.getUTCDate(), daysInUtcMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

export function formatUtcDay(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a relative date string (English, Turkish, German or Spanish) to a
 * "YYYY-MM-DD" calendar day in UTC. Prefixes such as "Edited", "Düzenlendi:"
 * and suffixes such as "on Google" are ignored. Returns null for unknown formats.
 */
export function parseRelativeDate(text: string, now: Date): string | null {
  if (Number.isNaN(now.getTime())) return null;
  const normalised = text.toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
  if (normalised.length === 0) return null;

  if (NOW_PHRASES.some((phrase) => normalised.includes(phrase))) return formatUtcDay(now);

  const match = RELATIVE_PATTERN.exec(normalised);
  if (!match || !AGO_MARKER.test(normalised)) return null;
  const amountWord = match[1] ?? '';
  const unit = unitOf(match[2] ?? '');
  if (unit === null) return null;
  const amount = /^\d+$/.test(amountWord) ? Number(amountWord) : 1;

  switch (unit) {
    case 'second':
      return formatUtcDay(new Date(now.getTime() - amount * 1000));
    case 'minute':
      return formatUtcDay(new Date(now.getTime() - amount * 60_000));
    case 'hour':
      return formatUtcDay(new Date(now.getTime() - amount * 3_600_000));
    case 'day':
      return formatUtcDay(new Date(now.getTime() - amount * 86_400_000));
    case 'week':
      return formatUtcDay(new Date(now.getTime() - amount * 7 * 86_400_000));
    case 'month':
      return formatUtcDay(subtractCalendar(now, amount));
    case 'year':
      return formatUtcDay(subtractCalendar(now, amount * 12));
  }
}
