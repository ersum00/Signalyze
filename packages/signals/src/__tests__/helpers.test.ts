import { describe, expect, it } from 'vitest';
import {
  addMonths,
  dayNumber,
  entropyBits,
  median,
  monthsBetweenInclusive,
  ramp,
  round6,
  roundHalfUp,
} from '../math';
import { toneOf } from '../signals/rating-text-mismatch';
import {
  charNgrams,
  containsPhrase,
  detectLanguage,
  jaccard,
  matchesPhrase,
  normalizeText,
  tokenize,
} from '../text';

describe('math helpers', () => {
  it('ramp is 0 below low, 1 above high, linear between', () => {
    expect(ramp(0.1, 0.2, 0.6)).toBe(0);
    expect(ramp(0.4, 0.2, 0.6)).toBeCloseTo(0.5, 12);
    expect(ramp(0.9, 0.2, 0.6)).toBe(1);
  });

  it('rounds half up, not to even', () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(round6(0.1234565)).toBe(0.123457);
  });

  it('median handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('entropy of a uniform vector is log2(k)', () => {
    expect(entropyBits([5, 5, 5, 5])).toBeCloseTo(2, 12);
    expect(entropyBits([10, 0, 0])).toBe(0);
  });

  it('day and month arithmetic', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('2026-03-01') - dayNumber('2026-02-01')).toBe(28);
    expect(monthsBetweenInclusive('2025-11', '2026-02')).toBe(4);
    expect(addMonths('2025-11', 3)).toBe('2026-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
});

describe('text helpers', () => {
  it('normalises case, punctuation and whitespace', () => {
    expect(normalizeText('  Great   place!!! Loved it. ')).toBe('great place loved it');
    expect(normalizeText('Güler YÜZLÜ personel, teşekkürler!')).toBe(
      'güler yüzlü personel teşekkürler',
    );
    expect(normalizeText('とても美味しかったです。また来たい！')).toBe(
      'とても美味しかったです また来たい',
    );
  });

  it('builds character trigrams over code points', () => {
    const grams = charNgrams('abcd', 3);
    expect([...grams]).toEqual(['abc', 'bcd']);
    expect(charNgrams('ab', 3).size).toBe(0);
    expect(charNgrams('😀😀😀😀', 3).size).toBe(1);
  });

  it('jaccard of identical sets is 1 and of disjoint sets is 0', () => {
    const a = charNgrams('great place', 3);
    expect(jaccard(a, a)).toBe(1);
    expect(jaccard(a, charNgrams('xyzxyz', 3))).toBe(0);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it('matches phrases on word boundaries or as plain substrings', () => {
    expect(containsPhrase('highly recommend this', 'highly recommend')).toBe(true);
    expect(containsPhrase('highly recommended', 'highly recommend')).toBe(false);
    expect(matchesPhrase('highly recommended', 'highly recommend', 'word')).toBe(false);
    expect(matchesPhrase('highly recommended', 'highly recommend', 'substring')).toBe(true);
    expect(matchesPhrase('とても美味しかったです', '美味しかったです', 'substring')).toBe(true);
    expect(matchesPhrase('とても美味しかったです', '美味しかったです', 'word')).toBe(false);
  });

  it('tone in substring mode counts entries longest first and consumes matches', () => {
    expect(toneOf('很好吃', [], 'zh')).toBe(1);
    expect(toneOf('不好吃', [], 'zh')).toBe(-1);
    expect(toneOf('菜不好吃 但是服务很好吃', [], 'zh')).toBe(0);
    expect(toneOf('親切でした', [], 'ja')).toBe(1);
    expect(toneOf('不親切でした', [], 'ja')).toBe(-1);
    expect(toneOf('今日は雨', [], 'ja')).toBeNull();
    expect(toneOf('great', ['great'], 'other')).toBeNull();
    const en = normalizeText('Great food but slow service');
    expect(toneOf(en, tokenize(en), 'en')).toBe(0);
  });
});

describe('detectLanguage', () => {
  const detect = (text: string) => detectLanguage(normalizeText(text));

  it('votes with stopwords among Latin-script languages, defaulting to en', () => {
    expect(detect('Wir waren sehr zufrieden und kommen gerne wieder')).toBe('de');
    expect(detect('Bu yer çok güzel ve personel çok ilgili')).toBe('tr');
    expect(detect('La comida es muy buena y el trato es genial')).toBe('es');
    expect(detect('The staff was very kind and the food was great')).toBe('en');
    expect(detect('Le service est rapide et le personnel est très sympathique')).toBe('fr');
    expect(detect('Il personale è gentile e il cibo è ottimo')).toBe('it');
    expect(detect('O atendimento foi excelente e a comida é muito boa')).toBe('pt');
    expect(detect('Het eten was heerlijk en de bediening was erg vriendelijk')).toBe('nl');
    expect(detect('Jedzenie było pyszne i obsługa bardzo miła')).toBe('pl');
    expect(detect('Makanannya enak dan pelayanannya sangat ramah')).toBe('id');
    expect(detect('Đồ ăn rất ngon và nhân viên rất nhiệt tình')).toBe('vi');
    expect(detect('Maten var god och personalen var mycket trevlig')).toBe('sv');
    expect(detect('Lorem ipsum dolor sit amet')).toBe('en');
    expect(detect('12 34')).toBe('other');
    expect(detect('')).toBe('other');
  });

  it('decides by script first for Cyrillic, Arabic, kana, Han and Hangul', () => {
    expect(detect('Очень вкусно и приветливый персонал, рекомендую')).toBe('ru');
    expect(detect('Дуже смачно і привітний персонал, рекомендую')).toBe('uk');
    expect(detect('Вкусно')).toBe('ru');
    expect(detect('الأكل لذيذ والخدمة ممتازة')).toBe('ar');
    expect(detect('料理がとても美味しかったです')).toBe('ja');
    expect(detect('ラーメン最高')).toBe('ja');
    expect(detect('服务很好，菜很好吃')).toBe('zh');
    expect(detect('음식이 맛있고 직원분들이 친절해요')).toBe('ko');
    expect(detect('Отличное место, Starbucks рядом')).toBe('ru');
    expect(detect('服务很好 Starbucks')).toBe('zh');
  });

  it("returns 'other' for scripts without a dictionary", () => {
    expect(detect('อาหารอร่อยมาก พนักงานบริการดี')).toBe('other');
    expect(detect('खाना बहुत स्वादिष्ट था')).toBe('other');
    expect(detect('Το φαγητό ήταν υπέροχο')).toBe('other');
    expect(detect('האוכל היה מצוין')).toBe('other');
    expect(detect('Το φαγητό ήταν υπέροχο, ok')).toBe('other');
  });
});
