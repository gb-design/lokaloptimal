# SEO- und GEO-Prioritäten für lokaloptimal.at

Stand: 2026-07-08

## Ausgangslage

lokaloptimal.at steht noch am Anfang. Die technische SEO-Basis ist grundsätzlich vorhanden: die Seite ist erreichbar, indexierbar, hat Meta-Tags, strukturierte Daten, `robots.txt` und `sitemap.xml`.

Der Engpass liegt aktuell nicht primär bei der Technik, sondern bei Reichweite, thematischer Abdeckung und Vertrauenssignalen. Da noch keine echten Kundenrezensionen oder Case Studies vorhanden sind, muss Sichtbarkeit zunächst über fachlich starke, gut strukturierte und zitierfähige Inhalte aufgebaut werden.

## Ziel

Die Website soll für klassische Google-Suchen und für KI-/Answer-Engines besser auffindbar werden, insbesondere für Suchintentionen rund um:

- Google Business Profil Optimierung
- Google Unternehmensprofil Betreuung
- Local SEO in Österreich
- lokale Sichtbarkeit für Dienstleister, Ärzte, Therapeuten, Gastronomie und Handwerker

## Priorität 1: Startseite schärfen

Die Startseite sollte klarer auf das Hauptthema einzahlen.

### Maßnahmen

- Eyebrow Text überarbeiten, z. B. „Google Business Profil Optimierung für Unternehmen in Österreich“
- Nutzenversprechen konkreter formulieren
- Trust-Sektion ohne erfundene Rezensionen oder Fake-Zahlen einbauen
- Arbeitsweise transparenter darstellen
- interne Links zu künftigen Leistungsseiten vorbereiten
- bestehende Statistik-Claims prüfen und nur verwenden, wenn belastbare Quellen angegeben werden

### Warum wichtig

Die Startseite ist aktuell indexiert, aber thematisch noch zu breit und teilweise zu weich formuliert. Für SEO und GEO muss Google bzw. eine KI schnell erkennen können, wofür LokalOptimal die passende Quelle ist.

## Priorität 2: Erste SEO-/GEO-Landingpages aufbauen

Die Website braucht mehr indexierbare Seiten mit klarer Suchintention.

### Erste Seiten

1. `/google-business-profil-optimierung/`
2. `/google-unternehmensprofil-betreuung/`
3. `/local-seo-oesterreich/`
4. `/google-business-profil-kosten/`
5. `/google-business-profil-checkliste/`

### Danach sinnvolle Branchenseiten

- `/branchen/handwerker/`
- `/branchen/kosmetik/`
- `/branchen/gastronomie/`
- `/branchen/aerzte/`
- `/branchen/dienstleister/`

### Aufbau pro Seite

Jede Seite sollte nach einem klaren Muster aufgebaut sein:

- direkte Antwort auf die Hauptfrage im ersten Abschnitt
- verständliche Definition
- konkrete Probleme der Zielgruppe
- LokalOptimal-Methode
- Checkliste oder Tabelle
- häufige Fehler
- FAQ-Bereich
- klare Handlungsaufforderung
- strukturierte Daten

## Priorität 3: GEO-taugliche Inhalte erstellen

GEO bedeutet: Inhalte so aufbauen, dass KI-Suchsysteme sie leicht verstehen, extrahieren und zitieren können.

### Maßnahmen

- Antwort-first-Struktur verwenden
- kurze, präzise Absätze schreiben
- Tabellen und Checklisten einbauen
- Fachbegriffe sauber erklären
- Quellen für fachliche Aussagen ergänzen
- FAQ-Blöcke mit klaren Fragen und Antworten einbauen
- keine Keyword-Stuffing-Texte schreiben

### Beispiel für gute GEO-Fragen

- Was ist Google Business Profil Optimierung?
- Welche Faktoren beeinflussen lokale Sichtbarkeit bei Google?
- Wie lange dauert Google Business Profil Optimierung?
- Was kostet die Betreuung eines Google Unternehmensprofils?
- Für welche Branchen lohnt sich Local SEO besonders?
- Kann man ein Google Unternehmensprofil selbst optimieren?

## Priorität 4: Vertrauenssignale ohne Rezensionen aufbauen

Da es noch keine Kundenstimmen gibt, sollten andere legitime Vertrauenssignale sichtbar werden.

### Mögliche Signale

- klare Über-uns-Seite
- Autorenbox für Georg mit Fachgebiet und Standort
- transparente Methode
- eigene Audit-Checkliste
- Beispiel-Audit auf Basis eines Demo-Profils
- „Was wir prüfen“-Sektion
- „Was wir nicht versprechen“-Sektion
- Kontaktinformationen konsistent darstellen
- Google Business Profile vollständig pflegen

### Nicht machen

- keine erfundenen Bewertungen
- keine erfundenen Case Studies
- keine AggregateRating-Schema-Daten ohne echte Bewertungen
- keine garantierten Ranking-Versprechen

## Priorität 5: Strukturierte Daten erweitern

Die vorhandenen JSON-LD-Daten sind ein guter Anfang. Sie sollten pro Seitentyp erweitert und sauber gehalten werden.

### Sinnvolle Schema-Typen

- `Organization`
- `LocalBusiness` oder passender Dienstleister-Typ
- `Person`
- `Service`
- `WebSite`
- `WebPage`
- `FAQPage`
- `BreadcrumbList`

### Wichtig

Strukturierte Daten müssen zum sichtbaren Inhalt der Seite passen. Keine Reviews, Ratings oder Leistungsversprechen auszeichnen, wenn sie nicht real und sichtbar vorhanden sind.

## Priorität 6: robots.txt und AI-Crawler prüfen

Die aktuelle `robots.txt` erlaubt Crawling grundsätzlich. Für GEO kann sie expliziter formuliert werden.

### Sinnvolle Ergänzungen

```txt
User-agent: *
Allow: /
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

Sitemap: https://www.lokaloptimal.at/sitemap.xml
```

### Hinweis

Für Google AI Overviews gibt es keine spezielle AI-Datei und kein spezielles AI-Schema. Entscheidend bleibt: indexierbare Seiten, gute Inhalte, interne Links, strukturierte Daten und sichtbarer Nutzen.

## Priorität 7: Sitemap automatisieren

Die Sitemap ist aktuell vorhanden, aber manuell und klein. Sobald neue Seiten entstehen, sollte sie automatisch gepflegt werden.

### Maßnahmen

- Astro `site`-Konfiguration setzen
- Sitemap-Integration einbauen
- neue Landingpages automatisch aufnehmen
- `lastmod` aktuell halten
- Sitemap in Google Search Console erneut einreichen

## Priorität 8: Bing und weitere Discovery-Kanäle einrichten

Für GEO ist nicht nur Google relevant. KI-Systeme und Suchassistenten greifen je nach Anbieter auch auf andere Suchindizes und Signale zurück.

### Maßnahmen

- Bing Webmaster Tools einrichten
- Sitemap bei Bing einreichen
- Google Business Profile vollständig optimieren
- konsistente NAP-Daten verwenden: Name, Adresse, Telefonnummer
- relevante Branchenverzeichnisse prüfen
- LinkedIn-Unternehmensseite bzw. Personenprofil konsistent pflegen

## Priorität 9: Content-Roadmap für die ersten 8 Wochen

### Woche 1

- Startseite SEO-seitig schärfen
- `robots.txt` erweitern
- Sitemap-Automatisierung vorbereiten
- strukturierte Daten bereinigen und erweitern

### Woche 2

- Seite `/google-business-profil-optimierung/` erstellen
- FAQPage- und Service-Schema ergänzen
- interne Links von der Startseite setzen

### Woche 3

- Seite `/google-unternehmensprofil-betreuung/` erstellen
- Prozess und Leistungsumfang erklären
- klare CTA-Struktur ergänzen

### Woche 4

- Seite `/local-seo-oesterreich/` erstellen
- lokale Rankingfaktoren und Österreich-Bezug herausarbeiten

### Woche 5

- Seite `/google-business-profil-kosten/` erstellen
- transparente Preislogik erklären, auch wenn keine fixen Pakete dargestellt werden

### Woche 6

- Seite `/google-business-profil-checkliste/` erstellen
- als zitierfähige Ressource und Lead-Magnet nutzbar machen

### Woche 7

- erste Branchenseite erstellen, z. B. Handwerker oder Therapeuten
- branchenspezifische Probleme, Suchintentionen und Profilfelder erklären

### Woche 8

- Search Console und Bing Webmaster Tools auswerten
- Seiten mit Impressionen identifizieren
- Titel, Meta-Descriptions und interne Links nachschärfen

## Erfolgsmessung

### In Google Search Console prüfen

- indexierte Seiten
- Impressionen
- Klicks
- durchschnittliche Position
- Suchanfragen mit Markenbezug
- Suchanfragen mit Themenbezug
- Seiten mit vielen Impressionen, aber niedriger CTR

### In Bing Webmaster Tools prüfen

- Indexierungsstatus
- Sitemap-Status
- Crawl-Fehler
- Suchanfragen

### GEO-Indikatoren manuell prüfen

Regelmäßig testen, ob LokalOptimal bei Fragen genannt oder zitiert wird, z. B. in:

- ChatGPT Search
- Perplexity
- Gemini
- Copilot

Beispielfragen:

- „Wer hilft in Österreich bei Google Business Profil Optimierung?“
- „Wie optimiere ich mein Google Unternehmensprofil für lokale Sichtbarkeit?“
- „Welche Agenturen bieten Local SEO für kleine Unternehmen in Österreich an?“

## Kurzfazit

Die wichtigste Aufgabe ist jetzt nicht, technische Kleinigkeiten zu optimieren, sondern thematische Autorität aufzubauen.

Ohne Rezensionen funktioniert das über:

- klare Leistungsseiten
- ehrliche Expertise
- transparente Methode
- starke FAQs
- strukturierte Daten
- interne Verlinkung
- konsistente Unternehmenssignale
- regelmäßige Messung in Search Console und Bing Webmaster Tools

Der beste nächste Umsetzungsschritt ist die Landingpage `/google-business-profil-optimierung/`.
