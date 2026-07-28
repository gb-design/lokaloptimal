# LokalOptimal Website und internes Dashboard

Astro-Codebase für die öffentliche LokalOptimal-Landingpage und einen geschützten internen Arbeitsbereich für Leads, Audits, Angebote und Kundenprojekte.

## Stack

- Astro 7 für statische öffentliche Seiten und on-demand gerenderte Dashboard-Routen
- React 19 für interaktive Widgets und Dashboard-Formulare
- Tailwind CSS 4 plus eigenes CSS-Token-System
- Offizieller Vercel-Adapter für `/dashboard/**` und interne API-Routen
- Supabase Auth, Postgres, RLS und privater PDF-Speicher
- `@react-pdf/renderer` für reproduzierbare Angebots-PDFs
- Native Vercel Functions in `api/` für die bestehenden öffentlichen Endpunkte

## Entwicklung

```bash
npm install
npm run dev
npm run build
npm test
```

Die Landingpage laeuft lokal unter `http://127.0.0.1:4321/`.
Das Dashboard ist unter `http://127.0.0.1:4321/dashboard` erreichbar.

Die API-Endpunkte liegen bewusst als native Vercel Functions im Root-Ordner `api/`. Fuer lokale API-Tests deshalb `vercel dev` verwenden.

## Dashboard einrichten

1. Ein Supabase-Projekt anlegen.
2. Die Migration `supabase/migrations/202607280001_dashboard_mvp.sql` über die Supabase CLI oder den SQL Editor ausführen.
3. In Supabase Auth die öffentliche Registrierung deaktivieren und den internen Benutzer manuell anlegen.
4. `.env.example` nach `.env` kopieren und `PUBLIC_SUPABASE_URL` sowie `PUBLIC_SUPABASE_PUBLISHABLE_KEY` eintragen.
5. Für den Google-Lookup zusätzlich `GOOGLE_PLACES_API_KEY` setzen.
6. Nach dem ersten Login unter `/dashboard/settings` die vollständigen Absenderdaten eintragen. Erst danach können Angebots-PDFs erzeugt werden.

Die Datenbank setzt Row Level Security auf allen Dashboard-Tabellen durch. Angebots-PDFs liegen im privaten Storage-Bucket `offers` unter dem Pfad des angemeldeten Benutzers. Kundenpasswörter und sonstige Zugangsdaten gehören nicht in Notizfelder.

Für lokale Datenbanktests mit Supabase CLI:

```bash
supabase test db
```

## Environment Variables

```bash
GOOGLE_PLACES_API_KEY=...
GBP_AUDIT_DAILY_LIMIT=3
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
ALLOWED_ORIGIN=https://deine-domain.at
RESEND_API_KEY=...
CONTACT_TO_EMAIL=...
CONTACT_FROM_EMAIL=LokalOptimal <kontakt@deine-domain.at>
PUBLIC_CAL_URL=https://cal.com/dein-name/gbp-audit
```

## Kostenarme Defaults

- Hosting: Vercel Free/Hobby
- Booking: Cal.com Free
- Kontakt: Resend Free
- GBP-Check: Google Places API mit eingeschraenktem API-Key, Field Masks und Budget Alerts
- GBP-Check Tageslimit: `GBP_AUDIT_DAILY_LIMIT` steuert die Scans pro Nutzer und 24 Stunden, Fallback ist `3`

## Rechtliches

`/impressum`, `/datenschutz` und `/agb` sind als Seiten angelegt, enthalten aber Platzhaltertexte. Vor Livegang muessen Unternehmensdaten und Rechtstexte final geprueft werden.

Vor dem produktiven Einsatz sollte ausserdem ein DSGVO-konformer Cookie Consent Banner integriert werden, falls Tracking, Analytics, Marketing-Pixel, eingebettete Drittanbieter-Inhalte oder andere nicht technisch notwendige Cookies/Skripte genutzt werden. Eine moegliche Loesung ist CookieYes: https://www.cookieyes.com/de/
