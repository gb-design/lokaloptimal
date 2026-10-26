# LokalOptimal – Preisübersicht

Stand: 06.10.2026 · Quelle: [src/data/pricing.ts](src/data/pricing.ts) (die Website, der Bedarfs-Check und die Angebots-PDFs lesen alle aus dieser Datei)

Alle Preise sind **netto, zzgl. 20 % USt.** Die Angebote richten sich nur an Unternehmen (B2B, siehe AGB §1). Die Brutto-Werte stehen nur zur Orientierung hier und sind auf der Website nicht ausgewiesen.

---

## 1. Pakete (Setup & befristetes Management)

| Paket | Preis netto | Brutto (20 %) | Abrechnung | Ø pro Monat |
|---|---:|---:|---|---:|
| **Starter** | €347 | €416,40 | einmalig | – |
| **Essential** | €697 | €836,40 | einmalig | – |
| **Growth** ⭐ (hervorgehoben) | €1.397 | €1.676,40 | 3 Monate feste Laufzeit (Gesamtpreis) | ca. €466 |
| **Local Pro** | €3.497 | €4.196,40 | 6 Monate feste Laufzeit (Gesamtpreis) | ca. €583 |

### Leistungsumfang

**Starter, €347 einmalig.** Der Einstieg mit einem professionellen Profil-Setup.
- GBP Audit & Analyse
- Vollständiges Profil-Setup
- Kategorien, Texte, Öffnungszeiten

**Essential, €697 einmalig.** Das komplette Setup inklusive Blick auf die Konkurrenz.
- Alles aus Starter
- Foto-Briefing Dokument *(Einzelpreis €97)*
- 1x Google Post
- Konkurrenzanalyse mit 3 Mitbewerbern *(Einzelpreis €197)*

**Growth, €1.397 für 3 Monate.** Aktives Management für mehr Sichtbarkeit.
- Alles aus Essential
- 3 Monate aktives Management
- 4x Google Posts pro Monat
- Review-Monitoring & Antworten, bis 15 pro Monat *(entspricht Review-Response Service, €127/Monat)*
- Monatliches PDF-Reporting

**Local Pro, €3.497 für 6 Monate.** Die Komplettlösung.
- Alles aus Growth
- 6 Monate aktives Management
- 8x Google Posts pro Monat
- Review- & KI-Antworten-Management, bis 15 Bewertungen und 10 Fragen pro Monat *(entspricht KI-Antworten-Management, €79/Monat)*
- Strategie-Call jeden Monat

### Im Paket enthaltene Add-ons

Diese Add-ons sind im jeweiligen Paket schon enthalten. Werden sie zusätzlich gewählt, lässt das Angebot sie automatisch weg (siehe [offers.ts](src/lib/dashboard/offers.ts)).

| Paket | Enthaltene Add-ons | Einzelwert |
|---|---|---:|
| Starter | – | – |
| Essential | Foto-Briefing, Konkurrenzanalyse | €294 einmalig |
| Growth | Foto-Briefing, Konkurrenzanalyse, Review-Response | €294 einmalig + €127/Monat |
| Local Pro | Foto-Briefing, Konkurrenzanalyse, Review-Response, KI-Antworten-Management | €294 einmalig + €206/Monat |

---

## 2. Laufende Betreuung (monatlich kündbar)

| Paket | Preis netto | Brutto (20 %) | Kündigung |
|---|---:|---:|---|
| **Care** | €399 / Monat | €478,80 / Monat | 30 Tage zum Monatsende |
| **Pro Care** | €499 / Monat | €598,80 / Monat | 30 Tage zum Monatsende |

**Care**
- 4x Google Posts pro Monat
- Review-Monitoring
- Monatliches Reporting

**Pro Care**
- 8x Google Posts pro Monat
- Review- & KI-Antworten-Management *(enthält Review-Response und KI-Antworten-Management, Einzelwert €206/Monat)*
- Strategie-Call pro Quartal

### Pflichtposition beim Direkteinstieg

Wer direkt mit Care oder Pro Care startet, ohne vorher ein Paket zu buchen, zahlt einmalig:

| Leistung | Preis netto | Brutto |
|---|---:|---:|
| **Profil Quick-Check & Übernahme** | €147 einmalig | €176,40 |

Daraus ergibt sich im ersten Monat:

| | Erster Monat netto | Ab dem 2. Monat netto |
|---|---:|---:|
| Care | €546 | €399 |
| Pro Care | €646 | €499 |

Wer nach Growth oder Local Pro in Care oder Pro Care wechselt, bucht das ausdrücklich dazu, denn die feste Laufzeit verlängert sich nicht automatisch (AGB §6).

---

## 3. Add-ons & Einzelleistungen

| Add-on | Umfang | Preis netto | Brutto | Abrechnung |
|---|---|---:|---:|---|
| Extra Google Posts | +4 Posts / Monat | €167 | €200,40 | monatlich |
| Review-Response Service | bis 15 Antworten / Monat, jede weitere €6 | €127 | €152,40 | monatlich |
| KI-Antworten-Management | bis 10 Fragen / Monat | €79 | €94,80 | monatlich |
| Landingpage | 1-Pager inkl. 1 Korrekturrunde | €1.197 | €1.436,40 | einmalig |
| Konkurrenzanalyse | 3 Mitbewerber | €197 | €236,40 | einmalig |
| Website GEO-Check | KI-Sichtbarkeit (ChatGPT, Perplexity, AI Overviews) | €197 | €236,40 | einmalig |
| QR Review Trigger | Design + Druckdaten | €147 | €176,40 | einmalig |
| Foto-Briefing Dokument | – | €97 | €116,40 | einmalig |

Den **Website GEO-Check** gibt es nur als Einzelleistung im Bedarfs-Check, nicht als Add-on zu einem Paket.

**Mengengrenzen (AGB §2):** Über die inkludierten Mengen hinaus wird gesondert verrechnet. Das sind 15 Bewertungsantworten und 10 KI-Fragen pro Monat. Für zusätzliche Bewertungsantworten nennt der Tooltip €6 pro Antwort.

---

## 4. Zahlungs- & Vertragsbedingungen (aus den AGB)

- **Setup- und Projektleistungen:** 50 % Anzahlung bei Auftragserteilung, 50 % nach Abschluss.
- **Laufende Betreuung:** monatliche Abrechnung oder gemäß Angebot.
- **Zahlungsfrist:** 7 Tage ab Rechnungsdatum. Bei Zahlungsverzug dürfen laufende Leistungen ausgesetzt werden.
- **Growth / Local Pro:** feste Laufzeit von 3 bzw. 6 Monaten. Die Kündigung ist mit 30 Tagen Frist zum Laufzeitende möglich. Es gibt keine automatische Verlängerung.
- **Care / Pro Care:** keine Mindestlaufzeit, Kündigung mit 30 Tagen Frist zum Monatsende.
- **Nicht inkludiert**, sofern nicht im Angebot genannt: Domain, Hosting, laufende Technik- und Lizenzkosten, Texte, Bilder, Rechtstexte und Cookie-Setup.

---

## 5. Schnellvergleich

| | Starter | Essential | Growth | Local Pro | Care | Pro Care |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Preis netto | €347 | €697 | €1.397 | €3.497 | €399/Mo | €499/Mo |
| Laufzeit | einmalig | einmalig | 3 Mo | 6 Mo | monatl. kündbar | monatl. kündbar |
| GBP Audit & Setup | ✓ | ✓ | ✓ | ✓ | Quick-Check (€147) | Quick-Check (€147) |
| Foto-Briefing | – | ✓ | ✓ | ✓ | – | – |
| Konkurrenzanalyse | – | ✓ | ✓ | ✓ | – | – |
| Google Posts | – | 1x gesamt | 4x / Mo | 8x / Mo | 4x / Mo | 8x / Mo |
| Review-Antworten | – | – | bis 15 / Mo | bis 15 / Mo | nur Monitoring | ✓ |
| KI-Antworten-Mgmt. | – | – | – | bis 10 / Mo | – | ✓ |
| Reporting | – | – | monatl. PDF | monatl. PDF | monatlich | – * |
| Strategie-Call | – | – | – | monatlich | – | pro Quartal |

\* Bei Pro Care steht Reporting in [pricing.ts](src/data/pricing.ts) nicht ausdrücklich in der Leistungsliste, obwohl Care es enthält. Vermutlich ist es mitgemeint. Das sollte man im Text prüfen.

---

*Bei Preisänderungen [src/data/pricing.ts](src/data/pricing.ts), [public/llms.txt](public/llms.txt), die AGB und diese Datei gemeinsam anpassen.*
