import type { Dictionary } from './types';

/** German site copy. Terminology follows apps/extension/src/i18n/de.json. */
export const de: Dictionary = {
  'nav.methodology': 'Methodik',
  'nav.privacy': 'Datenschutz',
  'nav.changelog': 'Änderungen',
  'nav.addToChrome': 'Zu Chrome hinzufügen',
  'nav.skip': 'Zum Inhalt springen',
  'nav.main': 'Hauptnavigation',
  'nav.language': 'Sprache',

  'meta.home.title':
    'Signalyze: ein statistisches Bewertungsprofil für jedes Unternehmen auf Google Maps',
  'meta.home.description':
    'Eine kostenlose Chrome-Erweiterung, die für jedes Unternehmen auf Google Maps ein statistisches Bewertungsprofil zeigt: zehn messbare Signale, zusammengefasst zu einem Signalyze-Wert von 0 bis 100. Kein Konto, kein Tracking.',
  'meta.methodology.title': 'Methodik',
  'meta.methodology.description':
    'Wie jedes der zehn Signalyze-Signale und der Signalyze-Wert von 0 bis 100 berechnet werden, mit Formeln, Schwellenwerten und Gewichten.',
  'meta.privacy.title': 'Datenschutz',
  'meta.privacy.description':
    'Was die Signalyze-Erweiterung und die API genau mit Daten tun: was gesendet wird, was nie gesendet wird, was gespeichert wird und wie lange.',
  'meta.changelog.title': 'Änderungen',
  'meta.changelog.description':
    'Versionshinweise für die Signalyze-Erweiterung, die API und die Website.',
  'meta.notFound.title': 'Seite nicht gefunden',
  'meta.notFound.description': 'Unter dieser Adresse gibt es keine Seite.',

  'hero.eyebrow': 'kostenlose chrome-erweiterung · google maps',
  'hero.title': 'Die Statistik hinter einer Sternebewertung.',
  'hero.lead':
    'Signalyze macht aus den Rezensionen, die ohnehin auf einer Google-Maps-Seite stehen, ein Bewertungsprofil: zehn messbare Signale, von zeitlichen Häufungen bis zur Textähnlichkeit, zusammengefasst zu einem Signalyze-Wert von 0 bis 100. Kein Konto, kein Tracking.',
  'hero.methodology': 'Methodik lesen',
  'hero.readouts.label': 'Beispielhafte Signalwerte',
  'hero.readouts.eyebrow': 'so sieht ein signal aus',
  'hero.readouts.burst':
    'der Rezensionen wurden innerhalb eines einzigen {days}-Tage-Fensters verfasst',
  'hero.readouts.single': 'der Rezensenten haben keine weitere Rezension',
  'hero.readouts.overlap':
    'durchschnittliche Zeichen-{n}-Gramm-Überlappung zwischen Rezensionstexten',
  'hero.readouts.note':
    'Aussagen über die Verteilung öffentlicher Daten. Jeder kann sie von derselben Seite aus nachrechnen.',

  'how.eyebrow': '3 schritte',
  'how.title': 'So funktioniert es',
  'how.step1.title': 'Ein Unternehmen auf Google Maps öffnen',
  'how.step1.text':
    'Jede Unternehmensseite mit mindestens {min} Rezensionen. Signalyze bleibt untätig, bis Sie es aufrufen.',
  'how.step2.title': 'Auf „Analysieren“ klicken',
  'how.step2.text':
    'Die Erweiterung scrollt das Rezensionsfenster, das Google bereits gerendert hat, und liest standardmäßig {limit} Rezensionen, auf Wunsch alle Rezensionen der Seite (bis zu {ceiling}) und nur einen gewählten Zeitraum. Sie öffnet nie eine andere Seite.',
  'how.step3.title': 'Das Bewertungsprofil lesen',
  'how.step3.text':
    'Das Seitenpanel zeigt den Wert, die zehn Signale, die Rezensionen pro Monat, die Sterneverteilung und eine Zusammenfassung der Rezensenten, jeweils in einfacher Sprache erklärt.',

  'see.eyebrow': 'das seitenpanel',
  'see.title': 'Was Sie sehen',
  'see.score.title': 'Wert und zehn Signale',
  'see.score.text':
    'Ein Signalyze-Wert von 0 bis 100 und darunter jedes Signal mit seinem Wert. Jedes hat eine verständliche Erklärung und einen Link zu seiner Formel.',
  'see.monthly.title': 'Rezensionen pro Monat',
  'see.monthly.text':
    'Wie viele Rezensionen in jedem Monat eingingen, damit eine Häufung auf einen Blick sichtbar ist.',
  'see.rating.title': 'Sterneverteilung',
  'see.rating.text':
    'Wie sich die Sterne von 5 bis 1 verteilen. Eine an beiden Enden konzentrierte Form sieht anders aus als eine gleichmäßige.',
  'see.reviewers.title': 'Rezensentenprofil',
  'see.reviewers.text':
    'Wie viele Rezensenten nur diese eine Rezension haben, wie viele etablierte Local Guides sind und wie viele weder Foto noch längeren Text beigetragen haben.',

  'shots.eyebrow': 'screenshots',
  'shots.title': 'So sieht es aus',
  'shots.alt': 'Signalyze-Screenshot {n}',
  'shots.alt.score': 'Das Seitenpanel mit dem Signalyze-Wert und den zehn Signalen',
  'shots.alt.signals': 'Ein aufgeklapptes Signal mit Wert und Erklärung',
  'shots.alt.charts': 'Diagramme zu Rezensionen pro Monat und Sterneverteilung',
  'shots.alt.reviewers': 'Die Zusammenfassung der Rezensenten',
  'shots.alt.consent': 'Der einmalige Zustimmungsbildschirm vor der ersten Analyse',
  'shots.alt.settings': 'Die Einstellungen',

  'signals.eyebrow': '10 signale · engine {version}',
  'signals.title': 'Die zehn Signale',
  'signals.lead':
    'Jedes Signal ist ein Wert zwischen 0 und 1, der ausdrückt, wie ungewöhnlich die gemessene Größe im Vergleich zu typischen bewerteten Orten ist. Über Absichten wird nichts abgeleitet; jedes Signal ist eine Tatsache über die Verteilung öffentlicher Daten.',
  'signals.more': 'Formeln, Gewichte und Schwellenwerte: <a href="{url}">Methodik</a>.',

  'signal.burst_ratio.title': 'Häufungsquote',
  'signal.burst_ratio.description':
    'Anteil der Rezensionen im einzelnen dichtesten {days}-Tage-Fenster, bezogen auf die Länge der Rezensionsgeschichte des Ortes.',
  'signal.rating_polarity.title': 'Bewertungspolarität',
  'signal.rating_polarity.description':
    'Wie stark sich die Sterneverteilung auf 5 und 1 Sterne konzentriert, verglichen mit 2 bis 4 Sternen.',
  'signal.single_review_accounts.title': 'Konten mit einer Rezension',
  'signal.single_review_accounts.description':
    'Anteil der Rezensenten, deren öffentliches Profil außer dieser Rezension höchstens eine weitere zeigt.',
  'signal.no_photo_short_text.title': 'Kein Foto, kurzer Text',
  'signal.no_photo_short_text.description':
    'Anteil der Rezensionen ohne Foto und mit weniger als {chars} Zeichen Text.',
  'signal.text_similarity.title': 'Textähnlichkeit',
  'signal.text_similarity.description':
    'Durchschnittliche Zeichen-{n}-Gramm-Überlappung zwischen Rezensionstexten und Anteil der nahezu identischen Paare.',
  'signal.template_phrases.title': 'Standardphrasen',
  'signal.template_phrases.description':
    'Wie oft die Texte Standardphrasen aus einem sprachspezifischen Wörterbuch wiederverwenden.',
  'signal.rating_text_mismatch.title': 'Abweichung von Bewertung und Text',
  'signal.rating_text_mismatch.description':
    'Wie oft der mit einem Lexikon gemessene Ton des Textes der Sternebewertung widerspricht.',
  'signal.date_entropy.title': 'Datumsentropie',
  'signal.date_entropy.description':
    'Wie gleichmäßig sich die Rezensionsdaten über die Zeit verteilen; niedrige Entropie bedeutet, dass sich die Daten ballen.',
  'signal.local_guide_ratio.title': 'Local-Guide-Anteil',
  'signal.local_guide_ratio.description':
    'Anteil der Rezensenten mit Local-Guide-Stufe {level} oder höher.',
  'signal.owner_response_pattern.title': 'Muster der Inhaberantworten',
  'signal.owner_response_pattern.description':
    'Anteil der Rezensionen mit einer Antwort des Inhabers und wie identisch diese Antworten sind.',

  'data.eyebrow': 'aus docs/PRIVACY.de.md',
  'data.title': 'Was gesendet wird und was nie',
  'data.lead':
    'Nichts verlässt Ihren Browser, bevor Sie auf „Analysieren“ klicken, und auch dann nur, wenn Sie den einmaligen Zustimmungsbildschirm akzeptiert haben. Lehnen Sie ab, läuft jede Analyse lokal.',
  'data.sent.title': 'Gesendet, einmal pro Analyse',
  'data.sent.1': 'Die Orts-Kennung aus der Seiten-URL, verwendet als Cache-Schlüssel.',
  'data.sent.2':
    'Pro Rezension: Sternebewertung, Kalendertag (ohne Uhrzeit), Text, die öffentliche Rezensionsanzahl des Rezensenten, Fotoanzahl, Local-Guide-Stufe falls angezeigt und die Antwort des Inhabers falls vorhanden.',
  'data.sent.3':
    'Pro Rezension: ein Einweg-Hash aus Rezensenten-ID, Orts-ID und einem täglich in Ihrem Browser erzeugten Salt, damit verschiedene Rezensenten gezählt werden können, ohne zu wissen, wer sie sind.',
  'data.sent.4': 'Die angezeigte Gesamtzahl der Rezensionen und die Gesamtbewertung.',
  'data.sent.5': 'Sprache der Oberfläche und Version der Erweiterung.',
  'data.never.title': 'Nie gesendet',
  'data.never.1':
    'Namen der Rezensenten, Profil-URLs, Avatare, Nutzer-IDs oder irgendeine andere Rezensenten-Kennung.',
  'data.never.2': 'Ihr Google-Konto, Ihr Name oder Ihre E-Mail-Adresse.',
  'data.never.3': 'Ihr Browserverlauf, andere Tabs, Cookies oder lokaler Speicher.',
  'data.never.4':
    'Ihr Standort. Die API sieht wie jeder Webserver die IP-Adresse der Anfrage; sie wird nur im Arbeitsspeicher zur Ratenbegrenzung verwendet und nie gespeichert.',
  'data.kept.title': 'Auf dem Server behalten',
  'data.kept.text':
    'Das berechnete Profil pro Ort, für {days} Tage. Zwei Tageszähler ohne Kennungen.',
  'data.notStored.title': 'Nie gespeichert',
  'data.notStored.text': 'Rezensionstexte, Rezensenten-Hashes und IP-Adressen.',
  'data.google.title': 'Nie kontaktiert',
  'data.google.text':
    'Google. Die API stellt keine Anfrage an irgendeinen Google-Dienst; das erzwingen ein Test und eine Laufzeitsperre.',
  'data.more': 'Alle Details, Feld für Feld: <a href="{url}">Datenschutz</a>.',

  'verdict.eyebrow': 'unter jedem wert angezeigt',
  'verdict.title': 'Es ist kein Urteil',
  'legal.summary':
    'Dieser Wert ist eine statistische Zusammenfassung öffentlicher Bewertungsdaten; er ist keine Aussage über das Unternehmen oder einzelne Rezensenten.',
  'legal.noClaim':
    'Signalyze trifft keine Aussage über die Richtigkeit einer Rezension und keine Aussage über ein Unternehmen oder einen Rezensenten.',
  'verdict.note1':
    'Keine Schulnote und kein Bestanden oder Durchgefallen. Eine Zahl von 0 bis 100, immer zusammen mit dem Satz oben angezeigt.',
  'verdict.note2':
    'Jedes Signal ist auf der Methodik-Seite einzeln mit seiner Formel aufgeführt, sodass Sie der Gewichtung widersprechen können.',
  'verdict.note3':
    'Weniger als {min} Rezensionen: kein Wert, nur „nicht genug Daten“. Kleine Stichproben erzeugen extreme Verhältnisse.',
  'verdict.note4':
    'Keine Markierungen einzelner Rezensionen, keine Kennzeichnungen, keine Meldefunktionen und keine Vergleiche zwischen namentlich genannten Unternehmen.',

  'faq.eyebrow': '5 fragen',
  'faq.title': 'Häufige Fragen',
  'faq.1.q': 'Ist es kostenlos?',
  'faq.1.a': 'Ja. Signalyze ist kostenlos, ohne Premium-Stufe und ohne Werbung.',
  'faq.2.q': 'Braucht es ein Konto?',
  'faq.2.a':
    'Nein. Es gibt keine Konten, keine Cookies, keine Analytik und keine Telemetrie. Die Erweiterung behält nur Ihre Einstellungen und einen lokalen Cache der Profile, die Sie angesehen haben, in Ihrem eigenen Browser.',
  'faq.3.q': 'Funktioniert es offline?',
  'faq.3.a':
    'Ja. Wenn die Signalyze-API nicht erreichbar ist oder Sie das Senden von Daten ablehnen, läuft dieselbe Signal-Engine in Ihrem Browser. Diese Ergebnisse sind als „Offline-Analyse“ gekennzeichnet, damit Sie wissen, dass sie nicht aus dem gemeinsamen Cache stammen.',
  'faq.4.q': 'Funktioniert es auch außerhalb von Google Maps?',
  'faq.4.a':
    'Noch nicht. Version 0.1 funktioniert auf Unternehmensseiten von Google Maps. Unterstützung für das Wissenspanel der Google-Suche ist für Phase 2 geplant.',
  'faq.5.q': 'Wie wird der Wert berechnet?',
  'faq.5.a':
    'Jedes Signal ist eine Zahl zwischen 0 und 1, die angibt, wie ungewöhnlich der gemessene Wert im Vergleich zu typischen bewerteten Orten ist. Der Signalyze-Wert ist eine gewichtete Kombination der berechenbaren Signale auf einer Skala von 0 bis 100. Unter {min} Rezensionen wird kein Wert angezeigt. Jede Formel und jedes Gewicht steht auf der <a href="{url}">Methodik-Seite</a>.',

  'cta.title': 'Erst das Profil lesen, dann entscheiden.',
  'cta.text': 'Kostenlos, ohne Konto, nichts wird gesendet, bevor Sie auf „Analysieren“ klicken.',

  'footer.github': 'GitHub',
  'footer.trademark':
    'Google Maps und Local Guide sind Marken von Google LLC und werden nur genannt, um zu beschreiben, wo die Erweiterung funktioniert. Signalyze steht in keiner Verbindung zu Google.',

  'doc.source': 'quelle',
  'doc.changelogNote':
    'Die Versionshinweise werden nur auf Englisch geführt; die Liste unten ist das Originaldokument.',
  'doc.fallbackNote':
    'Diese Seite ist noch nicht auf {language} verfügbar; gezeigt wird das englische Original.',

  'notFound.eyebrow': '404',
  'notFound.title': 'Unter dieser Adresse gibt es nichts.',
  'notFound.text':
    'Die Seite wurde vielleicht verschoben. Alles auf dieser Website ist von der Startseite aus erreichbar.',
  'notFound.home': 'Zur Startseite',

  'mock.example': 'beispieldaten',
  'mock.place': 'Harbour Street Bakery',
  'mock.placeMeta': '4,6 ★ · 1.240 Rezensionen · 200 analysiert',
  'mock.scoreLabel': 'Signalyze-Wert · 0 bis 100',
  'mock.signals': 'Signale',
  'mock.monthly': 'Rezensionen pro Monat',
  'mock.months': 'S O N D J F M A M J J A',
  'mock.monthlyNote':
    '40 von 80 Rezensionen des letzten Jahres wurden innerhalb eines einzigen {days}-Tage-Fensters verfasst.',
  'mock.rating': 'Sterneverteilung',
  'mock.reviewers': 'Rezensenten',
  'mock.reviewers.single': 'nur eine Rezension',
  'mock.reviewers.guides': 'Local Guide Stufe {level}+',
  'mock.reviewers.noPhoto': 'kein Foto, kurzer Text',
  'mock.caption': 'Illustratives Seitenpanel. Der Ort und jede Zahl sind Beispieldaten.',
};
