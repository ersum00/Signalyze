import { describe, expect, it } from 'vitest';
import { formatUtcDay, isRelativeDate, parseRelativeDate } from './dates';

// Sunday 2026-09-13, 10:00 UTC. Chosen so week and month subtraction cross month boundaries.
const NOW = new Date('2026-09-13T10:00:00Z');

describe('parseRelativeDate', () => {
  it.each([
    ['just now', '2026-09-13'],
    ['a day ago', '2026-09-12'],
    ['2 days ago', '2026-09-11'],
    ['a week ago', '2026-09-06'],
    ['3 weeks ago', '2026-08-23'],
    ['a month ago', '2026-08-13'],
    ['5 months ago', '2026-04-13'],
    ['a year ago', '2025-09-13'],
    ['2 years ago', '2024-09-13'],
    ['Edited 2 weeks ago', '2026-08-30'],
    ['3 months ago on Google', '2026-06-13'],
    ['an hour ago', '2026-09-13'],
    ['23 hours ago', '2026-09-12'],
  ])('English: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  it.each([
    ['az önce', '2026-09-13'],
    ['1 gün önce', '2026-09-12'],
    ['2 hafta önce', '2026-08-30'],
    ['3 ay önce', '2026-06-13'],
    ['bir yıl önce', '2025-09-13'],
    ['Düzenlendi: 4 ay önce', '2026-05-13'],
    ['bir ay önce', '2026-08-13'],
  ])('Turkish: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  it.each([
    ['vor einem Tag', '2026-09-12'],
    ['vor 2 Wochen', '2026-08-30'],
    ['vor einem Monat', '2026-08-13'],
    ['vor 3 Jahren', '2023-09-13'],
    ['Bearbeitet vor einer Woche', '2026-09-06'],
    ['vor einem Jahr', '2025-09-13'],
  ])('German: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  it.each([
    ['hace un día', '2026-09-12'],
    ['hace 2 semanas', '2026-08-30'],
    ['hace un mes', '2026-08-13'],
    ['hace 3 años', '2023-09-13'],
    ['Editado hace 6 meses', '2026-03-13'],
    ['hace una semana', '2026-09-06'],
  ])('Spanish: %s -> %s', (text, expected) => {
    expect(parseRelativeDate(text, NOW)).toBe(expected);
  });

  /** At least two samples per Google Maps UI language, as rendered in the review date line. */
  const LANGUAGE_TABLE: Record<string, readonly (readonly [string, string])[]> = {
    en: [
      ['Edited a week ago', '2026-09-06'],
      ['yesterday', '2026-09-12'],
      ['today', '2026-09-13'],
    ],
    tr: [
      ['1 ay önce', '2026-08-13'],
      ['Düzenlendi: 2 hafta önce', '2026-08-30'],
      ['3 yıl önce', '2023-09-13'],
      ['dün', '2026-09-12'],
    ],
    de: [
      ['vor 3 Tagen', '2026-09-10'],
      ['vor 5 Minuten', '2026-09-13'],
      ['gestern', '2026-09-12'],
    ],
    es: [
      ['hace 2 semanas', '2026-08-30'],
      ['hace 10 meses', '2025-11-13'],
      ['ayer', '2026-09-12'],
    ],
    fr: [
      ['il y a 3 semaines', '2026-08-23'],
      ['il y a un mois', '2026-08-13'],
      ['il y a un an', '2025-09-13'],
      ['il y a 2 ans', '2024-09-13'],
      ['il y a une heure', '2026-09-13'],
      ['Modifié il y a 2 jours', '2026-09-11'],
      ['hier', '2026-09-12'],
    ],
    it: [
      ['2 settimane fa', '2026-08-30'],
      ['un mese fa', '2026-08-13'],
      ['un anno fa', '2025-09-13'],
      ['3 anni fa', '2023-09-13'],
      ["un'ora fa", '2026-09-13'],
      ['ieri', '2026-09-12'],
    ],
    pt: [
      ['há 2 meses', '2026-07-13'],
      ['há um ano', '2025-09-13'],
      ['há 3 semanas', '2026-08-23'],
      ['há um dia', '2026-09-12'],
      ['2 anos atrás', '2024-09-13'],
      ['ontem', '2026-09-12'],
    ],
    nl: [
      ['2 weken geleden', '2026-08-30'],
      ['een maand geleden', '2026-08-13'],
      ['een jaar geleden', '2025-09-13'],
      ['3 dagen geleden', '2026-09-10'],
      ['een uur geleden', '2026-09-13'],
    ],
    pl: [
      ['3 tygodnie temu', '2026-08-23'],
      ['tydzień temu', '2026-09-06'],
      ['miesiąc temu', '2026-08-13'],
      ['2 lata temu', '2024-09-13'],
      ['5 lat temu', '2021-09-13'],
      ['rok temu', '2025-09-13'],
      ['2 dni temu', '2026-09-11'],
    ],
    ru: [
      ['2 недели назад', '2026-08-30'],
      ['неделю назад', '2026-09-06'],
      ['месяц назад', '2026-08-13'],
      ['3 месяца назад', '2026-06-13'],
      ['год назад', '2025-09-13'],
      ['5 лет назад', '2021-09-13'],
      ['2 года назад', '2024-09-13'],
      ['день назад', '2026-09-12'],
    ],
    uk: [
      ['2 роки тому', '2024-09-13'],
      ['рік тому', '2025-09-13'],
      ['3 тижні тому', '2026-08-23'],
      ['тиждень тому', '2026-09-06'],
      ['місяць тому', '2026-08-13'],
      ['5 років тому', '2021-09-13'],
    ],
    cs: [
      ['před 2 týdny', '2026-08-30'],
      ['před měsícem', '2026-08-13'],
      ['před rokem', '2025-09-13'],
      ['před 3 lety', '2023-09-13'],
      ['před 2 dny', '2026-09-11'],
      ['před týdnem', '2026-09-06'],
    ],
    sv: [
      ['för 2 veckor sedan', '2026-08-30'],
      ['för en månad sedan', '2026-08-13'],
      ['för ett år sedan', '2025-09-13'],
      ['för 3 dagar sedan', '2026-09-10'],
    ],
    da: [
      ['for 2 uger siden', '2026-08-30'],
      ['for en måned siden', '2026-08-13'],
      ['for et år siden', '2025-09-13'],
      ['for 3 dage siden', '2026-09-10'],
    ],
    nb: [
      ['for 2 uker siden', '2026-08-30'],
      ['for en måned siden', '2026-08-13'],
      ['for ett år siden', '2025-09-13'],
      ['for 3 dager siden', '2026-09-10'],
    ],
    fi: [
      ['2 viikkoa sitten', '2026-08-30'],
      ['kuukausi sitten', '2026-08-13'],
      ['vuosi sitten', '2025-09-13'],
      ['3 vuotta sitten', '2023-09-13'],
      ['2 päivää sitten', '2026-09-11'],
    ],
    el: [
      ['πριν από 2 εβδομάδες', '2026-08-30'],
      ['πριν από 1 μήνα', '2026-08-13'],
      ['πριν από 3 μήνες', '2026-06-13'],
      ['πριν από 1 έτος', '2025-09-13'],
      ['πριν από 2 χρόνια', '2024-09-13'],
      ['πριν από 3 ημέρες', '2026-09-10'],
    ],
    hu: [
      ['2 hete', '2026-08-30'],
      ['1 hónapja', '2026-08-13'],
      ['egy éve', '2025-09-13'],
      ['3 éve', '2023-09-13'],
      ['2 napja', '2026-09-11'],
      ['3 évvel ezelőtt', '2023-09-13'],
    ],
    ro: [
      ['acum 2 săptămâni', '2026-08-30'],
      ['acum o lună', '2026-08-13'],
      ['acum un an', '2025-09-13'],
      ['acum 3 ani', '2023-09-13'],
      ['acum 2 zile', '2026-09-11'],
      ['acum o zi', '2026-09-12'],
    ],
    id: [
      ['3 bulan lalu', '2026-06-13'],
      ['seminggu lalu', '2026-09-06'],
      ['setahun yang lalu', '2025-09-13'],
      ['2 hari lalu', '2026-09-11'],
      ['sebulan lalu', '2026-08-13'],
    ],
    ms: [
      ['2 minggu lalu', '2026-08-30'],
      ['sebulan lalu', '2026-08-13'],
      ['setahun lalu', '2025-09-13'],
      ['3 hari lepas', '2026-09-10'],
    ],
    vi: [
      ['2 tuần trước', '2026-08-30'],
      ['1 tháng trước', '2026-08-13'],
      ['3 năm trước', '2023-09-13'],
      ['một tuần trước', '2026-09-06'],
      ['2 ngày trước', '2026-09-11'],
    ],
    th: [
      ['2 สัปดาห์ที่ผ่านมา', '2026-08-30'],
      ['1 เดือนที่ผ่านมา', '2026-08-13'],
      ['3 ปีที่ผ่านมา', '2023-09-13'],
      ['2 วันที่แล้ว', '2026-09-11'],
    ],
    ja: [
      ['2 週間前', '2026-08-30'],
      ['1 か月前', '2026-08-13'],
      ['3 年前', '2023-09-13'],
      ['5 日前', '2026-09-08'],
      ['2 ヶ月前', '2026-07-13'],
      ['1 時間前', '2026-09-13'],
      ['編集済み: 2 週間前', '2026-08-30'],
    ],
    zh: [
      ['3個月前', '2026-06-13'],
      ['2 周前', '2026-08-30'],
      ['1 年前', '2025-09-13'],
      ['3 天前', '2026-09-10'],
      ['2 週前', '2026-08-30'],
      ['1 个月前', '2026-08-13'],
    ],
    ko: [
      ['2주 전', '2026-08-30'],
      ['1개월 전', '2026-08-13'],
      ['3년 전', '2023-09-13'],
      ['5일 전', '2026-09-08'],
      ['한 달 전', '2026-08-13'],
      ['1시간 전', '2026-09-13'],
    ],
    ar: [
      ['قبل 3 أشهر', '2026-06-13'],
      ['قبل أسبوعين', '2026-08-30'],
      ['قبل شهر', '2026-08-13'],
      ['قبل سنة', '2025-09-13'],
      ['قبل سنتين', '2024-09-13'],
      ['قبل ٣ أيام', '2026-09-10'],
      ['قبل يومين', '2026-09-11'],
      ['منذ 5 سنوات', '2021-09-13'],
      ['قبل عام', '2025-09-13'],
    ],
    he: [
      ['לפני חודשיים', '2026-07-13'],
      ['לפני שבועיים', '2026-08-30'],
      ['לפני 3 שבועות', '2026-08-23'],
      ['לפני שנה', '2025-09-13'],
      ['לפני שנתיים', '2024-09-13'],
      ['לפני 5 שנים', '2021-09-13'],
      ['לפני יומיים', '2026-09-11'],
      ['לפני יום', '2026-09-12'],
    ],
    hi: [
      ['2 सप्ताह पहले', '2026-08-30'],
      ['1 महीने पहले', '2026-08-13'],
      ['3 साल पहले', '2023-09-13'],
      ['2 दिन पहले', '2026-09-11'],
      ['१ हफ़्ते पहले', '2026-09-06'],
    ],
  };

  describe.each(Object.entries(LANGUAGE_TABLE))('language %s', (_lang, samples) => {
    it.each(samples)('%s -> %s', (text, expected) => {
      expect(parseRelativeDate(text, NOW)).toBe(expected);
    });
  });

  it('clamps the day when the target month is shorter', () => {
    expect(parseRelativeDate('a month ago', new Date('2026-03-31T00:00:00Z'))).toBe('2026-02-28');
    expect(parseRelativeDate('a year ago', new Date('2028-02-29T00:00:00Z'))).toBe('2027-02-28');
  });

  it('crosses year boundaries when subtracting months', () => {
    expect(parseRelativeDate('10 months ago', new Date('2026-03-15T00:00:00Z'))).toBe('2025-05-15');
  });

  it('returns null for unknown formats', () => {
    expect(parseRelativeDate('', NOW)).toBeNull();
    expect(parseRelativeDate('12 reviews', NOW)).toBeNull();
    expect(parseRelativeDate('March 2024', NOW)).toBeNull();
    expect(parseRelativeDate('2 weeks', NOW)).toBeNull();
    expect(parseRelativeDate('a day ago', new Date('invalid'))).toBeNull();
    expect(parseRelativeDate('Local Guide · 45 reviews · 12 photos', NOW)).toBeNull();
    expect(parseRelativeDate('Reviewer 3', NOW)).toBeNull();
    expect(parseRelativeDate('5 stars', NOW)).toBeNull();
    expect(parseRelativeDate('Response from the owner', NOW)).toBeNull();
  });
});

describe('isRelativeDate', () => {
  it('answers for any supported language without a reference time', () => {
    expect(isRelativeDate('il y a 2 semaines')).toBe(true);
    expect(isRelativeDate('2주 전')).toBe(true);
    expect(isRelativeDate('Reviewer 12')).toBe(false);
  });
});

describe('formatUtcDay', () => {
  it('pads month and day', () => {
    expect(formatUtcDay(new Date('2026-01-05T23:59:59Z'))).toBe('2026-01-05');
  });
});
