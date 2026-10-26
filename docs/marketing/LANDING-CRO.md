# Landing Page CRO-Analyse
## https://www.lokaloptimal.at
### Analysedatum: 24.10.2026

Grundlage: Quellcode (`src/pages/index.astro`, `src/data/pricing.ts`, `BedarfsCheck`, `ContactForm`) und Desktop-Screenshot der Live-Seite. Ladezeit und Mobilansicht wurden nicht gemessen.

Leitfrage: Versteht eine Unternehmerin oder ein Unternehmer in 5 Sekunden, **was** LokalOptimal macht und **warum** sich die Investition lohnt?

Kurzantwort: **Teilweise.** Das „Was“ ist erkennbar, aber in Fachsprache. Das „Warum Sie“ und der Beweis, dass es wirkt, fehlen fast vollständig.

---

## Gesamtscore CRO: 49/100

## Seitentyp: Consultation Booking (Erstgespräch) mit Lead-Capture (GBP-Check, Bedarfs-Check, Kontaktformular)
## Geschätzte Conversion-Rate heute: 1–3 % (keine Messdaten vorhanden, Schätzung aus den Befunden)
## Realistisches Ziel: 5–8 %

| Bereich | Gewicht | Score |
|---|---|---|
| 1. Hero | 25 % | 5/10 |
| 2. Wertversprechen | 20 % | 5/10 |
| 3. Social Proof | 15 % | 2/10 |
| 4. Leistungen & Nutzen | 15 % | 6/10 |
| 5. Einwandbehandlung | 10 % | 6/10 |
| 6. Call-to-Action | 10 % | 5/10 |
| 7. Footer & Kontakt | 5 % | 7/10 |

---

## Bereichsanalyse

### 1. Hero [Score: 5/10]
**Befunde:**
- H1 „Google Business Profil Optimierung für Unternehmen in Österreich“ nennt eine **Leistung**, kein Ergebnis. Viele Betriebe kennen den Begriff „Google Business Profil“ nicht. Sie kennen „mein Eintrag auf Google Maps“.
- H1 hat 8 Wörter, ist aber Fachsprache und SEO-Formulierung, nicht Kundensprache.
- Subline „Weil der erste Eindruck zählt. Auf Google.“ ist sympathisch, aber vage. Sie sagt nicht, was der Kunde bekommt.
- „Mehr Sichtbarkeit · Mehr Vertrauen · Mehr Anfragen“ sind generische Versprechen, die jede Agentur macht.
- Badge „Google Business Profil Experte“ ist eine Selbstauskunft ohne Beleg.
- Kein Preisanker, kein Beweis, kein Gesicht im ersten Screen. Der Gründer erscheint erst ganz unten im Kontaktbereich.
- Das stärkste Einstiegsangebot (kostenloser GBP-Check, sofortiges Ergebnis) versteckt sich hinter „Mehr erfahren“.
- Positiv: klarer Primär-CTA mit Kontrast, ruhiges Layout, Hero-Visual zeigt ein Profil mit Score und unterstützt die Botschaft.

**Fixes:**
- **HOCH:** H1 auf Ergebnis in Kundensprache umstellen. Vorschläge:
  - „Mehr Anrufe von Kunden aus Ihrer Umgebung – über Google Maps.“
  - „Wenn jemand in Ihrer Nähe sucht, soll er Sie finden.“
  - „Ihr Google-Eintrag bringt Kunden. Wir sorgen dafür.“
  Den Begriff „Google Business Profil Optimierung“ in die Subline oder den `<title>` verschieben. Der SEO-Wert bleibt erhalten.
- **HOCH:** Subline konkret machen: *Was* wir tun, *für wen*, *ab welchem Preis*. Beispiel: „Wir richten Ihren Google-Eintrag vollständig ein und halten ihn aktuell: Fotos, Bewertungen, Beiträge. Für Praxen, Handwerk und Gastronomie in Österreich. Festpreise ab €347.“
- **MITTEL:** Die drei Häkchen durch konkrete Leistungen ersetzen: „Profil komplett eingerichtet“, „Bewertungen beantwortet“, „Monatlicher Bericht“.
- **MITTEL:** Badge „Experte“ durch einen prüfbaren Beleg ersetzen (z. B. echte Google-Bewertung von LokalOptimal, Anzahl betreuter Profile, Foto + Name des Gründers mit „aus Wien“).

### 2. Wertversprechen [Score: 5/10]
**4U-Check:**
- **Useful:** Ja. Das Problem ist echt.
- **Urgent:** Nein. Nichts sagt, warum jetzt handeln.
- **Unique:** Schwach. Warum LokalOptimal und nicht selbst machen oder eine andere Agentur? Das bleibt offen.
- **Ultra-specific:** Preise ja, Ergebnisse nein.

**Befunde:**
- Die Statistiken im Bereich „Vorteile“ (76 %, 88 %, 50 %, 2,7x) haben **keine Quelle**. Unternehmer sind skeptisch. Unbelegte Zahlen wirken eher wie Werbung als wie Fakten. Die 88-%-Zahl stammt nach unserem Kenntnisstand aus einer älteren BrightLocal-Umfrage (2014).
- Der Bereich „Was 2026 zählt“ ist gut belegt (Google-Hilfe verlinkt), aber er erklärt Pflichtarbeit. Er beantwortet nicht „Was habe ich davon?“.
- Das Zitat „Viele Profile sind eingerichtet, werden danach aber kaum aktiv gepflegt. Genau dort entsteht eine sichtbare Lücke.“ ist **die beste Problem-Aussage der Seite** und steht versteckt in einer Randbox.
- Der eigentliche Unterschied (eine persönliche Ansprechperson aus Wien, Festpreise offen, keine leeren Rankingversprechen) wird nirgends als Vorteil zusammengefasst.

**Fixes:**
- **HOCH:** Quellen zu allen vier Statistiken ergänzen oder die Zahlen durch belegte, aktuelle Werte ersetzen. Nicht belegbare Zahlen entfernen.
- **HOCH:** Neuer kurzer Abschnitt direkt nach dem Hero: **„Warum LokalOptimal?“** mit 3 Punkten:
  1. Ein fester Ansprechpartner statt Callcenter (Georg, Wien).
  2. Festpreise offen auf der Seite – keine Überraschungen.
  3. Ehrlich: keine Rankingversprechen, dafür messbare Arbeit und monatlicher Bericht.
- **MITTEL:** Kosten des Nichtstuns zeigen: „Ihr Mitbewerber zwei Straßen weiter hat 120 Bewertungen und aktuelle Fotos. Wen ruft der Kunde an?“ Der Konkurrenzvergleich im Check ist dafür ideal.

### 3. Social Proof [Score: 2/10]
**Befunde:**
- **Keine** Kundenstimmen, **keine** Fallstudien, **keine** Kundenlogos, **keine** eigene Google-Bewertung sichtbar.
- Für ein Angebot, das Bewertungen und Vertrauen verkauft, ist das der größte Widerspruch der Seite. Ein Unternehmer fragt sich: „Wenn Bewertungen so wichtig sind, wo sind Ihre?“
- Der Branchen-Marquee („Notar, Hausarzt, Friseure …“) zeigt Zielgruppen, aber keine echten Kunden. Er kann als Kundenliste missverstanden werden.

**Fixes (nur mit echten Daten, nichts erfinden):**
- **HOCH:** Eigenes Google-Unternehmensprofil von LokalOptimal mit Sternen und Anzahl einbinden, sobald Bewertungen vorhanden sind.
- **HOCH:** 1–2 Vorher/Nachher-Fälle aus echten Projekten: Profil-Score vorher → nachher, Anrufe/Routenanfragen aus Google Insights. Mit Erlaubnis des Kunden, Name + Branche + Ort.
- **MITTEL:** Solange keine Kunden vorhanden sind: transparente „Pilotkunden“-Formulierung oder ein anonymisiertes Beispiel, klar als Beispiel gekennzeichnet.
- **MITTEL:** Gründerfoto mit Name und Ort weiter nach oben holen (z. B. in den neuen „Warum LokalOptimal?“-Block). Menschen kaufen Dienstleistungen von Menschen.

### 4. Leistungen & Nutzen [Score: 6/10]
**Befunde:**
- Reihenfolge der Seite: Hero → Check → Branchen → Statistiken → „Was 2026 zählt“ → Add-on-Tabs → Paket-Finder → 4 Pakete → 2 Betreuungen → 7 Add-ons → GEO-Check → FAQ → Kontakt. Das sind **13 Abschnitte**. Add-ons erscheinen vor den Kernpaketen.
- Die Add-on-Tabs (QR Review Trigger, Google Beiträge, Landingpages) spielen automatisch ab. Der Nutzer sieht Zusatzleistungen, bevor er das Hauptangebot kennt.
- Leistungen sind oft Features ohne Nutzen: „Foto-Briefing Dokument“, „1x Google Post“, „Monatliches PDF-Reporting“.
- Positiv: QR-Tab übersetzt gut in Nutzen („Mehr Bewertungen. Weniger Reibung.“).

**Fixes:**
- **HOCH:** Einen einfachen „So funktioniert's“-Block in 3 Schritten nach dem Hero: 1. Kostenloser Check → 2. Wir richten Ihr Profil ein → 3. Wir halten es aktuell, Sie bekommen Anfragen.
- **MITTEL:** Add-on-Tabs hinter die Pakete verschieben oder in die Add-on-Liste integrieren.
- **MITTEL:** Paket-Punkte mit Nutzen versehen. Beispiel: „4x Google Posts / Monat“ → „4 Beiträge pro Monat – Ihr Profil wirkt aktiv und aktuell“.

### 5. Einwandbehandlung [Score: 6/10]
**Befunde:**
- Stark: offene Festpreise, „keine Rankingversprechen“, „monatlich kündbar“, „unverbindlich, ohne Verkaufsdruck“.
- Die FAQ ist SEO-orientiert („Was bedeutet GEO?“). Die echten Fragen eines Unternehmers fehlen.

**Fixes:**
- **HOCH:** FAQ um echte Einwände ergänzen:
  - „Kann ich das nicht selbst machen?“ (ehrlich: ja, kostet aber X Stunden pro Monat)
  - „Wie viel Aufwand habe ich dabei?“
  - „Wann merke ich etwas?“
  - „Was, wenn es nichts bringt?“
  - „Brauche ich dafür eine Website?“
- **MITTEL:** Die Rankingversprechen-Aussage positiv rahmen: „Wir versprechen kein Platz 1. Wir versprechen saubere Arbeit, die Sie jeden Monat im Bericht sehen.“

### 6. Call-to-Action [Score: 5/10]
**Befunde:**
- Laut Design-Brief (`.impeccable.md`): „Weniger CTAs, klarer Fokus auf das Erstgespräch“. Die Seite hat aber mindestens **6 konkurrierende Wege**: Erstgespräch, GBP-Check, Paket-Finder, 6x „Anfragen“ bei Paketen/Betreuung, 7x „Zur Anfrage hinzufügen“, GEO-Check, Kontaktformular.
- **15 Angebote** mit Preis (4 Pakete, 2 Betreuungen, 7 Add-ons, GEO-Check, Quick-Check) erzeugen Entscheidungsdruck. Ein Unternehmer will nicht 15 Optionen vergleichen.
- Header-CTA heißt „Termin vereinbaren“, Hero-CTA „Kostenloses Erstgespräch“, Kontakt „Kostenloses Erstgespräch buchen“. Gleiche Aktion, drei Namen.

**Fixes:**
- **HOCH:** Einen CTA-Text überall: „Kostenloses Erstgespräch buchen“. Mikrocopy darunter: „15 Minuten · unverbindlich · per Telefon oder Video“.
- **HOCH:** Klare Rolle für den GBP-Check: Er ist der **Einstieg für Unentschlossene**. Nach dem Ergebnis führt er direkt zum Erstgespräch („Ergebnis gemeinsam besprechen“).
- **MITTEL:** Add-ons standardmäßig eingeklappt („Weitere Einzelleistungen anzeigen“). Die Pakete bleiben sichtbar.

### 7. Footer & Kontakt [Score: 7/10]
**Befunde:**
- Abschlussbereich mit Gründerfoto, Zitat, Erstgespräch und Formular ist stark.
- Rechtsseiten verlinkt, aber laut README noch mit Platzhaltertext. Das ist ein Vertrauensrisiko, sobald jemand sie öffnet.
- Keine Telefonnummer sichtbar. Für lokale Unternehmer ist Anrufen oft der bevorzugte Weg.

**Fixes:**
- **HOCH:** Impressum, Datenschutz und AGB vor Launch fertigstellen.
- **MITTEL:** Telefonnummer (Click-to-Call) und Standort „Wien“ im Kontakt und Footer.

---

## Copy-Score: 42/100
| Dimension | Score | Notiz |
|---|---|---|
| Klarheit | 5/10 | Fachbegriff „Google Business Profil“ statt „Google-Eintrag / Google Maps“ |
| Dringlichkeit | 3/10 | Kein Grund, jetzt zu handeln |
| Konkretheit | 5/10 | Preise konkret, Ergebnisse vage |
| Beweis | 2/10 | Keine Kundenstimmen, Statistiken ohne Quelle |
| Handlungsorientierung | 6/10 | CTA vorhanden, aber zu viele parallele Wege |

---

## Formular-Audit
- **Kontaktformular:** 5 Felder (Name, E-Mail, Firma optional, Thema, Nachricht) + Datenschutz-Checkbox. Gut: korrekte `autocomplete`- und `type`-Attribute, Honeypot statt CAPTCHA.
  - Pflichtfeld „Nachricht“ ist eine Hürde. Optional machen oder mit Platzhalter helfen („z. B. Name Ihres Betriebs und Ort“).
  - Button bleibt deaktiviert, bis die Checkbox gesetzt ist. Ohne Hinweis wirkt das kaputt. Kurzen Hinweistext am Button ergänzen.
- **Paket-Finder (BedarfsCheck):** 3 Schritte mit klaren Fragen in Kundensprache („Wo steht Ihr Google Business Profil heute?“). Gute Mechanik. Er steht aber weit unten und konkurriert mit dem Erstgespräch.

---

## Mobil-Audit
Nicht live getestet. Aus dem Code:
- Hero-Visual besteht aus 4 Bildern mit `loading="eager"`. Auf Mobilgeräten prüfen, ob es den CTA unter den sichtbaren Bereich drückt.
- 13 Abschnitte bedeuten auf Mobilgeräten sehr langes Scrollen. Ein Sticky-CTA „Erstgespräch buchen“ am unteren Rand wäre sinnvoll.
- Telefonnummer mit `tel:`-Link fehlt.

---

## A/B-Test-Empfehlungen
(Messung erst nach Einrichtung eines datenschutzfreundlichen, cookielosen Zählers möglich, z. B. selbst gehostet.)
1. Wenn wir die H1 von „Google Business Profil Optimierung …“ auf „Mehr Anrufe von Kunden aus Ihrer Umgebung – über Google Maps“ ändern, dann steigen die Klicks auf das Erstgespräch, weil Besucher das Ergebnis sofort verstehen.
2. Wenn wir den GBP-Check als Primär-CTA im Hero zeigen („Profil in 30 Sekunden kostenlos prüfen“), dann steigen die qualifizierten Leads, weil die Einstiegshürde niedriger ist als ein Termin.
3. Wenn wir einen echten Vorher/Nachher-Fall direkt unter dem Hero zeigen, dann steigen die Buchungen, weil der Beweis den größten Einwand („Bringt das was?“) beantwortet.
4. Wenn wir die Add-ons standardmäßig einklappen, dann steigen die Paketanfragen, weil weniger Optionen die Entscheidung erleichtern.

---

## Priorisierte Maßnahmen

### Quick Wins (diese Woche)
1. H1 und Subline in Kundensprache mit Ergebnis und Preisanker umschreiben.
2. Einheitlicher CTA-Text „Kostenloses Erstgespräch buchen“ mit Mikrocopy.
3. Quellen zu den vier Statistiken ergänzen oder unbelegte Zahlen entfernen.
4. FAQ um 4–5 echte Unternehmer-Einwände ergänzen.

### Mittelfristig (dieser Monat)
1. Neuer Block „Warum LokalOptimal?“ mit Gründerfoto, direkt nach dem Hero.
2. „So funktioniert's“ in 3 Schritten.
3. Add-on-Tabs hinter die Pakete verschieben, Add-on-Liste einklappen.
4. Telefonnummer und Sticky-CTA auf Mobilgeräten.
5. Rechtsseiten fertigstellen.

### Strategisch (dieses Quartal)
1. Echte Kundenstimmen und 1–2 Fallstudien mit Zahlen sammeln und einbauen.
2. Eigenes Google-Profil von LokalOptimal mit Bewertungen aufbauen und einbinden.
3. Cookieloses Messen einrichten, dann A/B-Tests fahren.

---

## Wireframe: vorher / nachher

**Heute:**
```
[Nav: 6 Links + Termin vereinbaren]
H1: Google Business Profil Optimierung für Unternehmen in Österreich
Sub: Weil der erste Eindruck zählt. Auf Google.
[Kostenloses Erstgespräch]  Mehr erfahren
✓ Mehr Sichtbarkeit ✓ Mehr Vertrauen ✓ Mehr Anfragen
[Badge: Google Business Profil Experte]
---
GBP-Check → Branchen → Statistiken → Was 2026 zählt → Add-on-Tabs
→ Paket-Finder → Pakete → Betreuung → 7 Add-ons → GEO-Check → FAQ → Kontakt
```

**Empfohlen:**
```
[Nav: 4 Links + Kostenloses Erstgespräch buchen]
H1: Mehr Anrufe von Kunden aus Ihrer Umgebung – über Google Maps.
Sub: Wir richten Ihren Google-Eintrag vollständig ein und halten ihn aktuell.
     Für Betriebe in ganz Österreich. Festpreise ab €347.
[Kostenloses Erstgespräch buchen]   oder: Profil kostenlos prüfen →
15 Min · unverbindlich · Georg R.-F., Wien  [Foto]
---
Problem: „Viele Profile sind eingerichtet, aber kaum gepflegt.“ (+ Kosten des Nichtstuns)
So funktioniert's (3 Schritte)
Warum LokalOptimal? (3 Punkte) + Beweis (Fall / Bewertungen)
GBP-Check
Pakete (+ Betreuung) → Add-ons eingeklappt
FAQ mit echten Einwänden
Kontakt (Telefon, Formular, Erstgespräch)
```
