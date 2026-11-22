// Conversion-Ereignisse für Google Analytics 4.
//
// Diese Datei landet im öffentlichen Bundle: keine Imports aus lib/dashboard/, Supabase oder astro:env.
// Um die Einwilligung muss sie sich nicht kümmern: gtag.js wird erst nach der Analyse-Einwilligung
// geladen (BaseLayout.astro). Ohne Einwilligung landen Aufrufe nur im lokalen dataLayer.
//
// Keine personenbezogenen Daten übergeben: keine Namen, E-Mail-Adressen, Maps-Links oder Firmennamen.

export type TrackEventName =
  | "booking_click" // Klick auf einen Buchungsbutton, Parameter: position
  | "booking_complete" // Termin im Cal-Fenster gebucht, Parameter: position
  | "generate_lead" // Formular abgeschickt, Parameter: form, package
  | "gbp_check_complete"; // Gratis-Check abgeschlossen, Parameter: result, score_band

type TrackParams = Record<string, string>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(name: TrackEventName, params: TrackParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", name, params);
  } catch {
    // Messung darf nie ein Formular oder den Check blockieren.
  }
}

const CAL_ORIGINS = new Set(["https://cal.com", "https://app.cal.com"]);
const CAL_BOOKING_TYPES = new Set(["bookingSuccessful", "bookingSuccessfulV2"]);

/** Erkennt die Nachricht, die das Cal-iframe nach einer erfolgreichen Buchung an die Seite schickt. */
export function isCalBookingMessage(origin: string, data: unknown): boolean {
  if (!CAL_ORIGINS.has(origin)) return false;

  let message = data;
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch {
      return false;
    }
  }

  if (!message || typeof message !== "object") return false;
  const { originator, type } = message as { originator?: unknown; type?: unknown };
  return originator === "CAL" && typeof type === "string" && CAL_BOOKING_TYPES.has(type);
}

/** Grobe Stufe statt exaktem Score, passend zur Ampel im Check. */
export function scoreBand(tone: string): "niedrig" | "mittel" | "hoch" {
  if (tone === "bad") return "niedrig";
  if (tone === "warn") return "mittel";
  return "hoch";
}
