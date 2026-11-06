/**
 * Prüft den Google-Maps-Link, den Besucher im kostenlosen Check einfügen.
 * Gemeinsam genutzt von GBPAuditWidget und api/places.ts, damit beide dasselbe akzeptieren.
 *
 * Läuft im öffentlichen Bundle: keine Imports aus Supabase, astro:env oder lib/dashboard.
 */

export const MAX_MAPS_LINK_LENGTH = 900;

/** Links auf diesen Hosts tragen Name und Standort selbst, der Server muss sie nicht abrufen. */
const DIRECT_MAPS_HOSTS = new Set([
  "www.google.com",
  "google.com",
  "maps.google.com",
  "www.google.at",
  "google.at",
  "www.google.de",
  "google.de",
  "www.google.ch",
  "google.ch",
]);

/** Kurzlinks aus der Google-Suche. Wohin sie führen, ist nicht belegt, deshalb bleiben sie abgelehnt. */
const SEARCH_SHARE_HOSTS = new Set(["share.google", "g.co"]);

function parseHttps(raw: string) {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

export function isDirectGoogleMapsUrl(raw: string) {
  const parsed = parseHttps(raw);
  return Boolean(parsed && DIRECT_MAPS_HOSTS.has(parsed.hostname) && parsed.pathname.startsWith("/maps/"));
}

export function isAllowedGoogleMapsUrl(raw: string) {
  if (raw.length > MAX_MAPS_LINK_LENGTH) return false;
  if (isDirectGoogleMapsUrl(raw)) return true;

  const parsed = parseHttps(raw);
  if (!parsed) return false;
  if (parsed.hostname === "maps.app.goo.gl") return parsed.pathname.length > 1;
  if (parsed.hostname === "goo.gl") return parsed.pathname.startsWith("/maps/");
  return false;
}

/** Beim Teilen landet manchmal Name oder Adresse mit im Text. Übernommen wird nur die URL. */
export function extractMapsLink(raw: string) {
  const match = raw.match(/https?:\/\/[^\s<>"]+/);
  if (!match) return raw.trim();
  return match[0].replace(/[),.;:!?]+$/, "");
}

export function mapsLinkErrorMessage(raw: string) {
  const parsed = parseHttps(extractMapsLink(raw));
  if (parsed && SEARCH_SHARE_HOSTS.has(parsed.hostname)) {
    return "Dieser Link stammt aus der Google-Suche. Bitte nehmen Sie den Link aus Google Maps.";
  }
  return "Das ist noch kein Link aus Google Maps. Öffnen Sie Ihren Betrieb in Google Maps, wählen Sie „Teilen“ und kopieren Sie den Link.";
}
