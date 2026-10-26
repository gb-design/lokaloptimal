# Sicherheitsbericht: LokalOptimal Landingpage und Dashboard

Stand: 28. Juli 2026
Prüfmodus: Read-only; am Anwendungs-, Konfigurations- und Datenbankcode wurden keine Änderungen vorgenommen.

## Executive Summary

Geprüft wurden die öffentliche Astro-Landingpage, die nativen Vercel-Endpunkte, das geschützte Dashboard, Astro Actions, Supabase Auth/Postgres/RLS/Storage, die Angebots-PDF-Erzeugung, Abhängigkeiten, Build-Artefakte und die produktiv ausgelieferten HTTP-Header.

Es wurden **keine kritischen**, aber **2 hohe**, **5 mittlere** und **3 niedrige** Sicherheitsbefunde festgestellt. Die dringendsten Themen sind:

1. Das interne Dashboard erzwingt keine Mehrfaktor-Authentifizierung beziehungsweise kein `aal2`.
2. Das Rate-Limit der öffentlich erreichbaren Google-Places-Funktion ist durch wechselnde User-Agents umgehbar und fällt bei KV-Problemen vollständig offen aus.

Positiv: Es wurden keine eingecheckten oder im Client-Bundle ausgelieferten Secrets gefunden, der aktuelle npm-Audit ist sauber, Supabase-Registrierung ist im verbundenen Produktionsprojekt deaktiviert, Dashboard-Routen sind authentifiziert und nicht cachebar, RLS ist auf allen Dashboard-Tabellen aktiv und der PDF-Bucket ist privat.

## Umfang und Methode

- Vollständige statische Prüfung der sicherheitsrelevanten TypeScript-, JavaScript-, Astro-, SQL- und Deployment-Konfiguration
- Mustersuche nach XSS-Sinks, dynamischer Codeausführung, unsicheren URLs, Token-Speicherung, `postMessage`, Uploads, Service Workern, offenen CORS-Regeln und Secret-Mustern
- Prüfung des Git-Verlaufs auf typische Secret-Formate, ohne Secret-Werte auszugeben
- Build- und Client-Bundle-Prüfung auf private Environment-Werte und öffentliche Source Maps
- `npm audit` für Produktions- sowie Entwicklungsabhängigkeiten
- Produktive Header- und CORS-Prüfung von `https://www.lokaloptimal.at`
- Read-only-Abfrage der öffentlich sichtbaren Supabase-Auth-Einstellungen
- Kontrollierter, rein lokaler Nachweis des Redirect-Verhaltens der URL-Auflösung mit gemocktem `fetch`

## Kritisch

Keine bestätigten kritischen Schwachstellen.

## Hoch

### SEC-001: Dashboard erzwingt keine Mehrfaktor-Authentifizierung

- **Rule ID:** AUTH-MFA-001
- **Severity:** High
- **Location:** `src/components/dashboard/LoginForm.tsx:15-24`; `src/middleware.ts:39-54`; `supabase/migrations/202607280001_dashboard_mvp.sql:210-304`; `supabase/config.toml:296-309`
- **Evidence:** Der einzige Loginfluss ist E-Mail plus Passwort. Middleware und RLS prüfen einen gültigen Benutzer beziehungsweise `auth.uid()`, aber weder den Authenticator Assurance Level `aal2` noch einen zweiten Faktor. Die lokale TOTP-Konfiguration ist deaktiviert.
- **Impact:** Ein kompromittiertes oder wiederverwendetes Passwort reicht für Vollzugriff auf Leads, Kontaktdaten, Audits, Angebote, PDFs und Projekte.
- **Fix:** TOTP oder Passkeys aktivieren; Enrollment-, Challenge- und Recovery-Flows ergänzen; nach dem Passwortlogin `aal2` erzwingen; besonders sensible RLS-Policies zusätzlich auf `auth.jwt()->>'aal' = 'aal2'` beschränken.
- **Mitigation:** Bis zur Umsetzung ein langes, ausschließlich hier verwendetes Passwort aus einem Passwortmanager nutzen, Login-Alarme aktivieren und Auth-Logs überwachen.
- **False positive notes:** Die öffentlich abrufbaren Projekteinstellungen zeigen keine MFA-Details. Selbst wenn MFA im Supabase-Dashboard grundsätzlich aktiviert wäre, erzwingt der vorliegende Anwendungscode kein `aal2`.

### SEC-002: Öffentliches Places-Rate-Limit ist trivial umgehbar und fällt offen aus

- **Rule ID:** API-ABUSE-001
- **Severity:** High
- **Location:** `api/places.ts:178-183`; `api/places.ts:206-230`; `api/places.ts:311-334`
- **Evidence:** Der Rate-Limit-Schlüssel ist der Hash aus IP-Adresse **und User-Agent**. Ein Angreifer kann durch Änderung des User-Agent für jede Anfrage einen neuen Tageszähler erhalten. Bei fehlendem oder gestörtem KV erlaubt `guardGoogleCalls()` sämtliche Anfragen ausdrücklich weiter.
- **Impact:** Unauthentifizierte Angreifer können Google-Places-Kontingent und Budget verbrauchen oder die Funktion für legitime Besucher unbrauchbar machen.
- **Fix:** Einen stabilen, vom vertrauenswürdigen Edge gelieferten Client-Schlüssel verwenden; User-Agent nicht als frei rotierbaren Schlüsselbestandteil einsetzen; für kostenpflichtige Upstream-Aufrufe fail-closed oder mit einem kleinen lokalen Notfallbudget arbeiten; zusätzlich Edge-Rate-Limit, Bot-Challenge und harte Google-Cloud-Quoten einsetzen.
- **Mitigation:** Google-API-Key strikt auf die benötigten Places-APIs begrenzen, niedrige Tagesquoten und Budgetalarme setzen und ungewöhnliche Anfrage-/Fehlerraten alarmieren.
- **False positive notes:** CORS ist produktiv korrekt eingeschränkt, schützt aber nicht vor direkten HTTP-Clients und ersetzt kein belastbares Rate-Limit.

## Mittel

### SEC-003: Redirect-Auflösung ermöglicht Blind-SSRF auf nicht validierte Zwischenziele

- **Rule ID:** API-SSRF-001
- **Severity:** Medium
- **Location:** `api/places.ts:118-147`; ebenfalls in der Kopie `tool/places.js:59-86`
- **Evidence:** Der erste URL-Host wird allowgelistet. Nach einem Redirect wird das neue Ziel jedoch erst auf ein Google-Maps-Endziel geprüft und im nächsten Schleifendurchlauf ungeprüft abgerufen. Ein lokaler Mock-Nachweis ergab zwei Aufrufe: zuerst `https://maps.app.goo.gl/...`, danach ein simuliertes `http://169.254.169.254/...`.
- **Impact:** Wenn ein erlaubter Kurzlink auf ein attacker-kontrolliertes oder internes Ziel umgeleitet werden kann, führt der Server bis zu vier weitere blinde GET-Anfragen aus. Das kann interne Dienste oder Cloud-Metadatenendpunkte erreichen.
- **Fix:** Vor **jedem** Fetch das nächste Ziel erneut prüfen; nur `https` und eine exakte Host-Allowlist zulassen; private, Loopback-, Link-Local- und reservierte IP-Bereiche nach DNS-Auflösung blockieren; Redirect-Ketten möglichst auf das tatsächlich benötigte Muster reduzieren.
- **Mitigation:** Egress-Regeln auf Plattformebene verwenden und Anfragen an Metadaten-/private Netze blockieren.
- **False positive notes:** Die praktische Ausnutzbarkeit hängt davon ab, ob ein gültiger erlaubter Google-Kurzlink auf ein frei wählbares Ziel gelenkt werden kann. Der Codepfad selbst ruft ein solches Ziel nach einem Redirect nachweislich ungeprüft ab.

### SEC-004: Angebots-PDF-Erzeugung verändert Zustand über GET

- **Rule ID:** CSRF-STATE-001
- **Severity:** Medium
- **Location:** `src/pages/api/internal/offers/[id]/pdf.ts:15-16`; `src/pages/api/internal/offers/[id]/pdf.ts:100-125`
- **Evidence:** Der `GET`-Handler rendert ein PDF, lädt es in Storage hoch, erhöht die Revision und aktualisiert Angebotsstatus und Snapshot.
- **Impact:** Ein angemeldeter Benutzer kann durch einen fremden Link, eine Top-Level-Navigation oder Browser-Prefetch unbeabsichtigt eine neue Revision erzeugen und den Angebotszustand ändern. Astro behandelt GET als sichere Methode und führt dafür keinen Origin-CSRF-Check aus.
- **Fix:** Generierung als `POST`-Action mit Origin-/CSRF-Schutz implementieren. Ein separater, zustandsloser `GET` darf nur ein bereits vorhandenes PDF herunterladen.
- **Mitigation:** Bis zur Umstellung den Endpoint zusätzlich anhand `Origin`/`Sec-Fetch-Site` und bewusster Benutzerinteraktion absichern.
- **False positive notes:** Authentifizierung und RLS verhindern fremden Datenzugriff, verhindern aber nicht, dass ein fremder Ursprung den Browser des bereits angemeldeten Benutzers zu diesem GET veranlasst.

### SEC-005: Keine Content Security Policy und privilegierte Drittanbieter-Skripte auf der Landingpage

- **Rule ID:** CSP-SUPPLY-001
- **Severity:** Medium
- **Location:** `src/layouts/BaseLayout.astro:46-63`; `vercel.json:1-45`
- **Evidence:** Google Tag Manager/gtag und CookieYes werden als veränderliche Drittanbieter-Skripte mit vollen Origin-Rechten geladen. Weder Anwendung noch produktive HTTP-Antwort liefern eine `Content-Security-Policy`.
- **Impact:** Eine Kompromittierung der Drittanbieter-Lieferkette kann Landingpage-DOM, Formulareingaben und Browser-Speicher lesen oder verändern. Ohne CSP fehlt eine wichtige zweite Schutzschicht gegen Script-Injection.
- **Fix:** Für Dashboard und Landingpage getrennte, enge CSPs einführen. Dashboard möglichst `default-src 'self'`; Landingpage nur die tatsächlich benötigten Google-, CookieYes-, Font- und Cal.com-Quellen erlauben. Inline-Skripte über Astro-CSP/Hashes oder Nonces absichern. Stabile Fremdressourcen selbst hosten oder mit SRI pinnen, wo technisch möglich.
- **Mitigation:** Drittanbieter minimieren, Änderungen kontrollieren und CSP zunächst als Report-Only beobachten, anschließend erzwingen.
- **False positive notes:** Es wurde keine aktuelle XSS-Datenflusskette gefunden. CSP ist hier Defense-in-Depth und Supply-Chain-Begrenzung; manche dynamischen Anbieterdateien eignen sich nicht für SRI.

### SEC-006: RLS schützt Zeilen, aber nicht alle mandantenübergreifenden Beziehungen

- **Rule ID:** SUPABASE-RLS-REL-001
- **Severity:** Medium
- **Location:** `supabase/migrations/202607280001_dashboard_mvp.sql:252-260`; `supabase/migrations/202607280001_dashboard_mvp.sql:276-286`
- **Evidence:** Die Offer-Policy prüft Eigentümer und Lead, aber nicht, ob `audit_id` demselben Eigentümer gehört. Die Project-Policy prüft Eigentümer und angenommenes `offer_id`, aber nicht die Eigentümerschaft von `lead_id` und `audit_id`.
- **Impact:** Ein authentifizierter Benutzer kann bei erratenen, fortlaufenden IDs Fremdbeziehungen als Existenz-Orakel verwenden und inkonsistente Cross-Tenant-Referenzen erzeugen. Das kann Datenintegrität und spätere Lösch-/Wartungsabläufe beeinträchtigen.
- **Fix:** In `WITH CHECK` für jede Fremdbeziehung die Eigentümerschaft verifizieren oder die Konsistenz durch zusammengesetzte Schlüssel/Constraints beziehungsweise einen sicheren Trigger erzwingen.
- **Mitigation:** Solange nur ein einziger interner Benutzer existiert, ist die unmittelbare Ausnutzbarkeit reduziert. Vor dem Anlegen weiterer Benutzer muss dies behoben sein.
- **False positive notes:** RLS verhindert weiterhin das direkte Lesen fremder Zeilen. Der Befund betrifft referenzielle Mandantentrennung und Existenz-Orakel, nicht einen bestätigten direkten Datenabfluss.

### SEC-007: Kontaktformular nutzt nur instanzlokales, leicht umgehbares Abuse-Limit

- **Rule ID:** API-ABUSE-002
- **Severity:** Medium
- **Location:** `api/contact.ts:9-23`; `api/contact.ts:153-156`
- **Evidence:** Das Limit liegt in einer pro Serverless-Instanz geführten `Map`. Neue Instanzen, Neustarts oder viele Quell-IPs umgehen den Schutz; abgelaufene fremde Einträge werden nicht global bereinigt.
- **Impact:** Angreifer können E-Mail-Versand, Resend-Kontingent und Absenderreputation missbrauchen oder legitime Anfragen verdrängen.
- **Fix:** Verteiltes Rate-Limiting am Edge/KV, Bot-Challenge (z. B. Turnstile), serverseitige Challenge-Verifikation, Größenlimit und Monitoring verwenden.
- **Mitigation:** Resend-Quoten und Alarme eng setzen; Honeypot beibehalten; wiederkehrende Ziele/Inhalte zusätzlich drosseln.
- **False positive notes:** Der bestehende Honeypot und die Eingabegrenzen reduzieren triviale Bots, sind aber kein belastbarer Missbrauchsschutz.

## Niedrig

### SEC-008: Unsichere Legacy-Kopie bleibt als deploybares Beispiel im Repository

- **Rule ID:** SUPPLY-STALE-001
- **Severity:** Low
- **Location:** `tool/places.js:1-208`; `tool/GBP_WIDGET_SETUP.md:45-72`
- **Evidence:** Die Anleitung beschreibt die Datei als kopierbare Vercel-Funktion. Diese Kopie verwendet standardmäßig `Access-Control-Allow-Origin: *`, besitzt kein persistentes Rate-Limit, keine Fetch-Timeouts und keine `place_id`-Validierung.
- **Impact:** Bei späterer Wiederverwendung werden bereits behobene Schwächen erneut produktiv eingeführt.
- **Fix:** Legacy-Datei entfernen oder automatisiert aus der aktuellen Implementierung erzeugen und denselben Sicherheitstests unterwerfen.
- **Mitigation:** Datei deutlich als nicht produktionsfähig markieren.
- **False positive notes:** Im aktuellen Vercel-Projekt wird `api/places.ts` deployt; `tool/places.js` ist derzeit keine aktive Route.

### SEC-009: Security-Tests decken RLS und Storage nur teilweise ab

- **Rule ID:** TEST-RLS-001
- **Severity:** Low
- **Location:** `supabase/tests/dashboard_rls.sql:1-48`
- **Evidence:** Die fünf Tests prüfen nur Lesen von Leads und Workspace Settings. Negative Inserts/Updates, alle Kindtabellen, Cross-Tenant-Fremdschlüssel und Storage-Pfade sind ungetestet.
- **Impact:** Fehler in RLS-Policies oder späteren Migrationen können unbemerkt bleiben.
- **Fix:** Für jede Tabelle mindestens Owner-Read/Write, Fremd-Read/Write-Deny und Owner-ID-Mutation testen; Storage Select/Insert/Update/Delete sowie Cross-Tenant-Beziehungen ergänzen.
- **Mitigation:** Migrationen vor Produktion manuell mit zwei getrennten Testbenutzern prüfen.
- **False positive notes:** Die vorhandenen Tests konnten in dieser Umgebung nicht ausgeführt werden, weil keine erreichbare lokale Testdatenbank vorhanden war. Die SQL-Datei wurde vollständig statisch geprüft.

### SEC-010: Keine sichtbare Security-Automation in CI

- **Rule ID:** SUPPLY-CI-001
- **Severity:** Low
- **Location:** Repository-Root; keine `.github/workflows`- oder vergleichbare CI-Konfiguration vorhanden
- **Evidence:** Lockfile und Tests sind vorhanden, aber kein versionierter Ablauf für `npm ci`, `npm audit`, Secret-Scanning, SAST oder regelmäßige Dependency-Updates.
- **Impact:** Neue bekannte Schwachstellen oder versehentlich eingecheckte Secrets werden möglicherweise erst spät erkannt.
- **Fix:** CI mit reproduzierbarem `npm ci`, Build/Test, Dependency-Audit, Secret-Scanner und CodeQL/SAST ergänzen; Dependabot oder Renovate aktivieren.
- **Mitigation:** Bis dahin vor jedem Release dieselben Prüfungen manuell ausführen.
- **False positive notes:** Externe, nicht im Repository sichtbare Vercel-/GitHub-Organisationseinstellungen könnten Teile davon bereits abdecken.

## Verifizierte Schutzmaßnahmen

- `npm audit` am 28.07.2026: **0** bekannte Schwachstellen in Produktions- und Entwicklungsabhängigkeiten
- `npm run build`: erfolgreich
- `npm test`: **23/23** Tests erfolgreich
- Keine typischen Secrets im aktuellen Arbeitsbaum oder Git-Verlauf gefunden
- `GOOGLE_PLACES_API_KEY`, `KV_REST_API_TOKEN` und `RESEND_API_KEY` nicht im generierten Client-Bundle gefunden
- Keine öffentlichen Source Maps im generierten Client-Bundle
- Keine bestätigte Datenflusskette zu `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `document.write`, unsicherem `postMessage` oder dynamischer Script-Injection
- Supabase-Authentifizierung wird serverseitig mit `getUser()` validiert
- RLS ist auf allen Dashboard-Tabellen aktiv
- Offer-PDF-Bucket ist privat und Storage-Policies begrenzen Pfade auf die Benutzer-ID
- Produktiv: HSTS, `nosniff`, `X-Frame-Options`, Referrer- und Permissions-Policy aktiv
- Produktiv: Dashboard/Login mit `private, no-store`, `noindex`, `no-referrer` und `Cross-Origin-Resource-Policy: same-origin`
- Produktiv: Fremder Origin am Places-Endpunkt wird mit HTTP 403 abgewiesen
- Verbundenes Supabase-Projekt: öffentliche Registrierung deaktiviert; E-Mail-Autoconfirm deaktiviert

## Grenzen der Prüfung

- Es wurden bewusst keine Produktivdaten verändert, keine Benutzer angelegt und keine Login-Zugangsdaten angefordert.
- Ohne authentifizierte Testsitzung konnten autorisierte Dashboard-Flows, echte Session-Cookie-Attribute und produktive RLS-Policies nicht dynamisch gegen zwei Benutzer geprüft werden.
- Passwortregeln, MFA-Status, Session-Timeouts, Google-Cloud-Key-Restriktionen, Vercel-WAF/Firewall, Supabase-Network-Restrictions und externe CI-Einstellungen sind über die öffentlichen Schnittstellen nicht vollständig sichtbar.
- Der lokale Supabase-RLS-Testlauf war mangels erreichbarer Testdatenbank nicht möglich.
- Es erfolgten keine Lasttests, kein invasives Fuzzing und kein automatisierter Exploit-Scan gegen Produktion.

## Empfohlene Reihenfolge

1. **SEC-001** MFA/`aal2` für Dashboard und RLS erzwingen.
2. **SEC-002** öffentliches Places-Limit stabil und fail-closed machen.
3. **SEC-003** Redirect-Ziele vor jedem Fetch validieren.
4. **SEC-004** PDF-Generierung auf geschützten POST umstellen.
5. **SEC-005** route-spezifische CSP einführen.
6. **SEC-006** Cross-Tenant-Fremdbeziehungen in RLS/Constraints schließen.
7. **SEC-007** verteilten Kontaktformular-Abuse-Schutz ergänzen.
8. Anschließend Legacy-Code und Security-Automation bereinigen.

## Referenzbasis

- [Astro Security-Konfiguration (`checkOrigin`, `allowedDomains`, CSP)](https://docs.astro.build/en/reference/configuration-reference/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Multi-Factor Authentication](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
