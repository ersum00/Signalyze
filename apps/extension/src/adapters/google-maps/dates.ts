/**
 * Conversion of the relative date strings Google Maps displays in any
 * interface language ("2 weeks ago", "vor 3 Monaten", "il y a un mois",
 * "3 個月前", "قبل أسبوعين") into a calendar day.
 *
 * The parser is data driven: per unit a table of word stems across
 * languages, a table of "ago" markers, tables of number words and dual forms,
 * and the phrases for "just now", "today" and "yesterday". Google prints
 * amounts of two and more as numerals in every language, so a unit without a
 * numeral means one unless a dual form or a word for "two" is present.
 *
 * Precision is inherently limited: "a month ago" can mean anywhere between
 * roughly 4 and 8 weeks. The result is the best-effort day obtained by
 * subtracting the displayed amount from `now`, in UTC.
 */
import { compileTerms, foldText } from './text';

type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/**
 * Unit stems per language. Notation (see text.ts): a plain entry matches at
 * the start of a word, so "woche" covers "Woche" and "Wochen"; "=an" must be a
 * whole word (French "un an", not "and" or "ans"); entries in Han, Kana or Thai
 * script match anywhere because those scripts do not separate words.
 * Languages: en tr de es fr it pt nl pl ru uk cs sv da nb fi el hu ro id ms vi
 * th ja zh ko ar he hi.
 */
const UNIT_STEMS: Readonly<Record<Unit, readonly string[]>> = {
  second: [
    'second', // en, fr (seconde), it (secondi), nl (seconden)
    'saniye', // tr
    'sekund', // de sv da nb pl cs
    'segundo', // es pt
    'sekunti', // fi
    'секунд', // ru uk
    'δευτερόλεπτ', // el
    'másodperc', // hu
    'secund', // ro
    'detik', // id
    'giây', // vi
    'วินาที', // th
    '秒', // ja zh
    '초', // ko
    'ثاني', // ar (ثانية, ثانيتين)
    'ثوان', // ar (ثوانٍ)
    '=שנייה', // he
    '=שניה', // he
    '=שניות', // he
    'सेकंड', // hi
    'सेकण्ड', // hi
  ],
  minute: [
    'minut', // en fr de nl pl cs sv da nb it es pt ro (minute, Minuten, minuty, minutter, minuti, minutos)
    'minuut', // nl (minuut), fi (minuutti)
    'dakika', // tr
    'минут', // ru
    'хвилин', // uk
    'λεπτ', // el
    'perc', // hu (perce)
    'menit', // id
    'minit', // ms
    'phút', // vi
    'นาที', // th
    '分', // ja zh (分, 分钟, 分鐘)
    '분', // ko
    'دقيق', // ar (دقيقة, دقيقتين)
    'دقائق', // ar
    'דק', // he (דקה, דקות)
    'मिनट', // hi
  ],
  hour: [
    'hour', // en
    'heure', // fr
    'hora', // es pt
    '=ora', // it ro
    '=ore', // it ro
    '=oră', // ro
    'stunde', // de
    '=uur', // nl
    'godzin', // pl
    'hodin', // cs
    'час', // ru (час, часа, часов)
    'годин', // uk
    'timm', // sv (timme, timmar)
    'time', // da nb (time, timer)
    'tunti', // fi
    'ώρ', // el (ώρα, ώρες)
    'óra', // hu
    'órá', // hu (órája)
    '=saat', // tr (also Malay "second"; a day-level result is the same either way)
    '=jam', // id ms
    'sejam', // id ms (one hour)
    'giờ', // vi
    'ชั่วโมง', // th
    '時間', // ja
    '小时', // zh
    '小時', // zh
    '鐘頭', // zh
    '시간', // ko
    'ساع', // ar (ساعة, ساعتين, ساعات)
    'שע', // he (שעה, שעתיים, שעות)
    'घंट', // hi (घंटे, घंटा)
  ],
  day: [
    'day', // en
    '=gün', // tr
    '=gun', // tr without dots
    'tag', // de (Tag, Tagen)
    'día', // es
    'dia', // es pt
    'jour', // fr
    'giorn', // it (giorno, giorni)
    'dag', // nl sv da nb (dag, dagen, dagar, dage, dager)
    'dzie', // pl (dzień)
    'dni', // pl
    '=den', // cs
    'dn', // cs (dny, dní, dnem)
    '=день', // ru uk
    'дн', // ru uk (дня, дней, дні, днів)
    'päiv', // fi (päivä, päivää)
    'ημέρ', // el
    'μέρ', // el (μέρα, μέρες)
    'nap', // hu (napja)
    '=zi', // ro
    'zile', // ro
    '=hari', // id ms
    'sehari', // id ms (one day)
    'ngày', // vi
    'วัน', // th
    '天', // zh
    '日', // ja zh
    '일', // ko
    'يوم', // ar (يوم, يومين)
    'ايام', // ar (أيام, folded)
    '=יום', // he
    '=יומיים', // he (two days)
    '=ימים', // he
    'दिन', // hi
  ],
  week: [
    'week', // en nl
    'weken', // nl
    'hafta', // tr
    'woche', // de
    'seman', // es pt (semana, semanas)
    'semain', // fr
    'settiman', // it
    'tydz', // pl (tydzień)
    'tygodn', // pl (tygodnie, tygodni)
    'týd', // cs (týden, týdny, týdnů, týdnem)
    'недел', // ru
    'тижд', // uk (тиждень)
    'тижн', // uk (тижні, тижнів)
    'veck', // sv
    'uge', // da (uge, uger)
    'uke', // nb (uke, uker)
    'viikko', // fi (viikko, viikkoa)
    'εβδομάδ', // el
    'hét', // hu
    'het', // hu (hete)
    'săptămân', // ro
    'minggu', // id ms
    'seminggu', // id ms (one week)
    'tuần', // vi
    'สัปดาห์', // th
    'อาทิตย์', // th
    '週間', // ja
    '週', // ja zh
    '周', // zh
    '星期', // zh
    '礼拜', // zh
    '禮拜', // zh
    '주', // ko
    'اسبوع', // ar (أسبوع, أسبوعين, folded)
    'اسابيع', // ar (أسابيع, folded)
    'שבוע', // he (שבוע, שבועיים, שבועות)
    'सप्ताह', // hi
    'हफ़्त', // hi (हफ़्ते)
    'हफ्त', // hi
  ],
  month: [
    'month', // en
    '=ay', // tr
    'monat', // de
    'mes', // es pt it (mes, meses, mese, mesi)
    'mês', // pt
    'mois', // fr
    'maand', // nl
    'miesi', // pl (miesiąc, miesiące, miesięcy)
    'měsíc', // cs
    'месяц', // ru
    'місяц', // uk
    'månad', // sv
    'måned', // da nb
    'kuukau', // fi (kuukausi, kuukautta)
    'μήν', // el (μήνα, μήνες)
    'hónap', // hu
    'lun', // ro (lună, luni)
    'bulan', // id ms
    'sebulan', // id ms (one month)
    'tháng', // vi
    'เดือน', // th
    'か月', // ja
    'ヶ月', // ja
    'ケ月', // ja
    'カ月', // ja
    'ヵ月', // ja
    '箇月', // ja
    '个月', // zh
    '個月', // zh
    '月', // ja zh
    '개월', // ko
    '달', // ko
    'شهر', // ar (شهر, شهرين)
    'اشهر', // ar (أشهر, folded)
    'شهور', // ar
    'חודש', // he (חודש, חודשיים, חודשים)
    'महीन', // hi (महीने, महीना)
    'माह', // hi
  ],
  year: [
    'year', // en
    '=yıl', // tr
    '=yil', // tr without dots
    '=sene', // tr
    'jahr', // de
    'año', // es
    'ano', // pt (ano, anos)
    '=an', // fr ro
    '=ans', // fr
    '=ani', // ro
    'ann', // fr it (année, anno, anni)
    'jaar', // nl
    'rok', // pl cs (rok, roku, roky, rokem)
    '=lat', // pl
    '=lata', // pl
    '=let', // cs
    '=lety', // cs
    'год', // ru (год, года)
    '=лет', // ru
    '=рік', // uk
    'рок', // uk (роки, років)
    '=år', // sv da nb
    'vuo', // fi (vuosi, vuotta)
    'χρόν', // el (χρόνο, χρόνια)
    '=έτος', // el
    '=έτη', // el
    'év', // hu (éve, évvel)
    'tahun', // id ms
    'setahun', // id ms (one year)
    'năm', // vi
    'ปี', // th
    '年', // ja zh
    '년', // ko
    'سن', // ar (سنة, سنتين, سنوات)
    'عام', // ar (عام, عامين)
    'اعوام', // ar (أعوام, folded)
    '=שנה', // he
    '=שנתיים', // he (two years)
    '=שנים', // he
    'साल', // hi
    'वर्ष', // hi
  ],
};

/** Words and suffixes that make "<n> <unit>" a past relative date. */
const AGO_MARKERS: readonly string[] = [
  '=ago', // en
  '=önce', // tr
  '=once', // tr without dots
  '=vor', // de
  '=hace', // es
  '=il y a', // fr
  '=fa', // it
  '=há', // pt
  '=atrás', // pt
  '=geleden', // nl
  '=temu', // pl
  '=назад', // ru
  '=тому', // uk
  '=před', // cs
  '=sedan', // sv
  '=siden', // da nb
  '=sitten', // fi
  '=πριν', // el
  '=hete', // hu (2 hete = 2 weeks ago; the suffix is the marker)
  '=hónapja', // hu
  '=éve', // hu
  '=évvel', // hu
  '=napja', // hu
  '=órája', // hu
  '=perce', // hu
  '=másodperce', // hu
  '=ezelőtt', // hu
  '=acum', // ro
  '=lalu', // id ms
  '=yang lalu', // id ms
  '=lepas', // ms
  '=trước', // vi
  'ที่แล้ว', // th
  'ที่ผ่านมา', // th
  'ก่อน', // th
  '前', // ja zh
  '전', // ko
  '=قبل', // ar
  '=منذ', // ar
  '=לפני', // he
  '=पहले', // hi
  '=पूर्व', // hi
];

/** Words meaning "one" (an amount without a numeral already means one; listed for explicit forms). */
const ONE_WORDS: readonly string[] = [
  '=a',
  '=an',
  '=one', // en
  '=bir', // tr
  '=ein',
  '=eine',
  '=einem',
  '=einer',
  '=einen', // de
  '=un',
  '=una',
  '=uno', // es it fr ro
  '=une', // fr
  '=um',
  '=uma', // pt
  '=een',
  '=één', // nl
  '=jeden',
  '=jedna',
  '=jedno',
  '=jedną',
  '=jednu', // pl cs
  '=один',
  '=одна',
  '=одно',
  '=одну', // ru uk
  '=en',
  '=ett',
  '=et', // sv da nb
  '=yksi',
  '=yhden', // fi
  '=ένα',
  '=μία',
  '=μια',
  '=έναν',
  '=ενός', // el
  '=egy', // hu
  '=o', // ro
  '=satu', // id ms
  '=một', // vi
  'หนึ่ง', // th
  '一', // ja zh
  '=한', // ko
  '=واحد',
  '=واحدة', // ar
  '=אחד',
  '=אחת', // he
  '=एक', // hi
];

/** Words meaning "two", including the Arabic and Hebrew dual forms of the units. */
const TWO_WORDS: readonly string[] = [
  '=two', // en
  '=iki', // tr
  '=zwei', // de
  '=dos', // es
  '=deux', // fr
  '=due', // it
  '=dois',
  '=duas', // pt
  '=twee', // nl
  '=dwa',
  '=dwie', // pl
  '=два',
  '=две',
  '=дві', // ru uk
  '=dva',
  '=dvě', // cs
  '=två', // sv
  '=to', // da nb
  '=kaksi', // fi
  '=δύο', // el
  '=két',
  '=kettő', // hu
  '=două',
  '=doi', // ro
  '=dua', // id ms
  '=hai', // vi
  'สอง', // th
  '二',
  '两',
  '兩', // ja zh
  '=두', // ko
  '=اثنان',
  '=اثنين',
  '=اثنتين', // ar
  '=يومين',
  '=اسبوعين',
  '=شهرين',
  '=سنتين',
  '=عامين',
  '=ساعتين',
  '=دقيقتين',
  '=ثانيتين', // ar duals
  '=שתי',
  '=שני',
  '=שניים',
  '=שתיים', // he
  '=יומיים',
  '=שבועיים',
  '=חודשיים',
  '=שנתיים',
  '=שעתיים', // he duals
];

/** Phrases meaning "just now". */
const NOW_PHRASES: readonly string[] = [
  '=just now', // en
  '=az önce',
  '=az once',
  '=şimdi', // tr
  '=gerade eben',
  '=jetzt', // de
  '=justo ahora',
  '=ahora mismo', // es
  "=à l'instant", // fr
  '=adesso',
  '=proprio ora', // it
  '=agora mesmo', // pt
  '=zojuist',
  '=zonet', // nl
  '=przed chwilą', // pl
  '=только что', // ru
  '=щойно', // uk
  '=právě teď', // cs
  '=just nu',
  '=nyss', // sv
  '=lige nu', // da
  '=akkurat nå',
  '=nettopp', // nb
  '=juuri nyt',
  '=äsken', // fi
  '=μόλις τώρα', // el
  '=az imént',
  '=épp most', // hu
  '=chiar acum', // ro
  '=baru saja', // id
  '=sebentar tadi', // ms
  '=vừa xong', // vi
  'เมื่อสักครู่', // th
  'たった今', // ja
  '刚刚',
  '剛剛', // zh
  '=방금', // ko
  '=الان', // ar (الآن, folded)
  '=עכשיו',
  '=זה עתה',
  '=כרגע', // he
  '=अभी', // hi
];

const TODAY_PHRASES: readonly string[] = [
  '=today', // en
  '=bugün', // tr
  '=heute', // de
  '=hoy', // es
  "=aujourd'hui", // fr
  '=oggi', // it
  '=hoje', // pt
  '=vandaag', // nl
  '=dzisiaj',
  '=dziś', // pl
  '=сегодня', // ru
  '=сьогодні', // uk
  '=dnes', // cs
  '=idag',
  '=i dag', // sv da nb
  '=tänään', // fi
  '=σήμερα', // el
  '=ma', // hu
  '=azi',
  '=astăzi', // ro
  '=hari ini', // id ms
  '=hôm nay', // vi
  'วันนี้', // th
  '今日', // ja
  '今天', // zh
  '=오늘', // ko
  '=اليوم', // ar
  '=היום', // he
  '=आज', // hi
];

const YESTERDAY_PHRASES: readonly string[] = [
  '=yesterday', // en
  '=dün', // tr
  '=gestern', // de
  '=ayer', // es
  '=hier', // fr
  '=ieri', // it ro
  '=ontem', // pt
  '=gisteren', // nl
  '=wczoraj', // pl
  '=вчера', // ru
  '=вчора',
  '=учора', // uk
  '=včera', // cs
  '=igår',
  '=i går', // sv da nb
  '=eilen', // fi
  '=χθες',
  '=χτες', // el
  '=tegnap', // hu
  '=kemarin', // id
  '=semalam', // ms
  '=hôm qua', // vi
  'เมื่อวาน', // th
  '昨日', // ja
  '昨天', // zh
  '=어제', // ko
  '=امس',
  '=البارحة', // ar (أمس, folded)
  '=אתמול', // he
  '=कल', // hi
];

/** "Edited" markers Google prefixes to the date of an edited review. */
const EDITED_WORDS: readonly string[] = [
  '=edited', // en
  '=düzenlendi', // tr
  '=bearbeitet', // de
  '=editado',
  '=editada', // es pt
  '=modifié',
  '=modifiée', // fr
  '=modificato',
  '=modificata', // it
  '=bewerkt', // nl
  '=edytowano',
  '=edytowane',
  '=edytowana', // pl
  '=изменено',
  '=отредактировано',
  '=изменён', // ru
  '=змінено',
  '=відредаговано', // uk
  '=upraveno', // cs
  '=redigerad',
  '=redigerat',
  '=ändrad', // sv
  '=redigeret', // da
  '=redigert', // nb
  '=muokattu', // fi
  '=επεξεργάστηκε',
  '=τροποποιήθηκε', // el
  '=szerkesztve',
  '=módosítva', // hu
  '=editat',
  '=editată',
  '=modificat', // ro
  '=diedit',
  '=disunting', // id ms
  '=đã chỉnh sửa', // vi
  'แก้ไขแล้ว', // th
  '編集済み', // ja
  '已编辑',
  '已編輯', // zh
  '=수정됨', // ko
  '=تم التعديل',
  '=معدل', // ar
  '=נערך',
  '=ערוך', // he
  '=संपादित', // hi
];

const UNIT_MATCHERS: readonly { unit: Unit; regex: RegExp }[] = (
  Object.keys(UNIT_STEMS) as Unit[]
).flatMap((unit) =>
  UNIT_STEMS[unit].map((stem) => ({
    unit,
    regex: new RegExp(compileTerms([stem], 'prefix').source, 'gu'),
  })),
);
const MARKER_REGEX = compileTerms(AGO_MARKERS);
const ONE_REGEX = compileTerms(ONE_WORDS);
const TWO_REGEX = compileTerms(TWO_WORDS);
const NOW_REGEX = compileTerms(NOW_PHRASES);
const TODAY_REGEX = compileTerms(TODAY_PHRASES);
const YESTERDAY_REGEX = compileTerms(YESTERDAY_PHRASES);
const EDITED_REGEX = new RegExp(compileTerms(EDITED_WORDS).source, 'gu');

/** Largest amount accepted; anything bigger is not a relative date. */
const MAX_AMOUNT = 9999;
const DAY_MS = 86_400_000;

/**
 * Drops an "Edited" prefix in any language: everything up to the last ":"
 * (Turkish "Düzenlendi: 2 hafta önce") and the known "edited" words.
 */
function stripEdited(text: string): string {
  const colon = text.lastIndexOf(':');
  const afterColon = colon >= 0 ? text.slice(colon + 1).trim() : text;
  const base = afterColon.length > 0 ? afterColon : text;
  return base.replace(EDITED_REGEX, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The unit whose stem matches: the longest match wins ("hour" over the French
 * year "an" in "an hour ago", "週間" over "週"), ties go to the last occurrence.
 */
function unitOf(text: string): Unit | null {
  let best: { unit: Unit; index: number; length: number } | null = null;
  for (const { unit, regex } of UNIT_MATCHERS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const length = match[0].length;
      if (
        best === null ||
        length > best.length ||
        (length === best.length && match.index > best.index)
      ) {
        best = { unit, index: match.index, length };
      }
      if (length === 0) regex.lastIndex += 1;
    }
  }
  return best?.unit ?? null;
}

function amountOf(text: string): number | null {
  const numeral = /\d+/.exec(text);
  if (numeral) {
    const value = Number(numeral[0]);
    return value <= MAX_AMOUNT ? value : null;
  }
  if (ONE_REGEX.test(text)) return 1;
  if (TWO_REGEX.test(text)) return 2;
  // A bare unit ("tydzień temu", "неделю назад", "قبل شهر") means one.
  return 1;
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

function subtract(now: Date, unit: Unit, amount: number): Date {
  switch (unit) {
    case 'second':
      return new Date(now.getTime() - amount * 1000);
    case 'minute':
      return new Date(now.getTime() - amount * 60_000);
    case 'hour':
      return new Date(now.getTime() - amount * 3_600_000);
    case 'day':
      return new Date(now.getTime() - amount * DAY_MS);
    case 'week':
      return new Date(now.getTime() - amount * 7 * DAY_MS);
    case 'month':
      return subtractCalendar(now, amount);
    case 'year':
      return subtractCalendar(now, amount * 12);
  }
}

export function formatUtcDay(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a relative date string in any supported UI language to a
 * "YYYY-MM-DD" calendar day in UTC. "Edited" prefixes and suffixes such as
 * "on Google" are ignored; "yesterday" counts as one day. Returns null when
 * no unit with a past marker (or no now/today/yesterday phrase) is found.
 */
export function parseRelativeDate(text: string, now: Date): string | null {
  if (Number.isNaN(now.getTime())) return null;
  const normalised = stripEdited(foldText(text));
  if (normalised.length === 0) return null;

  if (MARKER_REGEX.test(normalised)) {
    const unit = unitOf(normalised);
    const amount = amountOf(normalised);
    if (unit !== null && amount !== null) return formatUtcDay(subtract(now, unit, amount));
  }
  if (YESTERDAY_REGEX.test(normalised)) return formatUtcDay(new Date(now.getTime() - DAY_MS));
  if (NOW_REGEX.test(normalised) || TODAY_REGEX.test(normalised)) return formatUtcDay(now);
  return null;
}

/** Any valid instant works as the reference for a yes/no check. */
const REFERENCE_DATE = new Date(Date.UTC(2000, 0, 1));

/** Whether the text reads as a relative date in any supported language. */
export function isRelativeDate(text: string): boolean {
  return parseRelativeDate(text, REFERENCE_DATE) !== null;
}
