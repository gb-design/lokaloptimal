# GBP Audit Widget — Setup

## Was du brauchst

- Google Cloud Account (kostenlos)
- Vercel Account (kostenlos, Free Tier reicht)
- Cal.com Account (kostenlos)

---

## Schritt 1 — Google Places API Key holen

1. Google Cloud Console öffnen: https://console.cloud.google.com
2. Neues Projekt anlegen (oder bestehendes nutzen)
3. Unter **APIs & Services → Library** nach "Places API (New)" suchen → aktivieren
4. Unter **APIs & Services → Credentials → Create Credentials → API Key**
5. Den Key unter **Key restrictions** einschränken:
   - Application restrictions: **HTTP referrers**
   - Website: deine Vercel-Domain (z.B. `https://deine-domain.at/*`)
   - API restrictions: **Places API (New)** only
6. Billing aktivieren (Kreditkarte hinterlegen — aber du bleibst im Free Tier bis 10.000 Requests/Monat)

> **Kostenkontrolle:** Unter Billing → Budgets & Alerts ein Budget von €0 setzen
> mit Alert bei 100% → du kriegst eine E-Mail bevor irgendwas kostet.

---

## Schritt 2 — Proxy deployen (Vercel)

**Option A — Selbes Vercel-Projekt wie deine Landingpage (empfohlen):**

Datei `api/places.js` in dein Landingpage-Repository legen.
Vercel deployed sie automatisch als Serverless Function unter `/api/places`.

**Option B — Eigenes Vercel-Projekt für den Proxy:**

```bash
# Vercel CLI installieren
npm i -g vercel

# Ins api-Verzeichnis navigieren und deployen
cd api
vercel
```

**Environment Variable setzen:**

Im Vercel Dashboard unter **Settings → Environment Variables**:

```
GOOGLE_PLACES_API_KEY = AIza...dein-key...
ALLOWED_ORIGIN        = https://deine-domain.at   (optional, empfohlen)
```

---

## Schritt 3 — Widget konfigurieren

In `GBPAuditWidget.jsx`, Zeile ~16:

```js
const CONFIG = {
  PROXY_URL: "/api/places",                           // ← Pfad zur Serverless Function
  CAL_URL:   "https://cal.com/DEIN-USERNAME/gbp-audit", // ← dein Cal.com Link
  GA_SCAN:   "gbp_audit_scan",
  GA_CTA:    "gbp_audit_cta_click",
};
```

Wenn Proxy auf separater Domain:
```js
PROXY_URL: "https://deine-api.vercel.app/api/places",
```

---

## Schritt 4 — Widget einbinden

```jsx
import GBPAuditWidget from "./GBPAuditWidget";

// In deiner Landingpage-Komponente:
<section>
  <h2>Mach den kostenlosen GBP-Check</h2>
  <GBPAuditWidget />
</section>
```

---

## Schritt 5 — GA4 Events tracken (optional)

Das Widget feuert zwei Events automatisch wenn `window.gtag` verfügbar ist:

| Event | Wann | Parameter |
|---|---|---|
| `gbp_audit_scan` | Beim Klick auf "Profil prüfen" | `business_name`, `method` |
| `gbp_audit_cta_click` | Beim Klick auf "Termin vereinbaren" | `score`, `zone` |

Sicherstellen dass dein GA4-Tag vor dem Widget lädt.

---

## Was echte Daten liefert vs. was nicht

| Kategorie | Datenquelle | Echte Daten? |
|---|---|---|
| Profilvoilständigkeit | Google Places API | ✅ Tel., Website, Öffnungszeiten, Beschreibung |
| Bewertungen & Antworten | Google Places API (Rating + Count) | ⚠️ Teilweise — Antwortrate nicht verfügbar |
| Fotos & Aktualität | Google Places API (Foto-Count) | ✅ Echte Anzahl |
| Aktivität & Beiträge | Self-Assessment (User-Eingabe) | ✅ Ehrliche Selbstauskunft |
| Kontakt & Conversion | Google Places API | ✅ Website, Tel., Öffnungszeiten |

---

## Free Tier Limits

Google Places API (New) ab März 2025:
- **10.000 Requests/Monat gratis** bevor Billing greift
- Jeder Scan = 2 Requests (1× Text Search + 1× Place Details)
- → **5.000 Scans/Monat gratis**

Für eine Landingpage mit normalem Traffic ist das mehr als ausreichend.
Wenn du skalierst: Place Details Essentials kostet ~$0.005 pro Request.
