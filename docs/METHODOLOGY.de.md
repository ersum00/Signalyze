# Methodik

_Übersetzung des englischen Originals; die englische Fassung ist die Referenzversion._

_Engine-Version 1.2.0. Dieses Dokument ist die einzige verbindliche Quelle dafür, wie jedes Signal und der Signalyze-Wert berechnet werden. Die Seite `/methodology` wird daraus erzeugt, und der Code in `packages/signals` (TypeScript) und `apps/api/signalyze_api/engine` (Python) setzt genau das um, was hier steht; beide Implementierungen werden an denselben Testfixtures gemessen._

Signalyze berechnet zehn deterministische Signale aus den Rezensionen, die auf einer Google-Maps-Unternehmensseite sichtbar sind. Jedes Signal ist eine Zahl zwischen 0 und 1, die ausdrückt, wie ungewöhnlich der gemessene Wert im Vergleich zu typischen bewerteten Orten ist; 0 bedeutet „unauffällig“, 1 bedeutet „so ungewöhnlich, wie wir es je sehen“. Der Signalyze-Wert (0-100) ist eine gewichtete Kombination der Signale, die berechnet werden konnten. Es ist kein Sprachmodell beteiligt, und über Absichten wird nichts abgeleitet: Jedes Signal ist eine Tatsache über die Verteilung öffentlicher Daten, die jeder von derselben Seite aus nachrechnen kann.

**Dieser Wert ist eine statistische Zusammenfassung öffentlicher Bewertungsdaten; er ist keine Aussage über das Unternehmen oder einzelne Rezensenten.**

## Eingabe

Die Engine erhält pro Rezension: Sternebewertung (1-5), Kalendertag, Text, die öffentliche Rezensionsanzahl des Rezensenten (falls sichtbar), Fotoanzahl, Local-Guide-Stufe (falls sichtbar), Text der Inhaberantwort (falls vorhanden). Sie erhält nie Namen, Profil-Links oder Nutzer-IDs. Siehe [Datenschutz](/de/privacy).

Die Erweiterung lädt standardmäßig 200 Rezensionen, oder 500, 1000 oder alle Rezensionen der Seite (bis zu 2000), wenn der Nutzer das in der Startansicht so wählt, in Googles Standardsortierung „Relevanteste“, sodass die Stichprobe der Teil der Rezensionsgeschichte ist, den Google zuerst anzeigt, und keine zufällige oder chronologische Stichprobe. Wird ein Zeitraum gewählt (dieses Jahr, letzte 12, 6 oder 3 Monate, dieser Monat), stellt die Erweiterung zuerst Googles Sortierung auf „Neueste“ um (wird das Sortierelement nicht erkannt, bleibt sie bei „Relevanteste“ und sagt das im Ergebnis), beendet das Laden, sobald zwei aufeinanderfolgende Scrollrunden nur Rezensionen hinzugefügt haben, die älter als der Zeitraum sind, und behält nur Rezensionen, die am ersten Tag des Zeitraums oder danach datiert sind (in UTC berechnet). Ein solches Zeitraumprofil wird lokal im Browser mit der mitgelieferten Engine berechnet, nie an den Server gesendet und getrennt vom Gesamtprofil zwischengespeichert, sodass das Gesamtprofil und die Plakette auf der Seite unverändert bleiben; nur Analysen über den gesamten Zeitraum nutzen den gemeinsamen Server-Cache. Die Signale werden auf der geladenen Stichprobe berechnet, und das Seitenpanel zeigt immer, wie viele Rezensionen von der angezeigten Gesamtzahl analysiert wurden.

## Vorverarbeitung

- **Daten** werden im Browser aus relativen Angaben („vor 2 Wochen“) abgeleitet und auf einen Kalendertag gerundet. Die Monatssubtraktion ist kalenderbasiert, sodass „vor 3 Monaten“ am 31. Mai der 28. oder 29. Februar ist.
- **Textnormalisierung**: Unicode NFKC, Kleinschreibung, jedes Zeichen, das kein Buchstabe, keine Ziffer und kein Leerraum ist, wird zu einem Leerzeichen, Leerraum wird zusammengefasst, Anfang und Ende werden beschnitten. Längen werden in Unicode-Codepunkten gezählt.
- **Die Sprache eines Textes** wird in zwei Schritten bestimmt. Zuerst zählt die Schrift der Buchstaben: jedes Kana macht den Text japanisch, jedes Hangul koreanisch, jedes Han-Zeichen (ohne Kana) chinesisch, jeder arabische Buchstabe arabisch. Kyrillische Texte stimmen dann zwischen Russisch und Ukrainisch ab, lateinisch geschriebene Texte zwischen Englisch, Spanisch, Portugiesisch, Französisch, Deutsch, Italienisch, Türkisch, Niederländisch, Polnisch, Indonesisch, Vietnamesisch und Schwedisch, jeweils anhand kleiner Stoppwortlisten (die meisten Treffer gewinnen; bei Gleichstand gilt diese Reihenfolge, und ein Text ohne einen einzigen Treffer ist Russisch beziehungsweise Englisch). Texte in anderen Schriften (Thai, Devanagari, Griechisch, Hebräisch, ...) erhalten kein Wörterbuch. Die Sprache bestimmt nur, welches Phrasenwörterbuch und welches Ton-Lexikon gelten; sie wird nie ausgegeben.
- Rezensionen werden in fester Reihenfolge verarbeitet, Summen in dieser Reihenfolge gebildet, und jede ausgegebene Zahl wird kaufmännisch auf sechs Dezimalstellen gerundet, sodass die TypeScript- und die Python-Implementierung identische Ergebnisse liefern.

## Von einer Messung zur „Ungewöhnlichkeit“

Jedes Signal erzeugt eine Rohmessung (meist einen Anteil zwischen 0 und 1) und bildet sie mit einer linearen Rampe zwischen zwei Kalibrierungspunkten auf die Ungewöhnlichkeit ab:

```
unusualness = clamp((value - low) / (high - low), 0, 1)
```

`low` ist das Niveau, ab dem das Signal zu zählen beginnt (typische Orte liegen darauf oder darunter), `high` das Niveau, ab dem es voll zählt. Die Kalibrierungspunkte liegen in `packages/signals/data/thresholds.json` und sind unten pro Signal aufgeführt. Es sind Schätzungen der Engine-Version 1.2.0, gewählt anhand der Form öffentlicher Google-Maps-Rezensionsdaten und synthetischer Datensätze; sie werden mit neuen Engine-Versionen überarbeitet, und jede Überarbeitung wird im Änderungsprotokoll festgehalten.

## Die Signale

### 1. `burst_ratio` (Gewicht 0,16)

**Misst:** den Anteil der Rezensionen, die in das einzelne dichteste 14-Tage-Fenster fallen.

**Wie:** Rezensionstage sortieren; ein 14-Tage-Fenster verschieben und die höchste Anzahl nehmen; `peakShare = peak / n`. Ein gleichmäßiger Fluss über die Lebensdauer des Ortes würde `expectedShare = 14 / lifespanDays` Rezensionen in jedes Fenster legen, der Überschuss darüber ist also `excess = (peakShare - expectedShare) / (1 - expectedShare)`. Passt die gesamte Historie in 14 Tage, gibt es nichts zu vergleichen, und der Überschuss ist 0.

**Rampe:** `excess` von 0,05 bis 0,65.

**Warum es zählt:** An etablierten Orten verteilt sich der Rezensionsfluss; ein großer Anteil aller Rezensionen innerhalb von zwei Wochen ist messbar und selten. Die Details enthalten die Daten des Fensters, damit es auf der Seite nachgeprüft werden kann.

### 2. `rating_polarity` (Gewicht 0,08)

**Misst:** den Anteil der 5-Sterne- plus 1-Stern-Bewertungen an allen Bewertungen.

**Wie:** `share = (count5 + count1) / n`.

**Rampe:** 0,82 bis 0,96. Google-Bewertungen sind stark zu 5 Sternen verschoben, ein hoher Polaritätsanteil ist also normal; nur Verteilungen, die 2-4 Sterne fast vollständig auslassen, werden gezählt.

**Warum es zählt:** Eine an beiden Extremen konzentrierte Verteilung unterscheidet sich von der gleichmäßigen, 5-lastigen Form der meisten Orte.

### 3. `single_review_accounts` (Gewicht 0,14)

**Misst:** den Anteil der Rezensenten, deren öffentliche Rezensionsanzahl 0 oder 1 ist.

**Wie:** unter den Rezensionen mit sichtbarer Anzahl `share = count(reviewCount <= 1) / known`. Benötigt mindestens 15 bekannte Anzahlen, sonst nicht verfügbar.

**Rampe:** 0,30 bis 0,75.

**Warum es zählt:** Die meisten Google-Rezensenten haben mehr als eine Rezension verfasst. Ein großer Anteil von Rezensenten, deren einzige Rezension diese ist, ist eine messbare Abweichung von dieser Basis.

### 4. `no_photo_short_text` (Gewicht 0,08)

**Misst:** den Anteil der Rezensionen ohne Foto und mit weniger als 40 Zeichen Text.

**Wie:** `share = count(photoCount == 0 and textLength < 40) / n`.

**Rampe:** 0,60 bis 0,95. Reine Sternebewertungen sind auf Google üblich, daher zählt nur ein sehr hoher Anteil.

**Warum es zählt:** Fotos und längere Texte kosten Mühe; ihr fast vollständiges Fehlen ist messbar.

### 5. `text_similarity` (Gewicht 0,16)

**Misst:** wie stark sich Rezensionstexte gegenseitig überlappen.

**Wie:** Für jede Rezension mit mindestens 20 Zeichen normalisiertem Text die Menge der Zeichen-3-Gramme bilden (Leerzeichen eingeschlossen). Für jedes Paar die Jaccard-Ähnlichkeit `|A ∩ B| / |A ∪ B|` berechnen. Den Mittelwert über alle Paare und den Anteil der Paare über 0,5 („nahezu identische Paare“) ausgeben. Benötigt mindestens 10 geeignete Texte. Es werden höchstens 600 geeignete Texte verglichen: Bei mehr als 600 wird eine gleichmäßig verteilte Teilmenge verwendet (der Text an Index floor(i × n / 600) in Eingabereihenfolge, für i von 0 bis 599); die TypeScript- und die Python-Engine wählen dieselben Indizes, und die Zahl der tatsächlich verglichenen Texte wird in den Details als `sampled` ausgegeben. Alle anderen Signale laufen über jede Rezension.

**Rampe:** das Größere aus mittlerem Jaccard von 0,18 bis 0,45 und Anteil nahezu identischer Paare von 0,02 bis 0,15.

**Warum es zählt:** Unabhängig verfasste Texte über denselben Ort teilen einige Wörter, aber sehr wenige Fragmente auf 3-Gramm-Ebene. Hohe Überlappung ist unabhängig von der Sprache messbar.

### 6. `template_phrases` (Gewicht 0,08)

**Misst:** den Anteil der Rezensionen, deren Text überwiegend aus Standardphrasen besteht.

**Wie:** Pro Sprache wird ein Wörterbuch gängiger Standardphrasen („highly recommend“, „kesinlikle tavsiye ederim“, „sehr zu empfehlen“, „muy recomendable“, „je recommande“, „また来たい“, „强烈推荐“, ...) mit Wortgrenzen auf den normalisierten Text angewendet; für Japanisch und Chinesisch, die ohne Leerzeichen geschrieben werden, werden Phrasen als einfache Teilzeichenketten gesucht. Eine Rezension ist phrasenbasiert, wenn die gefundenen Phrasen mindestens 50 % ihrer Zeichen abdecken. `share = phraseBased / withText`. Benötigt mindestens 10 Rezensionen mit Text. Texte, deren Sprache kein Wörterbuch hat, zählen in `withText`, sind aber nie phrasenbasiert. Die drei häufigsten Phrasen werden ausgegeben.

**Rampe:** 0,15 bis 0,50.

**Warum es zählt:** Standardphrasen kommen auch in alltäglichen Rezensionen vor; deshalb zählen nur Texte, die überwiegend daraus bestehen, und nur ihr Anteil an allen Texten.

### 7. `rating_text_mismatch` (Gewicht 0,08)

**Misst:** wie oft der Ton des Textes der Sternebewertung widerspricht.

**Wie:** Pro Sprache liefert ein kleines Lexikon positiver und negativer Wörter `tone = (positive - negative) / (positive + negative)` über die Tokens einer Rezension. Für Japanisch und Chinesisch werden die Lexikoneinträge als Teilzeichenketten des normalisierten Textes gesucht, längste Einträge zuerst; jeder Eintrag zählt einmal und wird entfernt, bevor kürzere Einträge geprüft werden, sodass eine verneinte Form wie 不好吃 in der Negativliste nicht zusätzlich als 好吃 zählt. Rezensionen ohne Lexikontreffer und Texte, deren Sprache kein Wörterbuch hat, werden nicht bewertet. Eine Abweichung ist eine Bewertung von 4 oder 5 mit Ton ≤ -0,5 oder eine Bewertung von 1 oder 2 mit Ton ≥ 0,5. `share = mismatches / scored`. Benötigt mindestens 10 bewertete Rezensionen.

**Rampe:** 0,10 bis 0,35. Das Lexikon erkennt weder Verneinung noch Ironie, daher wird ein Grundanteil an Abweichungen erwartet und nicht gezählt.

**Warum es zählt:** Text und Sterne stimmen normalerweise überein; systematische Abweichung ist messbar.

### 8. `date_entropy` (Gewicht 0,08)

**Misst:** wie gleichmäßig sich die Rezensionen über die Monate zwischen der ersten und der letzten Rezension verteilen.

**Wie:** Rezensionen pro Kalendermonat zählen; Shannon-Entropie `H = -Σ p_i log2 p_i` über die Monate, normalisiert mit `log2(monthsInSpan)`. 1 bedeutet vollkommen gleichmäßig, 0 bedeutet alles in einem Monat. Benötigt eine Spanne von mindestens 3 Monaten. Der stärkste Monat und sein Anteil werden ausgegeben.

**Rampe:** `1 - normalisedEntropy` von 0,25 bis 0,65.

**Warum es zählt:** Ergänzt `burst_ratio` auf Monatsebene; saisonale Orte haben eine etwas niedrigere Entropie, was die Rampe toleriert.

### 9. `local_guide_ratio` (Gewicht 0,06)

**Misst:** den Anteil der Rezensionen von Local Guides der Stufe 3 oder höher.

**Wie:** Wird nur berechnet, wenn die Seite für mindestens einen Rezensenten eine Stufe angezeigt hat; sonst nicht verfügbar, weil eine fehlende Stufe nicht von „kein Local Guide“ zu unterscheiden ist. `share = count(level >= 3) / n`. Die ungewöhnliche Richtung ist ein niedriger Anteil.

**Rampe:** Fehlbetrag `0.20 - share` von 0 bis 0,20 (Anteil 0 → 1, Anteil ≥ 0,20 → 0).

**Warum es zählt:** Etablierte Local Guides gehören an den meisten Orten zum üblichen Rezensentenmix.

### 10. `owner_response_pattern` (Gewicht 0,08)

**Misst:** wie identisch die Antworten des Inhabers sind.

**Wie:** Unter den Rezensionen mit Inhaberantwort die normalisierten Antworten gruppieren; `identicalShare = 1 - distinct / responded`. Benötigt mindestens 5 Antworten. Die Antwortquote und der Anteil der größten Gruppe werden ausgegeben.

**Rampe:** 0,60 bis 0,95. Viele Inhaber verwenden einen Dankessatz mehrfach, daher zählt nur nahezu vollständige Wiederholung.

**Warum es zählt:** Ein kleiner, messbarer Aspekt der Seitenpflege; er ist niedrig gewichtet.

## Der Signalyze-Wert

```
score = round( 100 × Σ (w_i × u_i) / Σ w_i )   over available signals i
```

Gewichte (`packages/signals/src/weights.json`, Version 1.2.0):

| Signal                 | Gewicht |
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

Die Gewichte werden über die für den Ort verfügbaren Signale neu normalisiert, sodass ein Signal, das nicht berechnet werden konnte (zum Beispiel weil keine Local-Guide-Stufen angezeigt werden), den Wert in keine Richtung bewegt. Der Wert ist ein gewichteter Mittelwert, ein einzelnes Signal kann ihn also höchstens um seinen Gewichtsanteil anheben: Ein Ort mit einer extremen Häufung und sonst nichts Ungewöhnlichem landet bei etwa 25, nicht bei 90. Das ist beabsichtigt; das Seitenpanel zeigt jedes Signal einzeln, damit der Leser sieht, welches verantwortlich ist.

**Kein Wert unter 15 Rezensionen.** Mit weniger Rezensionen schwanken die obigen Anteile stark, daher zeigt die Erweiterung „nicht genug Daten“ und keine Zahl.

## Wie die synthetischen Datensätze aussehen

Die Engine wird mit geseedeten synthetischen Datensätzen ausgeliefert, die in Tests und als Fixtures für den Abgleich der Implementierungen dienen (`packages/signals/fixtures/`). Ihre Werte bei Engine 1.2.0, zur Orientierung:

| Datensatz    | Beschreibung                                                                                            | Wert                            |
| ------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------- |
| normal       | stetiger Fluss über drei Jahre, gemischte Bewertungen, natürliche Texte                                 | 1-3                             |
| polarized    | überwiegend 5- und 1-Stern-Bewertungen                                                                  | 7-12                            |
| burst        | 60 % der Rezensionen in einem 14-Tage-Fenster, überwiegend Konten mit einer Rezension                   | 24                              |
| template     | Standardphrasen-Texte, nahezu identische Texte, Konten mit einer Rezension, identische Inhaberantworten | 43-53                           |
| sparse       | nur Bewertungen, kein Text und keine Rezensentendaten                                                   | 21 (nur vier Signale verfügbar) |
| multilingual | natürliche und Standardphrasen-Texte in allen 18 abgedeckten Sprachen sowie Thai, Hindi und Griechisch  | 4                               |

## Grenzen

- Sofern nicht alle Rezensionen geladen werden, ist die Stichprobe Googles Sortierung „Relevanteste“ (bei einem Zeitraum „Neueste“), nicht die vollständige Historie; ein Ort mit mehr als 2000 Rezensionen wird nie vollständig geladen.
- Relative Datumsangaben begrenzen die Genauigkeit auf etwa einen Tag bei neuen Rezensionen und einen Monat oder ein Jahr bei alten.
- Ein Zeitraum ist ungefähr: Google zeigt Datumsangaben relativ an („vor 2 Monaten“), sodass die Zeitraumgrenze auf Daten angewendet wird, die selbst gerundet sind.
- Lexika und Phrasenwörterbücher decken 18 Sprachen ab: Englisch, Spanisch, Portugiesisch, Französisch, Deutsch, Italienisch, Türkisch, Niederländisch, Polnisch, Indonesisch, Vietnamesisch, Schwedisch, Russisch, Ukrainisch, Arabisch, Japanisch, Chinesisch und Koreanisch. Texte in anderen Sprachen tragen zu den Zeit-, Bewertungs- und Rezensentensignalen bei, aber nicht zu den Textsignalen (ein lateinisch geschriebener Text in einer nicht abgedeckten Sprache fällt auf die englischen Wörterbücher zurück, die ihn selten treffen). Die Wörterbücher sind klein und erfassen nur Oberflächenformen, ohne Stammformreduktion, Verneinungs- oder Ironieerkennung, sodass stark flektierende Sprachen weniger Treffer pro Text erhalten.
- Local-Guide-Stufen werden in der Rezensionsliste oft nicht angezeigt; das Signal ist dann nicht verfügbar statt geschätzt.
- Die Kalibrierungspunkte sind Schätzungen der Version 1.2.0. Jede Änderung daran ist eine neue Engine-Version, wird im Änderungsprotokoll festgehalten, und der Server-Cache ist nach Engine-Version geschlüsselt.

## Optionales Sprachmodell (standardmäßig aus)

Engine 1.2.0 enthält einen optionalen serverseitigen Schritt, den der Betreiber aktivieren kann: Wenn `text_similarity` bereits hoch ist, werden bis zu 30 Texte (ohne Rezensentendaten) an einen OpenAI-kompatiblen Endpunkt gesendet, der eine einzelne Zahl zurückgibt, eine Schätzung der „Schreibhomogenität“ von 0 bis 1, die in den Details von `text_similarity` als `llmHomogeneity` ausgegeben wird. Einzelne Rezensionen werden nie gekennzeichnet, und der Wert ändert sich in dieser Version nie dadurch. Der Schritt ist deaktiviert, solange nicht sowohl `LLM_BASE_URL` als auch `LLM_API_KEY` konfiguriert sind; die öffentliche Signalyze-API läuft derzeit mit deaktiviertem Schritt.
