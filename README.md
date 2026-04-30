# LokalOptimal Landingpage

Schlanke Astro-Codebase fuer eine mobile-first Landingpage mit React-Islands, GSAP Scroll-Motion und nativen Vercel Functions.

## Stack

- Astro 6 fuer statische Seiten
- React 19 nur fuer `GBPAuditWidget` und Kontaktformular
- Tailwind CSS 4 plus eigenes CSS-Token-System
- GSAP 3 fuer wenige hochwertige Scroll-Reveals
- Vercel Functions in `api/`

## Entwicklung

```bash
npm install
npm run dev
npm run build
```

Die Landingpage laeuft lokal unter `http://127.0.0.1:4321/`.

Die API-Endpunkte liegen bewusst als native Vercel Functions im Root-Ordner `api/`. Fuer lokale API-Tests deshalb `vercel dev` verwenden.

## Environment Variables

```bash
GOOGLE_PLACES_API_KEY=...
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

## Rechtliches

`/impressum`, `/datenschutz` und `/agb` sind als Seiten angelegt, enthalten aber Platzhaltertexte. Vor Livegang muessen Unternehmensdaten und Rechtstexte final geprueft werden.
