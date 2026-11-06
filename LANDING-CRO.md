# Landing Page CRO-Analyse

**Seite:** lokaler Stand von `/` inklusive der uncommitteten Änderungen in `index.astro` und `global.css`
**Datum:** 05.11.2026
**Vorgänger:** [docs/marketing/LANDING-CRO.md](docs/marketing/LANDING-CRO.md) vom 24.10.2026 (49/100)

**Geprüft:** Quelltext aller Landingpage-Komponenten sowie die gerenderte Seite auf Desktop und in einem 390-px-Rahmen (Handybreite).
**Nicht geprüft:** Absenden von Formularen und GBP-Check, da die Funktionen unter `api/` lokal nicht liefen. Ladezeit, das Cookie-Banner im Livebetrieb und die Rechtstexte. Die Studienzahlen wurden nicht erneut an den Primärquellen geprüft.

---

## Ergebnis

## CRO-Score: 68/100 (Oktober: 49/100)

**Seitentyp:** Beratungstermin (Erstgespräch), mit GBP-Check und Formularen als Nebenwegen
**Aktuelle Conversion-Rate:** nicht messbar, es liegen keine Messdaten vor. Im Code fand ich keine Conversion-Ereignisse.
**Zielwert:** erst festlegen, wenn eine Messung läuft.

Die Scores sind eine begründete Einschätzung, keine Messung.

| Bereich | Gewicht | Okt. | Heute |
|---|---|---:|---:|
| 1. Hero | 25 % | 5 | **8** |
| 2. Wertversprechen | 20 % | 5 | **7** |
| 3. Social Proof | 15 % | 2 | **5** |
| 4. Leistungen und Nutzen | 15 % | 6 | **6** |
| 5. Einwandbehandlung | 10 % | 6 | **8** |
| 6. Call-to-Action | 10 % | 5 | **6** |
| 7. Footer und Kontakt | 5 % | 7 | **7** |

**Kurzfassung:** Die Hauptbotschaft sitzt, und der Relaunch hat viel gebracht. Am meisten kosten jetzt vermutlich vier Dinge:

1. **Zwei Aussagen passen nicht zu den Paketen.** Das sollte zuerst korrigiert werden, weil die Seite von Transparenz lebt.
2. **Der stärkste Beleg und Ihr Gesicht kommen spät.** Das Fallbeispiel beginnt bei rund 34–40 % der Seite, das Gründerfoto erst im letzten Abschnitt.
3. **Der kostenlose Check ist für die Zielgruppe schwer zu bedienen.** Er verlangt einen „Teilen-Link“, erklärt aber nicht, wo man ihn findet.
4. **Auf dem Handy fehlt ein Buchungsweg über lange Strecken.** Die Seite ist rund 22.000 px lang, zwischen Hero und „Warum LokalOptimal“ steht kein fester Buchungsbutton.

---

## Priorisierte Maßnahmen

### Sofort (kleine Textänderungen)

| # | Maßnahme | Stelle |
|---|---|---|
| 1 | Bewertungsantworten auf die Pakete begrenzen, die sie enthalten | `index.astro:116`, `:176` |
| 2 | „inkl. Quick-Check“ korrigieren, weil er €147 extra kostet | `pricing.ts:103`, `:116` |
| 3 | „Meine Empfehlung“ ersetzen, wenn der Besucher selbst gewählt hat | `BedarfsCheck.tsx:304` |
| 4 | Ergebnis-Überschrift des Checks an den Score anpassen | `GBPAuditWidget.tsx:408` |
| 5 | Unbelegte Absolutaussagen im Check entschärfen | `GBPAuditWidget.tsx:64–100` |
| 6 | FAQ „Die Einrichtung ist kostenlos“ klarstellen | `index.astro:256` |
| 7 | Herkunft USA direkt an die BrightLocal-Zahlen schreiben | `index.astro:80`, `:104`, `:115` |
| 8 | Fachbegriffe laut Wortliste ersetzen | siehe Abschnitt 4 |
| 9 | Einheitlicher Buchungstext statt „Termin vereinbaren“ | `GBPAuditWidget.tsx:328`, `:451` |

### Danach (kleine Umbauten)

| # | Maßnahme | Stelle |
|---|---|---|
| 10 | Anleitung für den Teilen-Link in den Check einbauen | `GBPAuditWidget.tsx:382` |
| 11 | Buchungsbutton direkt nach dem Fallbeispiel | `index.astro:790` |
| 12 | Zweiter Einstieg im Hero: „Oder Google-Eintrag gratis prüfen“ | `index.astro:436` |
| 13 | Erstgespräch im Kontaktbereich zum Hauptbutton machen | `index.astro:1040` |
| 14 | Einwilligung vor den Sendebutton, Hinweis bei gesperrtem Button | `ContactForm.tsx:94–118`, `BedarfsCheck.tsx:424–444` |
| 15 | Nachricht im Kontaktformular optional, Antwortzeit in der Bestätigung | `ContactForm.tsx:37`, `:90` |
| 16 | Conversion-Ereignisse einrichten | siehe Abschnitt „Messung“ |

### Größere Schritte

| # | Maßnahme | Hinweis |
|---|---|---|
| 17 | Fallbeispiel und Gründer nach vorn, Paket-Finder direkt nach die Preise | siehe Abschnitt „Aufbau“ |
| 18 | Mobile Buchungsleiste am unteren Rand | Muss Formulare und Cookie-Banner freilassen |
| 19 | Echtes Zitat der Ordination einholen | Nur mit Zustimmung, Anonymisierung bleibt möglich |
| 20 | Eigene Google-Bewertungen von LokalOptimal aufbauen und zeigen | Erst wenn echte Bewertungen vorliegen |

---

## Bereichsanalyse

### 1. Hero: 8/10

**Stark**
- Die H1 nennt in 7 Wörtern und in Kundensprache ein Ergebnis.
- Die Subline sagt, was passiert und für wen.
- Der Hauptbutton ist auf beiden Breiten sofort sichtbar (Handy: bei 329–378 px).
- „30 Minuten, unverbindlich“ und „ab €347“ nehmen früh die Hürde.

**Schwächen**
- Der Hero enthält keinen echten Beleg. Die Karte ist korrekt als „Beispiel“ markiert, zeigt aber nur eine Illustration.
- Die Vertrauensleiste liegt auf dem Handy unter der Falz (851–949 px bei 844 px Höhe).
- Wer noch nicht zum Gespräch bereit ist, findet im Hero keinen kleineren Schritt. Der Gratis-Check steht nur im Menü und zwei Abschnitte tiefer.

**Vorschläge**

| | Text |
|---|---|
| **Hoch: neuer Link unter dem Button** | „Noch nicht sicher? Google-Eintrag gratis prüfen“ (Ziel: `#quick-check`) |
| **Mittel: Vertrauensleiste, neuer erster Punkt** | „Fallbeispiel: 102 Kundeninteraktionen in 6 Monaten“ (Ziel: `#fallbeispiel`) |

### 2. Wertversprechen: 7/10

**Stark**
- „Sie kümmern sich um Ihre Kunden. Ich um Ihren Google-Eintrag.“ ist die prägnanteste Positionierung der Seite.
- Der Abschnitt „Warum LokalOptimal“ grenzt sich glaubwürdig ab.

**Schwächen**
- **Widerspruch zu den Paketen (hoch):** Die Seite verspricht pauschal Antworten auf Bewertungen. Starter, Essential und Care enthalten sie nicht.
- **Falsches Etikett:** Über dem Ablauf steht „So funktioniert's“, die H2 und der Absatz beschreiben aber das Problem. Der dritte Schritt „Alles aus einer Hand“ ist zudem kein Schritt.
- **Zahlen ohne Herkunft:** Die Karten nennen 97 %, 47 % und 89 % ohne Land. „USA“ steht nur in der Quellenzeile am Ende des Abschnitts. Der Kommentar in `index.astro:53` verlangt aber, dass jede Karte Quelle und Land nennt.
- **KI-Zahl passt nicht zur Überschrift:** „Rund 40 % nutzen KI“ belegt allgemeine Nutzung, nicht „Was Kunden prüfen, bevor sie anrufen“.

**Vorschläge**

| Stelle | Vorher | Nachher |
|---|---|---|
| `index.astro:116` | Ich beantworte Ihre Bewertungen persönlich. | In Growth, Local Pro und Pro Care beantworte ich Ihre Bewertungen persönlich. |
| `index.astro:175–176` | **Alles aus einer Hand:** Regelmäßige Beiträge, Antworten auf Ihre Bewertungen und ein monatlicher Bericht. Sie sehen, was passiert, und müssen nichts selbst machen. | **Auf Wunsch laufend betreut:** Mit laufender Betreuung übernehme ich regelmäßige Beiträge und den monatlichen Bericht, ab Growth auch die Antworten auf Ihre Bewertungen. Welche Leistung in welchem Paket steckt, sehen Sie bei den Preisen. |
| `index.astro:80` | lesen Bewertungen, bevor sie einen lokalen Betrieb wählen. | lesen in den USA Bewertungen, bevor sie einen lokalen Betrieb wählen. |
| `index.astro:527` | Aktuelle Zahlen zu Google-Einträgen und Bewertungen … | Aktuelle Zahlen zu Bewertungen und KI-Nutzung, und was LokalOptimal daraus für Ihren Betrieb macht. |

*Hinweis zu Care: Das Paket enthält „Review-Monitoring“, aber keine Antworten. Pro Care enthält sie, Growth und Local Pro ebenfalls.*

### 3. Social Proof: 5/10

**Stark**
- Das Fallbeispiel ist echt, nachvollziehbar und ohne Übertreibung. Die Plattformwerte ergeben zusammen die genannten 271 Aufrufe, und auch „drei von vier“ stimmt (202 von 271).
- Studien sind verlinkt, und Beispieldaten sind als solche markiert.

**Schwächen**
- Es gibt nur einen Fall und kein Kundenzitat.
- Eine eigene Google-Bewertung von LokalOptimal fehlt. Die Kontaktkarte sieht aus wie ein Google-Eintrag, zeigt aber keine Sterne. Das kann die Frage auslösen: „Wo sind Ihre Bewertungen?“
- Der Fall steht spät: am Desktop bei rund 40 %, am Handy bei rund 34 % der Seitenlänge.
- Es gibt keinen Vorher-Wert für die Zahlen, weil der Eintrag neu war. Die Seite kann also Reichweite zeigen, aber keine Steigerung. Das ist ehrlich und sollte so bleiben.
- Sichtbar steht nur „Georg R.-F.“. Der Design-Brief nennt „Founder-Foto und echter Name“ als Vertrauensprinzip.

**Vorschläge (nur mit echten Belegen)**
- **Hoch:** Ordination um ein kurzes Zitat bitten und es im Fallbeispiel zeigen.
- **Hoch:** Einen zweiten Fall ergänzen, sobald Daten vorliegen, idealerweise aus einer anderen Branche.
- **Mittel:** Gründerfoto und Namen in den Punkt „Ein Ansprechpartner, kein Callcenter“ holen. Ob der volle Name sichtbar wird, ist Ihre Entscheidung.

### 4. Leistungen und Nutzen: 6/10

**Stark:** Der Abschnitt zu den Paketen ist klar gegliedert und die Preise sind offen.

**Schwächen**
- **Fachsprache in den Paketen:** Die in `docs/marketing/COPY-SUGGESTIONS.md` beschlossene Wortliste ist im oberen Seitenteil umgesetzt, in Preisen, Check und FAQ aber kaum.
- **Viele Preispunkte:** 4 Pakete, 2 Betreuungen, 7 Zusatzleistungen, GEO-Check und Quick-Check ergeben 15 Preise.
- **Länge:** Preise und Zusatzleistungen belegen am Handy zusammen rund 7.200 px.
- **Abstand:** „Anfragen“ springt über den gesamten Add-on-Bereich hinweg zum Paket-Finder.

**Vorschläge**

| Stelle | Vorher | Nachher |
|---|---|---|
| `pricing.ts:46` | GBP Audit & Analyse | Prüfung Ihres Google-Eintrags |
| `pricing.ts:59` | 1x Google Post | 1 Beitrag auf Ihrem Google-Eintrag |
| `pricing.ts:73` | 4x Google Posts / Monat | 4 Beiträge pro Monat auf Ihrem Eintrag |
| `pricing.ts:73` | Review-Monitoring & Antworten (bis 15 / Monat) | Bewertungen im Blick behalten und bis zu 15 pro Monat beantworten |
| `pricing.ts:73` | Monatliches PDF-Reporting | Monatlicher Bericht als PDF |
| `pricing.ts:104` | Review-Monitoring | Bewertungen im Blick behalten (ohne Antworten) |
| `pricing.ts:103`, `:116` | Direkter Einstieg inkl. einmaligem Profil Quick-Check. | Beim Direkteinstieg kommt einmalig der Profil Quick-Check dazu (€147). |
| `index.astro:1016–1017` | Google Business Profil: Kurz beantwortet / Die wichtigsten Punkte vor einem kostenlosen GBP-Check. | Ihre Fragen, kurz beantwortet / Was Unternehmer vor dem Erstgespräch meist wissen möchten. |
| `index.astro:283` | Was passiert beim kostenlosen GBP-Check? | Was passiert beim kostenlosen Check Ihres Google-Eintrags? |
| `ContactForm.tsx:67–68` | GBP Audit | Kostenloser Check meines Google-Eintrags |

Falls der Wert `GBP Audit` im Postfach oder Sheet ausgewertet wird, muss die Auswertung mit angepasst werden. Das habe ich nicht geprüft.

### 5. Einwandbehandlung: 8/10

**Stark:** Die ersten fünf FAQ-Fragen treffen echte Einwände. Offene Preise, die Laufzeit-Antwort und der Verzicht auf Ranking-Versprechen sind überzeugend.

**Schwächen**
- **Missverständlich:** „Die Einrichtung ist kostenlos“ steht neben einem Einrichtungspaket ab €347.
- **Zu absolut:** „Die Änderungen an Ihrem Eintrag sind sofort nach der Einrichtung sichtbar“. Google kann Änderungen erst prüfen, das sollte der Satz offenlassen.
- **Wiederholung:** „Keine Ranking-Versprechen“ steht viermal (Warum-Abschnitt, FAQ, Hinweis unter den Preisen, Footer). Zweimal reicht. Ich würde den Kasten unter den Preisen (`index.astro:877`) streichen.
- **Es fehlen Antworten auf:** „Was passiert nach dem Erstgespräch?“ und „Brauchen Sie Zugriff auf mein Google-Konto?“

**Vorschläge**

| Stelle | Vorher | Nachher |
|---|---|---|
| `index.astro:256` | Die Einrichtung ist kostenlos, und Google stellt alle Werkzeuge bereit. | Der Eintrag selbst kostet bei Google nichts, und Google stellt alle Werkzeuge bereit. |
| `index.astro:264` | Die Änderungen an Ihrem Eintrag sind sofort nach der Einrichtung sichtbar. | Die meisten Änderungen sehen Sie kurz nach der Einrichtung. Manche prüft Google zuerst, das kann etwas dauern. |

Die Antworten auf die zwei neuen Fragen müssen von Ihnen kommen, weil sie Ihren tatsächlichen Ablauf beschreiben.

### 6. Call-to-Action: 6/10

**Stark:** Hero, Header und Kontakt nutzen fast denselben Text, und die Rolle des Checks als Einstieg ist erkennbar.

**Schwächen**
- **Nach dem stärksten Beleg fehlt der Button:** Auf das Fallbeispiel folgen direkt die Preise.
- **Hauptziel optisch nachrangig:** Im Kontaktbereich ist „Erstgespräch buchen“ hell (`btn-secondary`), „Anfrage senden“ dagegen blau. Der Besucher wird also zum Formular gelenkt.
- **Handy:** Der Header-Button ist ausgeblendet, eine feste Buchungsleiste gibt es nicht.
- **Uneinheitlich:** Der Check nutzt „Termin vereinbaren“.
- **Empfehlung ohne Empfehlung:** Wer bei „Growth“ auf „Anfragen“ klickt, liest „Meine Empfehlung für Sie“, obwohl er selbst gewählt hat.

**Vorschläge**

| Stelle | Vorher | Nachher |
|---|---|---|
| Nach `index.astro:790` | (nichts) | Button „Kostenloses Erstgespräch buchen“ und darüber: „Wie sieht das bei Ihrem Betrieb aus?“ |
| `index.astro:1040` | Heller Button | Hauptbutton in Blau |
| `GBPAuditWidget.tsx:451` | Termin vereinbaren | Ergebnis im Erstgespräch besprechen |
| `GBPAuditWidget.tsx:328` | Termin vereinbaren | Kostenloses Erstgespräch buchen |
| `BedarfsCheck.tsx:304` | Meine Empfehlung für Sie | Ihre Auswahl |

### 7. Footer und Kontakt: 7/10

**Stark:** Die Kontakt-H2 („In 30 Minuten wissen Sie, was Ihrem Google-Eintrag fehlt.“) ist eine der besten Zeilen der Seite. Rechtsseiten sind verlinkt.

**Schwächen**
- Die E-Mail-Adresse steht nur versteckt im Paket-Finder, nicht im Kontaktbereich.
- Der Gründer erscheint erst im letzten Abschnitt.

**Vorschlag:** In der Kontaktkarte ergänzen: „lokaloptimal@gmail.com“ und „Antwort innerhalb von 24 Stunden“. Die Antwortzeit steht bereits in `BedarfsCheck.tsx:192`, bitte nur übernehmen, wenn sie für alle Wege gilt.

Eine Telefonnummer empfehle ich bewusst nicht, weil Sie am 25.10.2026 dagegen entschieden haben.

---

## Copy-Score: 62/100 (zuvor 42/100)

| Dimension | Score | Begründung |
|---|---:|---|
| Klarheit | 7/10 | Oben sehr klar, weiter unten wieder Fachsprache |
| Dringlichkeit | 4/10 | Kein Grund, jetzt zu handeln. Künstliche Dringlichkeit passt aber nicht zur Marke |
| Konkretheit | 7/10 | Preise und Fallzahlen konkret, Umfang der Antworten unscharf |
| Beweis | 6/10 | Echter Fall und Quellen, aber nur ein Fall und kein Zitat |
| Handlungsorientierung | 7/10 | Klarer Hauptweg, aber Lücken nach dem Fallbeispiel und auf dem Handy |

**Dringlichkeit ehrlich erhöhen:** Keine Countdowns oder „nur noch X Plätze“. Ein echter Anlass genügt, etwa im Ergebnis des Checks: „Diese Lücken sehen Ihre Kunden schon heute.“

---

## GBP-Check

Der Check ist der wichtigste Einstieg für Unentschlossene. Hier lohnt sich die Arbeit besonders.

| Problem | Stelle | Vorschlag |
|---|---|---|
| Der „Teilen-Link“ wird nicht erklärt, obwohl die Zielgruppe wenig technikaffin ist | `:382` | Direkt am Feld: „So finden Sie den Link: Google Maps öffnen → Ihren Betrieb suchen → Teilen → Link kopieren“ |
| Das Feld heißt „Google Business Profil-URL“ | `:362` | „Link zu Ihrem Google-Eintrag“ |
| „… hat klare Hebel“ erscheint auch bei „Gut aufgestellt“ | `:408` | Je nach Score: *Kritisch:* „Bei {Name} fehlen wichtige Angaben.“ *Ausbaufähig:* „{Name} hat noch sichtbare Lücken.“ *Gut:* „{Name} ist gut aufgestellt. Jetzt geht es ums Dranbleiben.“ |
| „Scan-Limit“ wirkt technisch | `:322` | „Sie haben heute alle kostenlosen Prüfungen genutzt.“ |
| Starke Aussagen ohne Beleg, z. B. „verliert diesen Vergleich fast immer“ oder „erhöhen die Klickrate direkt im Suchergebnis“ | `:64–100` | Abschwächen oder belegen. Beispiel: „Neukunden vergleichen. Wenige Bewertungen können dabei gegen Sie sprechen.“ |

---

## Formular-Audit

**Bereits gut:** korrekte `type`- und `autocomplete`-Attribute, Honeypot statt CAPTCHA, Felder sind am Handy groß genug (53 px hoch, 16 px Schrift), und die Beschriftungen sind sichtbar.

| Problem | Stelle | Vorschlag |
|---|---|---|
| Die Einwilligung steht **unter** dem Sendebutton, der bis dahin ohne Hinweis gesperrt ist | `ContactForm.tsx:94–118`, `BedarfsCheck.tsx:424–444` | Checkbox vor den Button, dazu: „Bitte bestätigen Sie zuerst die Datenschutzerklärung.“ |
| Nachricht ist Pflicht und erwartet Fachwissen | `ContactForm.tsx:89–90` | Optional machen. Platzhalter: „Zum Beispiel: Name Ihres Betriebs und Ihre Frage“ |
| Nach dem Absenden fehlt der nächste Schritt | `ContactForm.tsx:37` | „Danke. Ihre Anfrage ist angekommen. Ich melde mich innerhalb von 24 Stunden.“ |
| „Wohin darf ich das Angebot schicken?“ ist gut, „Anfrage mit Auswahl senden“ ist es weniger | `BedarfsCheck.tsx:426` | „Angebot anfordern“, sofern tatsächlich ein Angebot folgt |

Das Absenden selbst und die Fehlermeldungen wurden nicht live getestet.

---

## Mobil-Audit (390 × 844 px)

| Prüfpunkt | Ergebnis |
|---|---|
| Waagrechtes Scrollen | Keines |
| H1 und Hauptbutton im ersten Screen | Ja |
| Lesegröße | 16 px, in Ordnung |
| Seitenlänge | Rund 22.200 px, also etwa 26 Bildschirme |
| Fester Buchungsweg | Fehlt |
| Vertrauensleiste im ersten Screen | Nein |
| Gründerfoto | Erst ab etwa 88 % der Seite |

Das Ergebnis stammt aus einem 390-px-Rahmen, nicht von einem echten Gerät. Ein Test auf einem echten Handy bleibt sinnvoll.

---

## Ladezeit

Nicht bewertet, weil Werte aus dem Entwicklungsserver nichts über die Live-Seite aussagen. Empfehlung: Lighthouse oder PageSpeed Insights auf der Produktivseite ausführen.

---

## Aufbau

**Heute**
```
Hero → Ablauf → Check → Branchen → Zahlen → Warum → Fallbeispiel
→ Preise → Zusatzleistungen → Paket-Finder → FAQ → Kontakt
```

**Vorschlag**
```
Hero (mit Link zum Check und Hinweis auf den Fall)
→ Problem und Ablauf
→ Fallbeispiel + Button
→ Warum LokalOptimal (mit Foto und Name)
→ Check
→ Zahlen
→ Preise → Paket-Finder
→ Zusatzleistungen (kürzer)
→ FAQ → Kontakt
```

Die Branchen würde ich als kurze Zeile in den Hero- oder Warum-Bereich ziehen statt als eigenen Abschnitt. Das spart auf dem Handy rund 700 px.

---

## Messung

Google Analytics ist eingebunden und wartet auf die Einwilligung, im Code fand ich aber keine eigenen Conversion-Ereignisse. Besucher ohne Einwilligung werden nicht erfasst, Werte sind also Untergrenzen.

**Zuerst diese vier Ereignisse messen:**
1. Klick auf einen Buchungsbutton, mit Angabe der Position
2. Abgeschlossener GBP-Check
3. Abgesendete Anfrage aus dem Paket-Finder
4. Abgesendetes Kontaktformular

Die wichtigste Kennzahl liegt außerhalb der Website: gebuchte und stattgefundene Erstgespräche im Sheet. Bei wenig Verkehr liefern A/B-Tests lange keine verlässlichen Ergebnisse. Sinnvoller ist dann ein Vorher/Nachher-Vergleich über mehrere Wochen.

**Bitte vor dem Launch prüfen:** Fehlt `PUBLIC_CAL_URL` auf Vercel, führt der Buchungsbutton zu einem Platzhalter (`cal.com/DEIN-USERNAME`). Lokal ist die Variable gesetzt, die Produktivumgebung konnte ich nicht einsehen.

---

## Testideen

1. Wenn der Hero einen Link zum Gratis-Check bekommt, steigen die abgeschlossenen Checks, weil der Einstieg kleiner ist als ein Termin. **Risiko:** weniger direkte Buchungen, deshalb beide Werte beobachten.
2. Wenn das Fallbeispiel direkt nach dem Ablauf steht, steigen die Buchungen, weil der Einwand „Bringt das etwas?“ früher beantwortet wird.
3. Wenn der Check eine Anleitung zum Link zeigt, schließen mehr Besucher ihn ab, weil die größte Hürde wegfällt.
4. Wenn das Handy eine feste Buchungsleiste bekommt, steigen die Terminklicks, weil der Weg auf der langen Seite immer erreichbar ist.

---

## Vermutete Aufmerksamkeit (ohne Heatmap-Daten)

Das sind Hypothesen, keine Beobachtungen.

- **Viel Aufmerksamkeit:** Hero, animierte Karte, große Prozentzahlen, Preise.
- **Gefährdet:** Zusatzleistungen und FAQ-Antworten weit unten. Das Fallbeispiel liegt für viele vermutlich schon jenseits der Scrolltiefe.
- **Mögliche Fehlklicks:** Die Karte „Nachricht schreiben“ im Kontaktbereich sieht wie ein Button aus, ist aber nur eine Markierung (`index.astro:1072`). Auch Hero-Karte und Bewertungsbeispiele könnten klickbar wirken.

---

## Bewusst nicht empfohlen

Diese Standardvorschläge des Skills passen nicht zu LokalOptimal:

- **Countdown oder Verknappung:** widerspricht „sachlich, verlässlich“.
- **Chatbot oder Live-Chat:** widerspricht dem persönlichen Ansprechpartner.
- **Erfundene Kundenstimmen, Logos oder Zahlen:** Es zählen nur echte Belege.
- **Navigation entfernen:** Die Seite ist zugleich Ihre Hauptseite und Teil der Recherche.
- **Conversion-Prognosen und Umsatzwirkung:** Ohne Messdaten wären das erfundene Zahlen. Auch die Benchmarks des Skills habe ich nicht übernommen, weil er keine Quellen nennt.
