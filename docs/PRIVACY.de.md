# Datenschutz

_Übersetzung des englischen Originals; die englische Fassung ist die Referenzversion._

_Zuletzt aktualisiert: 2026-09-12. Diese Seite beschreibt genau, was die Signalyze-Erweiterung und die Signalyze-API mit Daten tun. Sie ist so geschrieben, dass sie dem Code entspricht; ändert sich der Code, ändert sich diese Seite mit._

## Die Kurzfassung

- Signalyze hat keine Konten, keine Cookies, keine Analytik und keine Telemetrie.
- Nichts verlässt Ihren Browser, bevor Sie auf **Analysieren** klicken, und auch dann nur, wenn Sie den einmaligen Zustimmungsbildschirm akzeptiert haben.
- Gesendet wird eine reduzierte Kopie der Rezensionen, die auf der Google-Maps-Seite ohnehin sichtbar sind: Sternebewertung, Kalendertag, Rezensionstext, die öffentliche Rezensionsanzahl des Rezensenten, Fotoanzahl und Local-Guide-Stufe. Namen der Rezensenten, Profil-Links, Avatare und Nutzer-IDs werden nie gesendet.
- Der Server behält pro Ort nur das berechnete Profil (Signale und Wert) für 7 Tage. Er speichert nie Rezensionstexte und kontaktiert nie Google.
- Ist der Server nicht erreichbar, läuft die Analyse vollständig in Ihrem Browser.

## Was die Erweiterung liest

Wenn Sie eine Unternehmensseite auf Google Maps öffnen und auf **Analysieren** klicken, liest die Erweiterung das Rezensionsfenster, das Google in Ihrem Tab bereits gerendert hat. Sie scrollt das Fenster, um standardmäßig 200 Rezensionen zu lesen, oder 500, 1000 oder alle Rezensionen der Seite (bis zu 2000), wenn Sie das so wählen; das Tempo bleibt bei jeder Wahl gleich (ein Scrollschritt alle 600 ms). Sie besucht keine andere Seite, öffnet keine Rezensentenprofile und liest nichts außerhalb der Unternehmensseite, die Sie gerade ansehen. Eine auf einen Zeitraum eingeschränkte Analyse (zum Beispiel die letzten 3 Monate) verlässt Ihren Browser nie: Sie wird lokal berechnet und nicht an den Server gesendet.

## Was an die Signalyze-API gesendet wird

Eine Anfrage pro Analyse mit folgendem Inhalt:

| Feld                                                      | Beispiel                            | Warum es gebraucht wird                                                                      |
| --------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Orts-Kennung (aus der Seiten-URL)                         | `0x14cab...:0x8e3f...`              | Cache-Schlüssel, damit derselbe Ort nicht für jeden Nutzer neu berechnet wird                |
| Pro Rezension: Sternebewertung                            | `5`                                 | Signale zur Sterneverteilung                                                                 |
| Pro Rezension: Kalendertag                                | `2026-03-14`                        | Zeitliche Signale (nur Tagesgenauigkeit; keine Uhrzeit)                                      |
| Pro Rezension: Text                                       | „Toller Kaffee, freundliches Team.“ | Signale zu Textähnlichkeit, Standardphrasen und Übereinstimmung von Bewertung und Text       |
| Pro Rezension: Gesamtzahl der Rezensionen des Rezensenten | `12`                                | Signale zur Rezensentenhistorie                                                              |
| Pro Rezension: Anzahl der angehängten Fotos               | `1`                                 | Signal „Foto/kurzer Text“                                                                    |
| Pro Rezension: Local-Guide-Stufe, falls angezeigt         | `4`                                 | Signale zur Rezensentenhistorie                                                              |
| Pro Rezension: Text der Inhaberantwort, falls vorhanden   | „Danke für Ihren Besuch.“           | Signal zum Muster der Inhaberantworten                                                       |
| Pro Rezension: ein Einweg-Hash                            | 64 Hexadezimalzeichen               | Lässt die Engine verschiedene Rezensenten zählen, ohne zu wissen, wer sie sind (siehe unten) |
| Angezeigte Gesamtzahl der Rezensionen und Gesamtbewertung | `1.240` / `4,4`                     | Zur Einordnung angezeigt; gibt an, wie viel vom Gesamtbestand analysiert wurde               |
| Sprache der Oberfläche und Version der Erweiterung        | `de` / `0.1.0`                      | Wählt das Phrasenwörterbuch; Kompatibilität                                                  |

**Der Einweg-Hash.** Für jede Rezension berechnet die Erweiterung `sha256(reviewerId + placeId + dailySalt)`, wobei der tägliche Salt ein zufälliger Wert ist, der in Ihrem Browser erzeugt und jeden Tag erneuert wird. Der Server erhält nur den Hash. Er kann daraus die Rezensenten-ID nicht zurückgewinnen, denselben Rezensenten nicht über zwei verschiedene Orte hinweg verknüpfen und denselben Rezensenten nicht über zwei verschiedene Tage hinweg verknüpfen. Der Hash wird nur während der Berechnung verwendet und verworfen, sobald die Antwort gesendet ist.

## Was nie gesendet wird

- Namen der Rezensenten, Profil-URLs, Avatare, Nutzer-IDs oder irgendeine andere Rezensenten-Kennung.
- Ihr Google-Konto, Ihr Name, Ihre E-Mail-Adresse oder irgendeine Information über Sie.
- Ihr Browserverlauf, der Inhalt anderer Tabs, Cookies oder lokaler Speicher.
- Ihr genauer Standort. Die API sieht die IP-Adresse der Anfrage (wie jeder Webserver); sie wird nicht gespeichert, siehe „Protokolle“.

## Was der Server speichert

| Daten                                                                                                                 | Wo                                         | Wie lange                                             |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Berechnetes Profil pro Ort: Signalwerte, Wert, Monatszahlen, Sterneverteilung, Zusammenfassung des Rezensentenprofils | PostgreSQL, Schlüssel ist die Orts-Kennung | 7 Tage, dann gelöscht                                 |
| Tageszähler: Anzahl der Analysen, Anzahl der Cache-Treffer                                                            | PostgreSQL                                 | Unbegrenzt (zwei Ganzzahlen pro Tag, keine Kennungen) |

Rezensionstexte, Rezensenten-Hashes und IP-Adressen werden **nicht** gespeichert. Der Server führt die Berechnung im Arbeitsspeicher durch und behält nur das Ergebnis.

## Protokolle

Die API schreibt pro Anfrage eine Zugriffsprotokollzeile mit Methode, Pfad, Statuscode, Dauer und einer anonymisierten Adresse: Bei IPv4-Adressen wird das letzte Oktett durch 0 ersetzt, IPv6-Adressen werden auf ihre ersten drei Gruppen gekürzt. Keine Query-Strings, keine Anfrageinhalte. Der Edge-Proxy des Hostings, der TLS terminiert, maskiert Adressen in seinen Betriebsprotokollen auf dieselbe Weise. Beide Protokolle liegen in der Container-Ausgabe und werden nur kurz zur Fehlersuche aufbewahrt. Die Ratenbegrenzung (60 Analysen pro IP und Stunde) verwendet die vollständige IP-Adresse nur im Arbeitsspeicher und schreibt sie nirgendwohin.

## Was die Erweiterung in Ihrem Browser speichert

- Ihre Einstellungen (Sprache, Kennzeichen an/aus, Zustimmung zum Senden von Daten).
- Einen lokalen Cache der Profile, die Sie angesehen haben, damit das erneute Öffnen eines Ortes sofort geht. Sie können ihn jederzeit in den Einstellungen leeren; beim Deinstallieren der Erweiterung wird er entfernt.

Alles liegt im eigenen `chrome.storage.local` der Erweiterung; nichts wird mit Google oder mit uns synchronisiert.

## Der Server kontaktiert nie Google

Die Signalyze-API stellt keine Anfragen an Google, Google Maps oder irgendeinen Google-Dienst. Das erzwingt ein automatisierter Test im Code, der fehlschlägt, sobald ein Google-Hostname im API-Quellcode auftaucht, sowie eine Laufzeitsperre am einzigen ausgehenden HTTP-Client der API.

## Optionales serverseitiges Sprachmodell (derzeit aus)

Eine künftige Version könnte ein Sprachmodell verwenden, um einen einzelnen **numerischen** Wert für die „Schreibhomogenität“ zu erzeugen, wenn das Textähnlichkeitssignal bereits hoch ist. Falls aktiviert, würden höchstens 30 Rezensionstexte, ohne jegliche Rezensentendaten, an den konfigurierten Modell-Endpunkt gesendet, und es käme eine einzige Zahl zurück. Einzelne Rezensionen werden nie gekennzeichnet. Diese Funktion ist deaktiviert, solange der Betreiber sie nicht ausdrücklich konfiguriert, und diese Seite wird aktualisiert, bevor sie eingeschaltet wird.

## Berechtigungen, die die Erweiterung anfordert

| Berechtigung                             | Warum                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Zugriff auf Google-Maps-Seiten           | Um die Rezensionen auf der Unternehmensseite zu lesen, die Sie gerade ansehen        |
| Zugriff auf `api.signalyze.veriskor.com` | Um die reduzierten Rezensionsdaten zu senden und das Profil zu empfangen             |
| `storage`                                | Einstellungen und lokaler Cache                                                      |
| `activeTab`                              | Um zu wissen, welche Unternehmensseite geöffnet ist, wenn Sie auf das Symbol klicken |
| `sidePanel`                              | Um das Bewertungsprofil neben der Seite anzuzeigen                                   |

## Ihre Wahlmöglichkeiten

- Den Zustimmungsbildschirm ablehnen: Die Erweiterung führt dann jede Analyse lokal in Ihrem Browser aus und sendet nichts.
- Das Senden von Daten später in den Einstellungen ausschalten: gleiche Wirkung.
- Den lokalen Cache in den Einstellungen leeren.
- Die Erweiterung deinstallieren: entfernt alle lokalen Daten. Serverseitig sind Profile nach Ort, nicht nach Nutzer, abgelegt und verfallen nach 7 Tagen.

## Kontakt

Fragen zu dieser Seite können über den Kontaktkanal gestellt werden, der im Chrome-Web-Store-Eintrag von Signalyze angegeben ist.
