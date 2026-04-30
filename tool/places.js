/**
 * GBP Audit Widget — Vercel Serverless Proxy
 * Versteckt den Google Places API Key server-side.
 *
 * Deploy: Vercel-Projekt, Datei unter /api/places.js ablegen.
 * Env:    GOOGLE_PLACES_API_KEY in Vercel Environment Variables setzen.
 *         Optional: ALLOWED_ORIGIN für CORS einschränken (z.B. https://deine-domain.at)
 */

const PLACES_BASE = "https://places.googleapis.com/v1";
const INVALID_GOOGLE_MAPS_URL = "INVALID_GOOGLE_MAPS_URL";

function isAllowedSubmittedGoogleMapsUrl(raw) {
  try {
    const parsed = new URL(String(raw).trim());
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname === "www.google.com") return parsed.pathname.startsWith("/maps/");
    if (parsed.hostname === "maps.app.goo.gl") return parsed.pathname.length > 1;
    if (parsed.hostname === "goo.gl") return parsed.pathname.startsWith("/maps/");
    return false;
  } catch {
    return false;
  }
}

function isGoogleMapsDestination(raw) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return false;
    return (
      (parsed.hostname === "www.google.com" && parsed.pathname.startsWith("/maps/")) ||
      (parsed.hostname === "google.com" && parsed.pathname.startsWith("/maps/")) ||
      (parsed.hostname === "maps.google.com" && parsed.pathname.startsWith("/maps/")) ||
      (parsed.hostname.endsWith(".google.com") && parsed.pathname.startsWith("/maps/"))
    );
  } catch {
    return false;
  }
}

function decodeMapsValue(value) {
  return decodeURIComponent(value).replace(/\+/g, " ").trim();
}

function parseGoogleMapsUrl(raw) {
  const url = new URL(raw);
  const href = url.toString();
  const placeMatch = href.match(/\/maps\/place\/([^/@?&]+)/);
  const query = url.searchParams.get("q") || url.searchParams.get("query");
  const coordMatch = href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

  let name = "";
  if (placeMatch) name = decodeMapsValue(placeMatch[1]).split("—")[0].trim();
  if (!name && query) name = decodeMapsValue(query);

  return name ? { name, lat: coordMatch?.[1], lng: coordMatch?.[2] } : null;
}

async function resolveGoogleMapsUrl(raw) {
  if (!isAllowedSubmittedGoogleMapsUrl(raw)) {
    const error = new Error(INVALID_GOOGLE_MAPS_URL);
    error.status = 400;
    throw error;
  }

  let current = String(raw).trim();
  const submittedUrl = new URL(current);
  if (submittedUrl.hostname === "www.google.com") return current;

  for (let i = 0; i < 5; i += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "LokalOptimal GBP Audit URL Resolver" },
    });
    const location = response.headers.get("location");
    if (!location) break;

    current = new URL(location, current).toString();
    if (isGoogleMapsDestination(current)) return current;
  }

  const error = new Error(INVALID_GOOGLE_MAPS_URL);
  error.status = 400;
  throw error;
}

async function queryFromSubmittedUrl(raw) {
  const resolvedUrl = await resolveGoogleMapsUrl(raw);
  const parsed = parseGoogleMapsUrl(resolvedUrl);
  if (parsed) return parsed;

  const error = new Error(INVALID_GOOGLE_MAPS_URL);
  error.status = 422;
  throw error;
}

export default async function handler(req, res) {
  // ─── CORS ────────────────────────────────────────────────────────────────
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured on server." });
  }

  const { action } = req.query;

  try {
    // ─── ACTION: search ───────────────────────────────────────────────────
    // Findet eine Place ID aus einer validierten Google-Maps-URL.
    if (action === "search") {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: "Missing url parameter." });
      const parsed = await queryFromSubmittedUrl(url);

      const body = {
        textQuery: parsed.name,
        maxResultCount: 1,
        languageCode: "de",
      };

      if (parsed.lat && parsed.lng) {
        body.locationBias = {
          circle: {
            center: { latitude: parseFloat(parsed.lat), longitude: parseFloat(parsed.lng) },
            radius: 30000,
          },
        };
      }

      const response = await fetch(`${PLACES_BASE}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.places?.length) {
        return res.status(404).json({ error: "No place found for this query." });
      }

      const place = data.places[0];
      return res.status(200).json({
        place_id: place.id,
        name: place.displayName?.text || parsed.name,
        address: place.formattedAddress || null,
      });
    }

    // ─── ACTION: details ──────────────────────────────────────────────────
    // Holt vollständige Profil-Details für Scoring
    if (action === "details") {
      const { place_id } = req.query;
      if (!place_id) return res.status(400).json({ error: "Missing place_id parameter." });

      const response = await fetch(`${PLACES_BASE}/places/${place_id}`, {
        headers: {
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": [
            "displayName",
            "formattedAddress",
            "internationalPhoneNumber",
            "websiteUri",
            "regularOpeningHours",
            "rating",
            "userRatingCount",
            "photos",
            "editorialSummary",
          ].join(","),
        },
      });

      const d = await response.json();

      if (d.error) {
        return res.status(404).json({ error: d.error.message || "Place not found." });
      }

      return res.status(200).json({
        name:             d.displayName?.text || null,
        address:          d.formattedAddress || null,
        phone:            d.internationalPhoneNumber || null,
        website:          d.websiteUri || null,
        has_opening_hours: !!(d.regularOpeningHours?.periods?.length),
        rating:           d.rating || 0,
        review_count:     d.userRatingCount || 0,
        photos_count:     d.photos?.length || 0,
        has_description:  !!(d.editorialSummary?.text),
      });
    }

    return res.status(400).json({ error: "Invalid action. Use 'search' or 'details'." });

  } catch (err) {
    console.error("[GBP Proxy Error]", err);
    return res.status(err.status || 500).json({ error: err.status ? err.message : "Internal server error." });
  }
}
