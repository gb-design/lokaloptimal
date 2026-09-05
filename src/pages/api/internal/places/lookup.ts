import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";
import { getPlaceDetails, queryFromSubmittedUrl, searchPlace } from "../../../../../api/places";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const headers = { "Cache-Control": "private, no-store" };
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "Bitte senden Sie die Anfrage als JSON." }, { status: 415, headers });
  }

  const payload = await request.json().catch(() => null);
  const url = typeof payload?.url === "string" ? payload.url.trim() : "";
  if (!url) return Response.json({ error: "Bitte geben Sie einen Google-Maps-Link ein." }, { status: 400, headers });

  const apiKey = getSecret("GOOGLE_PLACES_API_KEY")?.trim();
  if (!apiKey) {
    return Response.json({ error: "Der Google Places API-Schlüssel ist noch nicht konfiguriert." }, { status: 503, headers });
  }

  try {
    const parsed = await queryFromSubmittedUrl(url);
    const found = await searchPlace(apiKey, parsed.name, parsed.lat, parsed.lng);
    const details = await getPlaceDetails(apiKey, found.place_id);
    return Response.json({ found, details }, { headers });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 502;
    const messages: Record<number, string> = {
      400: "Der Google-Maps-Link konnte nicht gelesen werden. Verwenden Sie den Teilen-Link des Unternehmensprofils.",
      422: "Der Google-Maps-Link konnte nicht gelesen werden. Verwenden Sie den Teilen-Link des Unternehmensprofils.",
      404: "Google führt dieses Profil nicht in seiner Datenschnittstelle. Das betrifft sehr junge Profile und Betriebe ohne öffentliche Adresse — die Daten müssen hier manuell erfasst werden.",
    };
    return Response.json(
      { error: messages[status] || "Google Places war nicht erreichbar. Bitte versuchen Sie es später erneut." },
      { status, headers },
    );
  }
};
