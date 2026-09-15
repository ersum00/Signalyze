# Yöntem

_İngilizce özgün metnin çevirisidir; referans sürüm İngilizce metindir._

_Motor sürümü 1.2.0. Bu belge, her sinyalin ve Signalyze Skoru'nun nasıl hesaplandığına ilişkin tek doğruluk kaynağıdır. Sitedeki `/methodology` sayfası bu belgeden üretilir; `packages/signals` (TypeScript) ve `apps/api/signalyze_api/engine` (Python) içindeki kod tam olarak burada yazılanı uygular ve her iki uygulama da aynı test fikstürleriyle sınanır._

Signalyze, bir Google Haritalar işletme sayfasında görünen yorumlardan on deterministik sinyal hesaplar. Her sinyal, ölçülen değerin tipik yorumlanmış yerlere kıyasla ne kadar sıra dışı olduğunu ifade eden 0 ile 1 arası bir sayıdır; 0 "dikkat çekmeyen", 1 "gördüğümüz en sıra dışı düzeyde" anlamına gelir. Signalyze Skoru (0-100), hesaplanabilen sinyallerin ağırlıklı bir birleşimidir. Hiçbir dil modeli işin içinde değildir ve niyet hakkında hiçbir çıkarım yapılmaz: her sinyal, herkesin aynı sayfadan yeniden hesaplayabileceği, kamuya açık verinin dağılımına ilişkin bir olgudur.

**Bu skor kamuya açık yorum verisinin istatistiksel özetidir; işletme veya yorumcu hakkında bir iddia değildir.**

## Girdi

Motor, yorum başına şunları alır: yıldız puanı (1-5), takvim günü, metin, yorumcunun herkese açık yorum sayısı (görünüyorsa), fotoğraf sayısı, Yerel Rehber seviyesi (görünüyorsa), işletme yanıtı metni (varsa). Asla ad, profil bağlantısı veya kullanıcı kimliği almaz. Bkz. [Gizlilik](/tr/privacy).

Uzantı, Google'ın varsayılan "En alakalı" sıralamasında varsayılan olarak 200 yorum, kullanıcı ana görünümde öyle seçerse 500, 1000 ya da sayfadaki tüm yorumları (en fazla 2000) yükler; dolayısıyla örneklem, yorum geçmişinin Google'ın önce göstermeyi seçtiği kısmıdır, rastgele ya da kronolojik bir örneklem değildir. Bir dönem seçildiğinde (bu yıl, son 12, 6 ya da 3 ay, bu ay) uzantı önce Google'ın sıralamasını "En yeni"ye çevirir (sıralama denetimi tanınmazsa "En alakalı" sıralamasında kalır ve bunu sonuçta belirtir), art arda iki kaydırma turu yalnızca dönemden eski yorumlar eklediğinde yüklemeyi durdurur ve yalnızca dönemin ilk gününde ya da sonrasında tarihlenmiş yorumları (UTC'ye göre hesaplanır) tutar. Böyle bir dönem profili tarayıcıda, paketlenmiş motorla yerel olarak hesaplanır, sunucuya asla gönderilmez ve tüm zamanlar profilinden ayrı önbelleğe alınır; böylece tüm zamanlar profili ve sayfadaki rozet değişmez. Paylaşılan sunucu önbelleğini yalnızca tüm zamanlar analizleri kullanır. Sinyaller yüklenen örneklem üzerinden hesaplanır ve yan panel her zaman gösterilen toplamın ne kadarının analiz edildiğini belirtir.

## Ön işleme

- **Tarihler** tarayıcıda göreli etiketlerden ("2 hafta önce") ayrıştırılır ve bir takvim gününe yuvarlanır. Ay çıkarma takvim temellidir; bu yüzden 31 Mayıs'ta "3 ay önce", 28 ya da 29 Şubat'tır.
- **Metin normalleştirme**: Unicode NFKC, küçük harf; harf, rakam veya boşluk olmayan her karakter boşluğa dönüşür, boşluklar birleştirilir, baş ve son boşluklar kırpılır. Uzunluklar Unicode kod noktası olarak sayılır.
- **Bir metnin dili** iki adımda belirlenir. Önce harflerin yazı sistemine bakılır: kana varsa Japonca, Hangıl varsa Korece, (kana olmadan) Han karakteri varsa Çince, Arap harfi varsa Arapça sayılır. Kiril harfli metinler Rusça ile Ukraynaca arasında, Latin harfli metinler ise İngilizce, İspanyolca, Portekizce, Fransızca, Almanca, İtalyanca, Türkçe, Felemenkçe, Lehçe, Endonezce, Vietnamca ve İsveççe arasında küçük durak kelime listeleriyle oylanır (en çok eşleşen kazanır; eşitlikte bu sıra geçerlidir; hiç eşleşme yoksa sırasıyla Rusça ya da İngilizce seçilir). Başka yazı sistemlerindeki metinler (Tayca, Devanagari, Yunanca, İbranice, ...) sözlük almaz. Dil yalnızca hangi kalıp ifade sözlüğünün ve ton sözlüğünün uygulanacağını belirler; hiçbir zaman raporlanmaz.
- Yorumlar sabit bir sırayla işlenir, toplamlar bu sırayla biriktirilir ve raporlanan her sayı altı ondalık basamağa yarım yukarı yuvarlanır; böylece TypeScript ve Python uygulamaları birebir aynı çıktıyı üretir.

## Ölçümden "sıra dışılığa"

Her sinyal bir ham ölçüm üretir (çoğunlukla 0 ile 1 arası bir pay) ve bunu iki kalibrasyon noktası arasında doğrusal bir rampayla sıra dışılığa eşler:

```
unusualness = clamp((value - low) / (high - low), 0, 1)
```

`low`, sinyalin sayılmaya başladığı düzeydir (tipik yerler bu düzeyde ya da altındadır); `high`, sinyalin tam olarak sayıldığı düzeydir. Kalibrasyon noktaları `packages/signals/data/thresholds.json` dosyasında bulunur ve aşağıda sinyal başına listelenir. Bunlar, kamuya açık Google Haritalar yorum verisinin şeklinden ve sentetik veri kümelerinden seçilmiş motor sürümü 1.2.0 tahminleridir; yeni motor sürümleriyle gözden geçirilecek ve her değişiklik sürüm notlarına kaydedilecektir.

## Sinyaller

### 1. `burst_ratio` (ağırlık 0,16)

**Ölçer:** en yoğun tek bir 14 günlük pencereye düşen yorumların payı.

**Nasıl:** yorum günlerini sırala; 14 günlük bir pencereyi kaydır ve en yüksek sayıyı al; `peakShare = peak / n`. Yerin ömrü boyunca eşit bir akış, herhangi bir pencereye `expectedShare = 14 / lifespanDays` oranında yorum düşürürdü; bunun üzerindeki fazlalık `excess = (peakShare - expectedShare) / (1 - expectedShare)` olur. Tüm geçmiş 14 güne sığıyorsa karşılaştırılacak bir şey yoktur ve fazlalık 0'dır.

**Rampa:** `excess` 0,05'ten 0,65'e.

**Neden önemli:** yerleşik işletmelerde yorum akışı zamana yayılır; tüm yorumların büyük bir kısmının iki hafta içinde gelmesi ölçülebilir ve nadirdir. Ayrıntılar pencerenin tarihlerini içerir; böylece sayfada doğrulanabilir.

### 2. `rating_polarity` (ağırlık 0,08)

**Ölçer:** tüm puanlar içinde 5 yıldız artı 1 yıldızlı puanların payı.

**Nasıl:** `share = (count5 + count1) / n`.

**Rampa:** 0,82'den 0,96'ya. Google puanları 5 yıldıza güçlü biçimde yığılır; bu nedenle yüksek bir kutuplaşma payı normaldir; yalnızca 2-4 yıldızdan neredeyse tamamen kaçınan dağılımlar sayılır.

**Neden önemli:** iki uçta toplanmış bir dağılım, çoğu yerdeki düzgün, 5 ağırlıklı şekilden farklıdır.

### 3. `single_review_accounts` (ağırlık 0,14)

**Ölçer:** herkese açık yorum sayısı 0 veya 1 olan yorumcuların payı.

**Nasıl:** sayının görünür olduğu yorumlar arasında `share = count(reviewCount <= 1) / known`. En az 15 bilinen sayı gerekir; aksi halde mevcut değildir.

**Rampa:** 0,30'dan 0,75'e.

**Neden önemli:** Google yorumcularının çoğu birden fazla yorum yazmıştır. Tek yorumu bu olan yorumcuların payının yüksek olması, bu tabandan ölçülebilir bir farktır.

### 4. `no_photo_short_text` (ağırlık 0,08)

**Ölçer:** fotoğrafı olmayan ve 40 karakterden kısa metin içeren yorumların payı.

**Nasıl:** `share = count(photoCount == 0 and textLength < 40) / n`.

**Rampa:** 0,60'tan 0,95'e. Yalnızca puandan oluşan yorumlar Google'da yaygındır; bu yüzden sadece çok yüksek bir pay sayılır.

**Neden önemli:** fotoğraf ve uzun metin çaba ister; neredeyse hiç bulunmamaları ölçülebilir.

### 5. `text_similarity` (ağırlık 0,16)

**Ölçer:** yorum metinlerinin birbiriyle ne kadar örtüştüğü.

**Nasıl:** en az 20 karakter normalleştirilmiş metni olan her yorum için karakter 3-gram kümesini (boşluklar dahil) oluştur. Her çift için Jaccard benzerliğini `|A ∩ B| / |A ∪ B|` hesapla. Tüm çiftler üzerindeki ortalamayı ve 0,5'in üzerindeki çiftlerin payını ("neredeyse birebir aynı çiftler") raporla. En az 10 uygun metin gerekir. En fazla 600 uygun metin karşılaştırılır: 600'ün üzerinde eşit aralıklı bir alt küme kullanılır (girdi sırasında floor(i × n / 600) dizinindeki metin, i = 0 … 599); TypeScript ve Python motorları aynı dizinleri seçer ve gerçekten karşılaştırılan metin sayısı ayrıntılarda `sampled` olarak raporlanır. Diğer tüm sinyaller her yorum üzerinde çalışır.

**Rampa:** ortalama Jaccard için 0,18'den 0,45'e ve neredeyse birebir aynı çift payı için 0,02'den 0,15'e; ikisinden büyük olanı alınır.

**Neden önemli:** aynı yer hakkında bağımsız yazılmış metinler bazı kelimeleri paylaşır ama 3-gram düzeyinde çok az parça ortaktır. Yüksek örtüşme dilden bağımsız olarak ölçülebilir.

### 6. `template_phrases` (ağırlık 0,08)

**Ölçer:** metni çoğunlukla kalıp ifadelerden oluşan yorumların payı.

**Nasıl:** dil başına yaygın kalıp ifadelerden oluşan bir sözlük ("highly recommend", "kesinlikle tavsiye ederim", "sehr zu empfehlen", "muy recomendable", "je recommande", "また来たい", "强烈推荐", ...) normalleştirilmiş metinde kelime sınırlarıyla eşleştirilir; boşluksuz yazılan Japonca ve Çince için ifadeler düz alt dize olarak eşleştirilir. Eşleşen ifadeler karakterlerinin en az %50'sini kapsıyorsa yorum kalıp temellidir. `share = phraseBased / withText`. Metin içeren en az 10 yorum gerekir. Dili için sözlük bulunmayan metinler `withText` içinde sayılır ama hiçbir zaman kalıp temelli olmaz. En sık üç ifade raporlanır.

**Rampa:** 0,15'ten 0,50'ye.

**Neden önemli:** kalıp ifadeler sıradan yorumlarda da yaygındır; bu yüzden yalnızca çoğunluğu kalıp ifade olan metinler sayılır ve yalnızca bunların metinler içindeki payı önemlidir.

### 7. `rating_text_mismatch` (ağırlık 0,08)

**Ölçer:** metnin tonunun yıldız puanıyla ne sıklıkla uyuşmadığı.

**Nasıl:** dil başına küçük bir olumlu ve olumsuz kelime sözlüğü, bir yorumun kelimeleri üzerinden `tone = (positive - negative) / (positive + negative)` verir. Japonca ve Çince için sözlük girdileri normalleştirilmiş metnin alt dizeleri olarak, en uzun girdiden başlayarak eşleştirilir; her girdi bir kez sayılır ve daha kısa girdiler denenmeden önce metinden çıkarılır, böylece olumsuz listedeki 不好吃 gibi olumsuzlanmış bir biçim ayrıca 好吃 olarak sayılmaz. Sözlükte hiç eşleşmesi olmayan yorumlar ve dili için sözlük bulunmayan metinler puanlanmaz. Uyuşmazlık, tonu ≤ -0,5 olan 4 veya 5 puan ya da tonu ≥ 0,5 olan 1 veya 2 puandır. `share = mismatches / scored`. En az 10 puanlanmış yorum gerekir.

**Rampa:** 0,10'dan 0,35'e. Sözlük olumsuzlama ve ironiyi işlemez; bu yüzden belirli bir uyuşmazlık tabanı beklenir ve sayılmaz.

**Neden önemli:** metin ve yıldızlar normalde uyuşur; sistematik uyuşmazlık ölçülebilir.

### 8. `date_entropy` (ağırlık 0,08)

**Ölçer:** yorumların ilk ve son yorum arasındaki aylara ne kadar eşit yayıldığı.

**Nasıl:** takvim ayı başına yorumları say; aylar üzerinden Shannon entropisi `H = -Σ p_i log2 p_i`, `log2(monthsInSpan)` ile normalleştirilir. 1 tamamen eşit, 0 her şeyin tek bir ayda olduğu anlamına gelir. En az 3 aylık bir aralık gerekir. En yoğun ay ve payı raporlanır.

**Rampa:** `1 - normalisedEntropy` 0,25'ten 0,65'e.

**Neden önemli:** `burst_ratio`'yu ay ölçeğinde tamamlar; mevsimlik işletmelerde entropi biraz daha düşüktür ve rampa bunu tolere eder.

### 9. `local_guide_ratio` (ağırlık 0,06)

**Ölçer:** seviye 3 ve üzeri Yerel Rehberler tarafından yazılmış yorumların payı.

**Nasıl:** yalnızca sayfa en az bir yorumcu için seviye gösterdiğinde hesaplanır; aksi halde mevcut değildir, çünkü eksik bir seviye "Yerel Rehber değil" durumundan ayırt edilemez. `share = count(level >= 3) / n`. Sıra dışı yön düşük paydır.

**Rampa:** eksik `0.20 - share` 0'dan 0,20'ye (pay 0 → 1, pay ≥ 0,20 → 0).

**Neden önemli:** yerleşik Yerel Rehberler çoğu yerde yorumcu karışımının olağan bir parçasıdır.

### 10. `owner_response_pattern` (ağırlık 0,08)

**Ölçer:** işletme yanıtlarının ne ölçüde birbirinin aynısı olduğu.

**Nasıl:** işletme yanıtı olan yorumlar arasında normalleştirilmiş yanıtları grupla; `identicalShare = 1 - distinct / responded`. En az 5 yanıt gerekir. Yanıt oranı ve en büyük grubun payı raporlanır.

**Rampa:** 0,60'tan 0,95'e. Birçok işletme tek bir teşekkür cümlesini yeniden kullanır; bu yüzden yalnızca neredeyse tam tekrar sayılır.

**Neden önemli:** sayfanın nasıl yönetildiğine dair küçük, ölçülebilir bir yöndür; düşük ağırlıklıdır.

## Signalyze Skoru

```
score = round( 100 × Σ (w_i × u_i) / Σ w_i )   over available signals i
```

Ağırlıklar (`packages/signals/src/weights.json`, sürüm 1.2.0):

| Sinyal                 | Ağırlık |
| ---------------------- | ------- |
| burst_ratio            | 0.16    |
| text_similarity        | 0.16    |
| single_review_accounts | 0.14    |
| rating_polarity        | 0.08    |
| no_photo_short_text    | 0.08    |
| template_phrases       | 0.08    |
| rating_text_mismatch   | 0.08    |
| date_entropy           | 0.08    |
| owner_response_pattern | 0.08    |
| local_guide_ratio      | 0.06    |

Ağırlıklar, yer için mevcut olan sinyaller üzerinden yeniden normalleştirilir; böylece hesaplanamayan bir sinyal (örneğin Yerel Rehber seviyeleri gösterilmediği için) skoru hiçbir yönde hareket ettirmez. Skor ağırlıklı bir ortalamadır; dolayısıyla tek bir sinyal skoru en fazla kendi ağırlık payı kadar yükseltebilir: aşırı bir yoğunlaşma dışında sıra dışı hiçbir şeyi olmayan bir yer 90'a değil, 25 civarına düşer. Bu kasıtlıdır; yan panel her sinyali ayrı ayrı gösterir, böylece okuyucu hangisinin sorumlu olduğunu görür.

**15 yorumun altında skor yok.** Daha az yorumla yukarıdaki paylar aşırı dalgalanır; bu yüzden uzantı "yetersiz veri" gösterir ve sayı vermez.

## Sentetik veri kümeleri nasıl görünür

Motor, testlerde ve uygulamalar arası fikstür olarak kullanılan tohumlu sentetik veri kümeleriyle gelir (`packages/signals/fixtures/`). Motor 1.2.0'daki skorları, fikir vermesi için:

| Veri kümesi  | Açıklama                                                                                              | Skor                             |
| ------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| normal       | üç yıla yayılan düzenli akış, karışık puanlar, doğal metinler                                         | 1-3                              |
| polarized    | çoğunlukla 5 ve 1 yıldızlı puanlar                                                                    | 7-12                             |
| burst        | yorumların %60'ı tek bir 14 günlük pencerede, çoğunlukla tek yorumlu hesaplar                         | 24                               |
| template     | kalıp ifadeli metinler, neredeyse birebir aynı metinler, tek yorumlu hesaplar, aynı işletme yanıtları | 43-53                            |
| sparse       | yalnızca puanlar, metin veya yorumcu verisi yok                                                       | 21 (yalnızca dört sinyal mevcut) |
| multilingual | kapsanan 18 dilin tümünde, ayrıca Tayca, Hintçe ve Yunanca doğal ve kalıp ifadeli metinler            | 4                                |

## Sınırlamalar

- Tüm yorumlar yüklenmedikçe örneklem, tam geçmiş değil, Google'ın "En alakalı" sıralamasıdır (dönem seçildiğinde "En yeni"); 2000'den fazla yorumu olan bir yer hiçbir zaman tamamen yüklenmez.
- Göreli tarihler hassasiyeti yeni yorumlar için yaklaşık bir güne, eski yorumlar için bir aya veya bir yıla sınırlar.
- Dönem yaklaşıktır: Google tarihleri göreli gösterir ("2 ay önce"), bu yüzden dönem sınırı kendileri yuvarlanmış tarihlere uygulanır.
- Sözlükler ve kalıp ifade sözlükleri 18 dili kapsar: İngilizce, İspanyolca, Portekizce, Fransızca, Almanca, İtalyanca, Türkçe, Felemenkçe, Lehçe, Endonezce, Vietnamca, İsveççe, Rusça, Ukraynaca, Arapça, Japonca, Çince ve Korece. Diğer dillerdeki metinler zamanlama, puan ve yorumcu sinyallerine katkıda bulunur ama metin sinyallerine katkıda bulunmaz (kapsanmayan bir dildeki Latin harfli metin, nadiren eşleşen İngilizce sözlüklere düşer). Sözlükler küçüktür ve yalnızca yüzey biçimlerini eşleştirir; kök bulma, olumsuzlama işleme ya da ironi algılama yoktur, bu yüzden çekimi yoğun dillerde metin başına daha az eşleşme olur.
- Yerel Rehber seviyeleri yorum listesinde çoğu zaman gösterilmez; sinyal bu durumda tahmin edilmek yerine mevcut değildir.
- Kalibrasyon noktaları sürüm 1.2.0 tahminleridir. Herhangi birini değiştirmek bir motor sürümü artışıdır, sürüm notlarına kaydedilir ve sunucu önbelleği motor sürümüyle anahtarlanır.

## İsteğe bağlı dil modeli (varsayılan olarak kapalı)

Motor 1.2.0, operatör tarafından etkinleştirilebilen isteğe bağlı bir sunucu tarafı adım içerir: `text_similarity` zaten yüksek olduğunda en fazla 30 metin (yorumcu verisi olmadan) OpenAI uyumlu bir uç noktaya gönderilir; uç nokta 0-1 arası bir "yazım türdeşliği" tahmini olan tek bir sayı döndürür ve bu, `text_similarity` ayrıntılarında `llmHomogeneity` olarak raporlanır. Tek tek yorumları asla etiketlemez ve bu sürümde skoru asla değiştirmez. Hem `LLM_BASE_URL` hem de `LLM_API_KEY` yapılandırılmadıkça devre dışıdır; herkese açık Signalyze API'si şu anda bu özellik kapalı olarak çalışır.
