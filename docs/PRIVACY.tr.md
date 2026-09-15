# Gizlilik

_İngilizce özgün metnin çevirisidir; referans sürüm İngilizce metindir._

_Son güncelleme: 2026-09-12. Bu sayfa, Signalyze uzantısının ve Signalyze API'sinin verilerle tam olarak ne yaptığını açıklar. Kodla birebir örtüşecek şekilde yazılmıştır; kod değişirse bu sayfa da onunla birlikte değişir._

## Kısa özet

- Signalyze'da hesap, çerez, analitik ve telemetri yoktur.
- **Analiz et**'e tıklayana kadar ve yalnızca tek seferlik onay ekranını kabul ettiyseniz tarayıcınızdan hiçbir şey çıkmaz.
- Gönderilen şey, Google Haritalar sayfasında zaten görünen yorumların kırpılmış bir kopyasıdır: yıldız puanı, takvim günü, yorum metni, yorumcunun herkese açık yorum sayısı, fotoğraf sayısı ve Yerel Rehber seviyesi. Yorumcu adları, profil bağlantıları, avatarlar ve kullanıcı kimlikleri asla gönderilmez.
- Sunucu her yer için yalnızca hesaplanan profili (sinyaller ve skor) 7 gün saklar. Yorum metnini hiçbir zaman kaydetmez ve Google ile hiçbir zaman iletişim kurmaz.
- Sunucuya ulaşılamazsa analiz tamamen tarayıcınızın içinde yapılır.

## Uzantı ne okur

Google Haritalar'da bir işletme sayfası açıp **Analiz et**'e tıkladığınızda uzantı, Google'ın sekmenizde zaten oluşturduğu yorum panelini okur. Varsayılan olarak 200 yorumu, siz öyle seçerseniz 500, 1000 ya da sayfadaki tüm yorumları (en fazla 2000) okumak için paneli kaydırır; seçim ne olursa olsun hız aynıdır (600 ms'de bir kaydırma adımı). Başka hiçbir sayfayı ziyaret etmez, yorumcu profillerini açmaz ve baktığınız işletme sayfasının dışında hiçbir şey okumaz. Bir dönemle sınırlanmış analiz (örneğin son 3 ay) tarayıcınızdan asla çıkmaz: yerel olarak hesaplanır ve sunucuya gönderilmez.

## Signalyze API'sine ne gönderilir

Her analizde tek bir istek gönderilir ve şunları içerir:

| Alan                                               | Örnek                             | Neden gerekli                                                                             |
| -------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| Yer tanımlayıcısı (sayfa URL'sinden)               | `0x14cab...:0x8e3f...`            | Önbellek anahtarı; aynı yer her kullanıcı için yeniden hesaplanmasın diye                 |
| Yorum başına: yıldız puanı                         | `5`                               | Puan dağılımı sinyalleri                                                                  |
| Yorum başına: takvim günü                          | `2026-03-14`                      | Zamanlama sinyalleri (yalnızca gün hassasiyeti; saat bilgisi yok)                         |
| Yorum başına: metin                                | "Harika kahve, güler yüzlü ekip." | Metin benzerliği, kalıp ifade ve puan/metin tutarlılığı sinyalleri                        |
| Yorum başına: yorumcunun toplam yorum sayısı       | `12`                              | Yorumcu geçmişi sinyalleri                                                                |
| Yorum başına: eklenen fotoğraf sayısı              | `1`                               | Fotoğraf/kısa metin sinyali                                                               |
| Yorum başına: gösteriliyorsa Yerel Rehber seviyesi | `4`                               | Yorumcu geçmişi sinyalleri                                                                |
| Yorum başına: varsa işletme yanıtı metni           | "Ziyaretiniz için teşekkürler."   | İşletme yanıtı örüntüsü sinyali                                                           |
| Yorum başına: tek yönlü bir karma                  | 64 onaltılık karakter             | Motorun farklı yorumcuları kim olduklarını bilmeden saymasını sağlar (aşağıya bakın)      |
| Gösterilen toplam yorum sayısı ve genel puan       | `1.240` / `4,4`                   | Bağlam için gösterilir; toplamın ne kadarının analiz edildiğini belirtmek için kullanılır |
| Arayüz dili ve uzantı sürümü                       | `tr` / `0.1.0`                    | Kalıp ifade sözlüğünü seçer; uyumluluk                                                    |

**Tek yönlü karma.** Uzantı her yorum için `sha256(reviewerId + placeId + dailySalt)` değerini hesaplar; buradaki günlük tuz, tarayıcınızda üretilen ve her gün yenilenen rastgele bir değerdir. Sunucu yalnızca karmayı alır. Bu karmadan yorumcu kimliğini geri elde edemez, aynı yorumcuyu iki farklı yer arasında ilişkilendiremez ve aynı yorumcuyu iki farklı gün arasında ilişkilendiremez. Karma yalnızca hesaplama sırasında kullanılır ve yanıt gönderildiğinde atılır.

## Asla gönderilmeyenler

- Yorumcu adları, profil URL'leri, avatarlar, kullanıcı kimlikleri veya başka herhangi bir yorumcu tanımlayıcısı.
- Google hesabınız, adınız, e-posta adresiniz veya sizinle ilgili herhangi bir bilgi.
- Gezinme geçmişiniz, diğer sekmelerin içeriği, çerezler veya yerel depolama.
- Kesin konumunuz. API, isteğin IP adresini görür (her web sunucusu gibi); bu adres kaydedilmez, bkz. "Günlükler".

## Sunucu ne saklar

| Veri                                                                                                        | Nerede                                         | Ne kadar süre                                 |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Her yer için hesaplanan profil: sinyal değerleri, skor, aylık sayılar, puan dağılımı, yorumcu profili özeti | PostgreSQL, yer tanımlayıcısıyla anahtarlanmış | 7 gün, sonra silinir                          |
| Günlük sayaçlar: analiz sayısı, önbellek isabeti sayısı                                                     | PostgreSQL                                     | Süresiz (günde iki tam sayı, tanımlayıcı yok) |

Yorum metni, yorumcu karmaları ve IP adresleri **kaydedilmez**. Sunucu hesaplamayı bellekte yapar ve yalnızca sonucu tutar.

## Günlükler

API her istek için yöntem, yol, durum kodu, süre ve anonimleştirilmiş bir adres içeren tek bir erişim günlüğü satırı yazar: IPv4 adreslerinin son okteti 0 ile değiştirilir, IPv6 adresleri ilk üç gruba kısaltılır. Sorgu dizesi yok, istek gövdesi yok. TLS'yi sonlandıran barındırma uç vekil sunucusu, kendi işletim günlüklerinde adresleri aynı şekilde maskeler. Her iki günlük de konteyner çıktısında yaşar ve sorun giderme için kısa süreliğine tutulur. Hız sınırlaması (IP başına saatte 60 analiz) tam IP adresini yalnızca bellekte kullanır ve hiçbir yere yazmaz.

## Uzantı tarayıcınızda ne saklar

- Ayarlarınız (dil, rozet açık/kapalı, veri gönderme onayı).
- Görüntülediğiniz profillerin yerel bir önbelleği; böylece bir yeri yeniden açmak anında olur. Bunu istediğiniz zaman Ayarlar'dan temizleyebilirsiniz; uzantıyı kaldırdığınızda da silinir.

Her şey uzantının kendi `chrome.storage.local` alanında tutulur; hiçbir şey Google'a veya bize eşitlenmez.

## Sunucu Google ile asla iletişim kurmaz

Signalyze API'si Google'a, Google Haritalar'a veya herhangi bir Google servisine istek göndermez. Bu, API kaynak kodunda herhangi bir Google alan adı geçtiğinde başarısız olan otomatik bir testle ve API'nin tek dış HTTP istemcisi üzerindeki bir çalışma zamanı korumasıyla güvence altındadır.

## İsteğe bağlı sunucu tarafı dil modeli (şu anda kapalı)

Gelecekteki bir sürüm, metin benzerliği sinyali zaten yüksek olduğunda tek bir **sayısal** "yazım türdeşliği" değeri üretmek için bir dil modeli kullanabilir. Etkinleştirilirse, yapılandırılmış model uç noktasına hiçbir yorumcu verisi olmadan en fazla 30 yorum metni gönderir ve karşılığında tek bir sayı alır. Tek tek yorumları asla etiketlemez. Bu özellik, operatör açıkça yapılandırmadıkça devre dışıdır ve açılmadan önce bu sayfa güncellenecektir.

## Uzantının istediği izinler

| İzin                                 | Neden                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| Google Haritalar sayfalarına erişim  | Görüntülediğiniz işletme sayfasındaki yorumları okumak için                             |
| `api.signalyze.veriskor.com` erişimi | Kırpılmış yorum verisini göndermek ve profili almak için                                |
| `storage`                            | Ayarlar ve yerel önbellek                                                               |
| `activeTab`                          | Araç çubuğu simgesine tıkladığınızda hangi işletme sayfasının açık olduğunu bilmek için |
| `sidePanel`                          | Yorum Profili'ni sayfanın yanında göstermek için                                        |

## Seçenekleriniz

- Onay ekranını reddedin: uzantı bu durumda her analizi tarayıcınızda yerel olarak yapar ve hiçbir şey göndermez.
- Veri göndermeyi daha sonra Ayarlar'dan kapatın: aynı etki.
- Yerel önbelleği Ayarlar'dan temizleyin.
- Uzantıyı kaldırın: tüm yerel veriler silinir. Sunucu tarafında profiller kullanıcıya göre değil yere göre anahtarlanır ve 7 gün sonra süresi dolar.

## İletişim

Bu sayfayla ilgili sorular, Signalyze'ın Chrome Web Mağazası sayfasında listelenen iletişim kanalı üzerinden gönderilebilir.
