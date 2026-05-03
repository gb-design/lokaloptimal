const PLACES_BASE = "https://places.googleapis.com/v1";
const DEFAULT_RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60 * 24;
const RATE_LIMIT_NAMESPACE = "gbp-audit:v2";
const INVALID_GOOGLE_MAPS_URL = "INVALID_GOOGLE_MAPS_URL";
const FETCH_TIMEOUT_MS = 6500;
const MAX_URL_LENGTH = 900;
const placeIdPattern = /^[A-Za-z0-9_-]{12,180}$/;

type FoundBusiness = { place_id: string; name: string; address?: string | null };
type Details = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  has_opening_hours?: boolean;
  has_description?: boolean;
  rating?: number;
  review_count?: number;
  photos_count?: number;
};

function setCors(req: any, res: any) {
  const origin = firstValue(req.headers.origin);
  const host = firstValue(req.headers.host);
  const configuredOrigins = (process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const sameHostOrigins = host ? [`https://${host}`, `http://${host}`] : [];
  const allowWildcard = configuredOrigins.includes("*");
  const allowedOrigins = configuredOrigins.filter((value) => value !== "*");
  const allowedOrigin =
    origin && (allowWildcard || allowedOrigins.includes(origin) || sameHostOrigins.includes(origin))
      ? origin
      : allowedOrigins[0] || "";

  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (origin && !allowedOrigin) {
    res.status(403).end();
    return true;
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dailyRateLimitMax() {
  const configuredLimit = Number.parseInt(process.env.GBP_AUDIT_DAILY_LIMIT || "", 10);
  return Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : DEFAULT_RATE_LIMIT_MAX;
}

function isAllowedSubmittedGoogleMapsUrl(raw: string) {
  if (raw.length > MAX_URL_LENGTH) return false;

  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname === "www.google.com") return parsed.pathname.startsWith("/maps/");
    if (parsed.hostname === "maps.app.goo.gl") return parsed.pathname.length > 1;
    if (parsed.hostname === "goo.gl") return parsed.pathname.startsWith("/maps/");
    return false;
  } catch {
    return false;
  }
}

function isGoogleMapsDestination(raw: string) {
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

function decodeMapsValue(value: string) {
  return decodeURIComponent(value).replace(/\+/g, " ").trim();
}

function parseGoogleMapsUrl(raw: string) {
  const url = new URL(raw);
  const href = url.toString();
  const placeMatch = href.match(/\/maps\/place\/([^/@?&]+)/);
  const query = url.searchParams.get("q") || url.searchParams.get("query");
  const coordMatch = href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

  let name = "";
  if (placeMatch) name = decodeMapsValue(placeMatch[1]).split("—")[0].trim();
  if (!name && query) name = decodeMapsValue(query);

  return name
    ? {
        name,
        lat: coordMatch?.[1],
        lng: coordMatch?.[2],
      }
    : null;
}

async function resolveGoogleMapsUrl(raw: string) {
  if (!isAllowedSubmittedGoogleMapsUrl(raw)) {
    const error = new Error(INVALID_GOOGLE_MAPS_URL);
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  let current = raw.trim();
  const submittedUrl = new URL(current);
  if (submittedUrl.hostname === "www.google.com") return current;

  for (let i = 0; i < 5; i += 1) {
    const response = await fetchWithTimeout(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "LokalOptimal GBP Audit URL Resolver",
      },
    });
    const location = response.headers.get("location");
    if (!location) break;

    current = new URL(location, current).toString();
    if (isGoogleMapsDestination(current)) return current;
  }

  const error = new Error(INVALID_GOOGLE_MAPS_URL);
  (error as Error & { status?: number }).status = 400;
  throw error;
}

async function queryFromSubmittedUrl(raw: string) {
  const resolvedUrl = await resolveGoogleMapsUrl(raw);
  const parsed = parseGoogleMapsUrl(resolvedUrl);
  if (parsed) return parsed;

  const error = new Error(INVALID_GOOGLE_MAPS_URL);
  (error as Error & { status?: number }).status = 422;
  throw error;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchWithTimeout(input: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function clientKey(req: any) {
  const forwardedFor = firstValue(req.headers["x-forwarded-for"]) || "";
  const ip = forwardedFor.split(",")[0]?.trim() || firstValue(req.headers["x-real-ip"]) || req.socket?.remoteAddress || "unknown";
  const userAgent = firstValue(req.headers["user-agent"]) || "unknown";
  return sha256(`${ip}:${userAgent}`);
}

async function kvCommand<T>(command: string, ...args: Array<string | number>): Promise<T> {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error("KV_NOT_CONFIGURED");
  }

  const path = [command, ...args.map((arg) => encodeURIComponent(String(arg)))].join("/");
  const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error || "KV request failed.");
  }

  return payload.result as T;
}

async function enforceRateLimit(req: any) {
  const maxRequests = dailyRateLimitMax();
  const key = `${RATE_LIMIT_NAMESPACE}:${await clientKey(req)}`;
  const count = await kvCommand<number>("incr", key);

  if (count === 1) {
    await kvCommand<number>("expire", key, RATE_LIMIT_WINDOW_SECONDS);
  }

  if (count > maxRequests) {
    const ttl = await kvCommand<number>("ttl", key);
    return {
      allowed: false,
      retryAfter: Math.max(ttl, 60),
      limit: maxRequests,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(maxRequests - count, 0),
    limit: maxRequests,
  };
}

async function searchPlace(apiKey: string, query: string, lat?: string, lng?: string): Promise<FoundBusiness> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 1,
    languageCode: "de",
  };

  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: Number(lat), longitude: Number(lng) },
        radius: 30000,
      },
    };
  }

  const response = await fetchWithTimeout(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok || !data.places?.length) {
    const error = new Error("No place found for this query.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const place = data.places[0];
  return {
    place_id: place.id,
    name: place.displayName?.text || query,
    address: place.formattedAddress || null,
  };
}

async function getPlaceDetails(apiKey: string, placeId: string): Promise<Details> {
  const response = await fetchWithTimeout(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
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

  const data = await response.json();
  if (!response.ok || data.error) {
    const error = new Error(data.error?.message || "Place not found.");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  return {
    name: data.displayName?.text || null,
    address: data.formattedAddress || null,
    phone: data.internationalPhoneNumber || null,
    website: data.websiteUri || null,
    has_opening_hours: Boolean(data.regularOpeningHours?.periods?.length),
    rating: data.rating || 0,
    review_count: data.userRatingCount || 0,
    photos_count: data.photos?.length || 0,
    has_description: Boolean(data.editorialSummary?.text),
  };
}

async function guardGoogleCalls(req: any, res: any) {
  try {
    const limit = await enforceRateLimit(req);
    res.setHeader("X-RateLimit-Limit", String(limit.limit));
    res.setHeader("X-RateLimit-Remaining", String(limit.remaining));

    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfter));
      res.status(429).json({ error: "RATE_LIMITED", retry_after_seconds: limit.retryAfter });
      return false;
    }

    return true;
  } catch (error) {
    if ((error as Error).message === "KV_NOT_CONFIGURED") {
      res.status(503).json({ error: "Rate limit storage is not configured." });
      return false;
    }

    console.error("[places rate limit]", error);
    res.status(503).json({ error: "Rate limit check failed." });
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { action } = req.query;

  try {
    if (action === "check") {
      const submittedUrl = firstValue(req.query.url);
      if (!submittedUrl) return res.status(400).json({ error: "Missing url parameter." });
      const parsed = await queryFromSubmittedUrl(String(submittedUrl));
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Places API key is not configured." });
      if (!(await guardGoogleCalls(req, res))) return;

      const found = await searchPlace(apiKey, parsed.name, parsed.lat, parsed.lng);
      const details = await getPlaceDetails(apiKey, found.place_id);
      return res.status(200).json({ found, details });
    }

    if (action === "search") {
      const submittedUrl = firstValue(req.query.url);
      if (!submittedUrl) return res.status(400).json({ error: "Missing url parameter." });
      const parsed = await queryFromSubmittedUrl(String(submittedUrl));
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Places API key is not configured." });
      if (!(await guardGoogleCalls(req, res))) return;

      const found = await searchPlace(apiKey, parsed.name, parsed.lat, parsed.lng);
      return res.status(200).json(found);
    }

    if (action === "details") {
      const placeId = firstValue(req.query.place_id);
      if (!placeId) return res.status(400).json({ error: "Missing place_id parameter." });
      if (!placeIdPattern.test(String(placeId))) return res.status(400).json({ error: "Invalid place_id parameter." });
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Places API key is not configured." });
      if (!(await guardGoogleCalls(req, res))) return;

      const details = await getPlaceDetails(apiKey, String(placeId));
      return res.status(200).json(details);
    }

    return res.status(400).json({ error: "Invalid action." });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    if (status >= 500) console.error("[places]", error);
    return res.status(status).json({ error: status === 500 ? "Internal server error." : (error as Error).message });
  }
}
