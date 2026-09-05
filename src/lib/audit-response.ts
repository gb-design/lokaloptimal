/**
 * Einordnung der Antwort von `/api/places?action=check`.
 *
 * Bewusst getrennt vom Widget: Welcher HTTP-Status welchen Zustand bedeutet,
 * ist die fehleranfälligste Stelle des Checks — ein falsch einsortierter Status
 * zeigt dem Interessenten eine Ausfallmeldung, obwohl mit seinem Profil oder
 * seinem Link etwas ganz anderes ist. Als reine Funktion lässt sich das ohne
 * DOM prüfen.
 */

/** Fehlercodes des Endpunkts, gespiegelt aus `api/places.ts`. */
export const INVALID_GOOGLE_MAPS_URL = "INVALID_GOOGLE_MAPS_URL";
export const PLACE_NOT_FOUND = "PLACE_NOT_FOUND";

export type AuditOutcome =
  /** Profil gefunden, Ergebnis kann angezeigt werden. */
  | { kind: "results"; found: unknown; details: unknown }
  /** Der Link ist kein brauchbarer Google-Maps-Teilen-Link. */
  | { kind: "invalid-url" }
  /** Tageslimit ausgeschöpft. */
  | { kind: "rate-limited" }
  /** Link in Ordnung, aber die Places API führt das Profil nicht. */
  | { kind: "not-found" }
  /** Alles andere: echter Ausfall, Timeout, kaputte Antwort. */
  | { kind: "failed" };

export function classifyAuditResponse(status: number, payload: unknown): AuditOutcome {
  if (!payload || typeof payload !== "object") return { kind: "failed" };

  const body = payload as { error?: unknown; found?: unknown; details?: unknown };
  const error = typeof body.error === "string" ? body.error : "";

  if ((status === 400 || status === 422) && error === INVALID_GOOGLE_MAPS_URL) {
    return { kind: "invalid-url" };
  }

  if (status === 429) return { kind: "rate-limited" };

  // Der Status allein reicht als Signal — auch wenn ein Proxy den Body
  // austauscht, bleibt "404" die Aussage "dieses Profil gibt Google nicht her".
  if (status === 404 || error === PLACE_NOT_FOUND) return { kind: "not-found" };

  if (status < 200 || status > 299) return { kind: "failed" };

  // Ohne `details` gäbe es nichts zu bewerten; das als Erfolg zu zeigen
  // ergäbe eine Auswertung mit lauter Nullwerten.
  if (!body.details) return { kind: "failed" };

  return { kind: "results", found: body.found ?? null, details: body.details };
}
