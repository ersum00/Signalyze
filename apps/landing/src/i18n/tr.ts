import type { Dictionary } from './types';

/** Turkish site copy. Terminology follows apps/extension/src/i18n/tr.json. */
export const tr: Dictionary = {
  'nav.methodology': 'Yöntem',
  'nav.privacy': 'Gizlilik',
  'nav.changelog': 'Sürüm notları',
  'nav.addToChrome': "Chrome'a ekle",
  'nav.skip': 'İçeriğe atla',
  'nav.main': 'Ana menü',
  'nav.language': 'Dil',

  'meta.home.title':
    'Signalyze: Google Haritalar’daki her işletme için istatistiksel bir Yorum Profili',
  'meta.home.description':
    'Google Haritalar’daki herhangi bir işletme için istatistiksel bir Yorum Profili gösteren ücretsiz Chrome uzantısı: ölçülebilir on sinyal, 0 ile 100 arası bir Signalyze Skoru’nda birleşir. Hesap yok, izleme yok.',
  'meta.methodology.title': 'Yöntem',
  'meta.methodology.description':
    'On Signalyze sinyalinin ve 0 ile 100 arası Signalyze Skoru’nun nasıl hesaplandığı: formüller, eşikler ve ağırlıklar.',
  'meta.privacy.title': 'Gizlilik',
  'meta.privacy.description':
    'Signalyze uzantısı ve API’si verilerle tam olarak ne yapar: ne gönderilir, ne asla gönderilmez, ne saklanır ve ne kadar süreyle.',
  'meta.changelog.title': 'Sürüm notları',
  'meta.changelog.description': 'Signalyze uzantısı, API’si ve sitesi için sürüm notları.',
  'meta.notFound.title': 'Sayfa bulunamadı',
  'meta.notFound.description': 'Bu adreste bir sayfa yok.',

  'hero.eyebrow': 'ücretsiz chrome uzantısı · google haritalar',
  'hero.title': 'Yıldız puanının arkasındaki istatistik.',
  'hero.lead':
    'Signalyze, bir Google Haritalar sayfasında zaten bulunan yorumları bir Yorum Profili’ne dönüştürür: zaman yoğunlaşmasından metin benzerliğine kadar ölçülebilir on sinyal, 0 ile 100 arası bir Signalyze Skoru’nda birleşir. Hesap yok, izleme yok.',
  'hero.methodology': 'Yöntemi okuyun',
  'hero.readouts.label': 'Örnek sinyal değerleri',
  'hero.readouts.eyebrow': 'bir sinyal nasıl görünür',
  'hero.readouts.burst': 'oranındaki yorum tek bir {days} günlük pencerede yazılmış',
  'hero.readouts.single': 'oranındaki yorumcunun başka yorumu yok',
  'hero.readouts.overlap': 'yorum metinleri arasındaki ortalama karakter {n}-gram örtüşmesi',
  'hero.readouts.note':
    'Kamuya açık verinin dağılımına ilişkin ifadeler. Herkes aynı sayfadan yeniden hesaplayabilir.',

  'how.eyebrow': '3 adım',
  'how.title': 'Nasıl çalışır',
  'how.step1.title': 'Google Haritalar’da bir işletme açın',
  'how.step1.text':
    'En az {min} yorumu olan herhangi bir işletme sayfası. Siz istemedikçe Signalyze hiçbir şey yapmaz.',
  'how.step2.title': 'Analiz et’e tıklayın',
  'how.step2.text':
    'Uzantı, Google’ın zaten oluşturduğu yorum panelini kaydırır ve varsayılan olarak {limit} yorumu, isterseniz sayfadaki tüm yorumları (en fazla {ceiling}) ve yalnızca seçtiğiniz dönemi okur. Asla başka bir sayfa açmaz.',
  'how.step3.title': 'Yorum Profili’ni okuyun',
  'how.step3.text':
    'Yan panel skoru, on sinyali, aylık yorum sayısını, puan dağılımını ve yorumcu özetini her biri sade bir dille açıklanmış olarak gösterir.',

  'see.eyebrow': 'yan panel',
  'see.title': 'Ne görürsünüz',
  'see.score.title': 'Skor ve on sinyal',
  'see.score.text':
    '0 ile 100 arası bir Signalyze Skoru ve altında değeriyle birlikte her sinyal. Her birinin sade bir açıklaması ve formülüne bir bağlantısı vardır.',
  'see.monthly.title': 'Aylık yorum sayısı',
  'see.monthly.text': 'Her ay kaç yorum geldiği; böylece bir yoğunlaşma tek bakışta görünür.',
  'see.rating.title': 'Puan dağılımı',
  'see.rating.text':
    'Yıldızların 5’ten 1’e nasıl dağıldığı. İki uçta toplanmış bir şekil, düzgün bir şekilden farklı görünür.',
  'see.reviewers.title': 'Yorumcu profili',
  'see.reviewers.text':
    'Kaç yorumcunun yalnızca bu yorumu olduğu, kaçının yerleşik Yerel Rehber olduğu ve kaçının fotoğrafsız ve kısa metinle yazdığı.',

  'shots.eyebrow': 'ekran görüntüleri',
  'shots.title': 'Nasıl görünür',
  'shots.alt': 'Signalyze ekran görüntüsü {n}',
  'shots.alt.score': 'Signalyze Skoru ve on sinyalin yer aldığı yan panel',
  'shots.alt.signals': 'Değeri ve açıklaması gösterilen, genişletilmiş bir sinyal',
  'shots.alt.charts': 'Aylık yorum sayısı ve puan dağılımı grafikleri',
  'shots.alt.reviewers': 'Yorumcu özeti',
  'shots.alt.consent': 'İlk analizden önceki tek seferlik onay ekranı',
  'shots.alt.settings': 'Ayarlar ekranı',

  'signals.eyebrow': '10 sinyal · motor {version}',
  'signals.title': 'On sinyal',
  'signals.lead':
    'Her sinyal, ölçülen büyüklüğün tipik yorumlanmış yerlere kıyasla ne kadar sıra dışı olduğunu ifade eden 0 ile 1 arası bir değerdir. Niyet hakkında hiçbir çıkarım yapılmaz; her biri kamuya açık verinin dağılımına ilişkin bir olgudur.',
  'signals.more': 'Formüller, ağırlıklar ve eşikler: <a href="{url}">yöntem</a>.',

  'signal.burst_ratio.title': 'Yoğunlaşma oranı',
  'signal.burst_ratio.description':
    'En yoğun tek bir {days} günlük pencereye düşen yorumların payı; işletmenin yorum geçmişinin uzunluğuna göre.',
  'signal.rating_polarity.title': 'Puan kutuplaşması',
  'signal.rating_polarity.description':
    'Puan dağılımının 2-4 yıldıza kıyasla 5 ve 1 yıldızda ne kadar toplandığı.',
  'signal.single_review_accounts.title': 'Tek yorumlu hesaplar',
  'signal.single_review_accounts.description':
    'Herkese açık profilinde bu yorum dışında tek bir yorum bulunan ya da hiç yorum bulunmayan yorumcuların payı.',
  'signal.no_photo_short_text.title': 'Fotoğrafsız, kısa metin',
  'signal.no_photo_short_text.description':
    'Fotoğrafı olmayan ve {chars} karakterden kısa metin içeren yorumların payı.',
  'signal.text_similarity.title': 'Metin benzerliği',
  'signal.text_similarity.description':
    'Yorum metinleri arasındaki ortalama karakter {n}-gram örtüşmesi ve neredeyse birebir aynı çiftlerin payı.',
  'signal.template_phrases.title': 'Kalıp ifadeler',
  'signal.template_phrases.description':
    'Metinlerin dile özgü bir sözlükteki kalıp ifadeleri ne sıklıkla yeniden kullandığı.',
  'signal.rating_text_mismatch.title': 'Puan ve metin uyuşmazlığı',
  'signal.rating_text_mismatch.description':
    'Bir sözlükle ölçülen metin tonunun yıldız puanıyla ne sıklıkla uyuşmadığı.',
  'signal.date_entropy.title': 'Tarih entropisi',
  'signal.date_entropy.description':
    'Yorum tarihlerinin zamana ne kadar eşit yayıldığı; düşük entropi tarihlerin kümelendiği anlamına gelir.',
  'signal.local_guide_ratio.title': 'Yerel Rehber payı',
  'signal.local_guide_ratio.description':
    'Yerel Rehber seviyesi {level} ve üzeri olan yorumcuların payı.',
  'signal.owner_response_pattern.title': 'İşletme yanıtı örüntüsü',
  'signal.owner_response_pattern.description':
    'İşletme yanıtı olan yorumların payı ve bu yanıtların ne ölçüde birbirinin aynısı olduğu.',

  'data.eyebrow': 'kaynak: docs/PRIVACY.tr.md',
  'data.title': 'Ne gönderir, ne asla göndermez',
  'data.lead':
    'Analiz et’e tıklayana kadar ve yalnızca tek seferlik onay ekranını kabul ettiyseniz tarayıcınızdan hiçbir şey çıkmaz. Reddederseniz her analiz yerel olarak yapılır.',
  'data.sent.title': 'Her analizde bir kez gönderilenler',
  'data.sent.1': 'Sayfa URL’sindeki yer tanımlayıcısı; önbellek anahtarı olarak kullanılır.',
  'data.sent.2':
    'Yorum başına: yıldız puanı, takvim günü (saat bilgisi olmadan), metin, yorumcunun herkese açık yorum sayısı, fotoğraf sayısı, gösteriliyorsa Yerel Rehber seviyesi ve varsa işletme yanıtı.',
  'data.sent.3':
    'Yorum başına: yorumcu kimliği, yer kimliği ve tarayıcınızda üretilen günlük bir tuz değerinden oluşturulan tek yönlü bir karma; böylece farklı yorumcular kim oldukları bilinmeden sayılabilir.',
  'data.sent.4': 'Gösterilen toplam yorum sayısı ve genel puan.',
  'data.sent.5': 'Arayüz dili ve uzantı sürümü.',
  'data.never.title': 'Asla gönderilmeyenler',
  'data.never.1':
    'Yorumcu adları, profil URL’leri, avatarlar, kullanıcı kimlikleri veya başka herhangi bir yorumcu tanımlayıcısı.',
  'data.never.2': 'Google hesabınız, adınız veya e-posta adresiniz.',
  'data.never.3': 'Gezinme geçmişiniz, diğer sekmeler, çerezler veya yerel depolama.',
  'data.never.4':
    'Konumunuz. API, her web sunucusu gibi isteğin IP adresini görür; bu adres yalnızca bellekte hız sınırlaması için kullanılır ve asla kaydedilmez.',
  'data.kept.title': 'Sunucuda tutulanlar',
  'data.kept.text':
    'Her yer için hesaplanan profil, {days} gün boyunca. Tanımlayıcı içermeyen iki günlük sayaç.',
  'data.notStored.title': 'Asla kaydedilmeyenler',
  'data.notStored.text': 'Yorum metni, yorumcu karmaları ve IP adresleri.',
  'data.google.title': 'Asla iletişim kurulmayan',
  'data.google.text':
    'Google. API hiçbir Google servisine istek göndermez; bu, bir testle ve çalışma zamanı korumasıyla güvence altındadır.',
  'data.more': 'Alan alan tüm ayrıntılar: <a href="{url}">gizlilik</a>.',

  'verdict.eyebrow': 'her skorun altında gösterilir',
  'verdict.title': 'Bu bir hüküm değildir',
  'legal.summary':
    'Bu skor kamuya açık yorum verisinin istatistiksel özetidir; işletme veya yorumcu hakkında bir iddia değildir.',
  'legal.noClaim':
    'Signalyze hiçbir yorumun doğruluğu, hiçbir işletme veya yorumcu hakkında iddiada bulunmaz.',
  'verdict.note1':
    'Harf notu yok, geçti ya da kaldı yok. 0 ile 100 arası bir sayı, her zaman yukarıdaki cümleyle birlikte gösterilir.',
  'verdict.note2':
    'Her sinyal, yöntem sayfasında formülüyle birlikte ayrı ayrı listelenir; böylece ağırlıklandırmaya katılmayabilirsiniz.',
  'verdict.note3':
    '{min} yorumdan azı: hiç skor yok, yalnızca "yetersiz veri". Küçük örneklemler uç oranlar üretir.',
  'verdict.note4':
    'Yorum başına etiket yok, işaretleme yok, bildirme özelliği yok ve adı geçen işletmeler arasında karşılaştırma yok.',

  'faq.eyebrow': '5 soru',
  'faq.title': 'Sık sorulanlar',
  'faq.1.q': 'Ücretsiz mi?',
  'faq.1.a': 'Evet. Signalyze ücretsizdir; premium sürümü ve reklamı yoktur.',
  'faq.2.q': 'Hesap gerekiyor mu?',
  'faq.2.a':
    'Hayır. Hesap, çerez, analitik ve telemetri yoktur. Uzantının sakladığı tek şey ayarlarınız ve görüntülediğiniz profillerin yerel önbelleğidir; ikisi de kendi tarayıcınızda kalır.',
  'faq.3.q': 'Çevrimdışı çalışır mı?',
  'faq.3.a':
    'Evet. Signalyze API’sine ulaşılamazsa ya da veri göndermeyi reddederseniz aynı sinyal motoru tarayıcınızın içinde çalışır. Bu sonuçlar, paylaşılan önbellekten gelmediğini bilmeniz için "çevrimdışı analiz" olarak etiketlenir.',
  'faq.4.q': 'Google Haritalar dışındaki sitelerde çalışır mı?',
  'faq.4.a':
    'Henüz değil. 0.1 sürümü Google Haritalar işletme sayfalarında çalışır. Google Arama bilgi paneli desteği 2. aşama için planlanıyor.',
  'faq.5.q': 'Skor nasıl hesaplanır?',
  'faq.5.a':
    'Her sinyal, ölçülen değerin tipik yorumlanmış yerlere kıyasla ne kadar sıra dışı olduğunu söyleyen 0 ile 1 arası bir sayıdır. Signalyze Skoru, hesaplanabilen sinyallerin 0 ile 100 ölçeğinde ağırlıklı bir birleşimidir. {min} yorumun altında skor gösterilmez. Her formül ve ağırlık <a href="{url}">yöntem sayfasında</a> yer alır.',

  'cta.title': 'Profili okuyun, sonra karar verin.',
  'cta.text': 'Ücretsiz, hesapsız; Analiz et’e tıklayana kadar hiçbir şey gönderilmez.',

  'footer.github': 'GitHub',
  'footer.trademark':
    'Google Haritalar ve Yerel Rehber, Google LLC’nin ticari markalarıdır ve yalnızca uzantının nerede çalıştığını açıklamak için anılır. Signalyze’ın Google ile bir bağlantısı yoktur.',

  'doc.source': 'kaynak',
  'doc.changelogNote': 'Sürüm notları yalnızca İngilizce tutulur; aşağıdaki liste özgün belgedir.',
  'doc.fallbackNote':
    'Bu sayfa henüz {language} dilinde mevcut değil; İngilizce özgün metin gösteriliyor.',

  'notFound.eyebrow': '404',
  'notFound.title': 'Bu adreste bir şey yok.',
  'notFound.text': 'Sayfa taşınmış olabilir. Bu sitedeki her şeye ana sayfadan ulaşılabilir.',
  'notFound.home': 'Ana sayfaya git',

  'mock.example': 'örnek veri',
  'mock.place': 'Harbour Street Bakery',
  'mock.placeMeta': '4,6 ★ · 1.240 yorum · 200 analiz edildi',
  'mock.scoreLabel': 'Signalyze Skoru · 0 ile 100 arası',
  'mock.signals': 'Sinyaller',
  'mock.monthly': 'Aylık yorum sayısı',
  'mock.months': 'E E K A O Ş M N M H T A',
  'mock.monthlyNote':
    'Son bir yıldaki 80 yorumun 40 tanesi tek bir {days} günlük pencerede yazılmış.',
  'mock.rating': 'Puan dağılımı',
  'mock.reviewers': 'Yorumcular',
  'mock.reviewers.single': 'yalnızca bir yorum',
  'mock.reviewers.guides': 'Yerel Rehber seviye {level}+',
  'mock.reviewers.noPhoto': 'fotoğrafsız, kısa metin',
  'mock.caption': 'Temsili yan panel. İşletme ve tüm sayılar örnek veridir.',
};
