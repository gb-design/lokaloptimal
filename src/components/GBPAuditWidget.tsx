import { useMemo, useState } from "react";
import { ArrowRight, Check, Message, Shield, Star } from "./icons";

const CAL_URL = import.meta.env.PUBLIC_CAL_URL || "https://cal.com/DEIN-USERNAME/gbp-audit";

type Phase = "input" | "fallback" | "scanning" | "results";
type FoundBusiness = { place_id: string; name: string; address?: string | null };
type Details = {
  name?: string | null;
  address?: string | null;
  phone?: string | null | boolean;
  website?: string | null | boolean;
  has_opening_hours?: boolean;
  has_description?: boolean;
  rating?: number;
  review_count?: number;
  photos_count?: number;
};

const categories = [
  { key: "profil", label: "Profilvollständigkeit", weight: 25, icon: Shield },
  { key: "reviews", label: "Bewertungen & Vertrauen", weight: 20, icon: Star },
  { key: "photos", label: "Fotos & Aktualität", weight: 20, icon: Check },
  { key: "activity", label: "Aktivität & Beiträge", weight: 20, icon: Message },
  { key: "contact", label: "Kontakt & Conversion", weight: 15, icon: ArrowRight },
];

const GOOGLE_MAPS_URL_ERROR = "Bitte füge den Teilen-Link deines Google-Unternehmensprofils aus Google Maps ein.";

function isAllowedGoogleMapsUrl(raw: string) {
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

function scoreDetails(details: Details, postsAnswer: string | null) {
  const profilePoints =
    (details.phone ? 6 : 0) +
    (details.website ? 6 : 0) +
    (details.has_opening_hours ? 7 : 0) +
    (details.has_description ? 6 : 0);
  const profile = profilePoints >= 22 ? 1 : profilePoints >= 12 ? 0.55 : 0.2;
  const reviews = (details.rating || 0) >= 4.2 && (details.review_count || 0) >= 15 ? 0.8 : (details.review_count || 0) >= 5 ? 0.55 : 0.2;
  const photos = (details.photos_count || 0) >= 8 ? 1 : (details.photos_count || 0) >= 3 ? 0.55 : 0.2;
  const activity = postsAnswer === "ja" ? 1 : postsAnswer === "nein" ? 0.2 : 0.55;
  const contactScore = [details.website, details.phone, details.has_opening_hours].filter(Boolean).length;
  const contact = contactScore >= 3 ? 1 : contactScore >= 2 ? 0.55 : 0.2;
  const values = { profil: profile, reviews, photos, activity, contact };

  return Math.round(categories.reduce((sum, category) => sum + category.weight * values[category.key as keyof typeof values], 0));
}

function zone(score: number) {
  if (score < 42) return { label: "Kritischer Handlungsbedarf", tone: "bad" };
  if (score < 72) return { label: "Ausbaufähig", tone: "warn" };
  return { label: "Gut aufgestellt", tone: "good" };
}

export default function GBPAuditWidget() {
  const [phase, setPhase] = useState<Phase>("input");
  const [url, setUrl] = useState("");
  const [found, setFound] = useState<FoundBusiness | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [consent, setConsent] = useState(false);
  const [postsAnswer, setPostsAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const score = useMemo(() => (details ? scoreDetails(details, postsAnswer) : 0), [details, postsAnswer]);
  const currentZone = zone(score);
  const isScanning = phase === "scanning";
  const hasValidUrl = isAllowedGoogleMapsUrl(url);
  const canScan = consent && !isScanning && hasValidUrl;

  async function scan() {
    if (!hasValidUrl) {
      setMessage(GOOGLE_MAPS_URL_ERROR);
      return;
    }
    if (!canScan) return;

    setPhase("scanning");
    setMessage("");
    setFound(null);

    try {
      const params = new URLSearchParams({ action: "check", url: url.trim() });
      const response = await fetch(`/api/places?${params}`);
      const payload = await response.json();

      if ((response.status === 400 || response.status === 422) && payload.error === "INVALID_GOOGLE_MAPS_URL") {
        setMessage(GOOGLE_MAPS_URL_ERROR);
        setPhase("input");
        return;
      }

      if (response.status === 429) {
        window.localStorage.setItem("gbp-audit-rate-limited", String(Date.now()));
        setMessage("Heute wurden bereits mehrere kostenlose Checks gestartet. Bitte morgen erneut versuchen oder Termin buchen.");
        setPhase("input");
        return;
      }

      if (!response.ok) throw new Error(payload.error);
      setFound(payload.found);
      setDetails(payload.details);
    } catch {
      setMessage("Der Check konnte gerade nicht abgeschlossen werden. Bitte versuchen Sie es später erneut oder buchen Sie direkt einen Termin.");
      setPhase("input");
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setPhase("results");
  }

  return (
    <div className="audit-widget">
      {phase !== "results" ? (
        <>
          <div className="widget-head">
            <span>Google Business Profil-URL</span>
            <small>{phase === "scanning" ? "Check läuft..." : "Kostenloser Erstcheck"}</small>
          </div>

          <input
            className="widget-input"
            type="text"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setMessage("");
              if (phase === "fallback") setPhase("input");
            }}
            onBlur={() => {
              if (url.trim() && !isAllowedGoogleMapsUrl(url)) setMessage(GOOGLE_MAPS_URL_ERROR);
            }}
            placeholder="Google Maps Teilen-Link"
          />

          {message && <p className="form-message error">{message}</p>}

          <label className="check-line consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            Ich bin einverstanden, dass die eingegebenen Profildaten zur Analyse verarbeitet werden.
          </label>

          <button className="btn btn-primary widget-button" disabled={!canScan || isScanning} onClick={scan}>
            {isScanning ? "Profil wird geprüft..." : "Profil prüfen"}
            <span className="btn-icon">
              <ArrowRight size={18} />
            </span>
          </button>
        </>
      ) : (
        <div className="results">
          <div className={`score-ring ${currentZone.tone}`}>
            <strong>{score}</strong>
            <span>/100</span>
          </div>
          <div>
            <p className="result-label">{currentZone.label}</p>
            <h3>{found?.name || "Ihr Google-Auftritt"} hat klare Hebel.</h3>
            <p>
              In 30 Minuten zeigen wir, welche Maßnahmen sofort Sichtbarkeit, Vertrauen und Anfragen verbessern.
            </p>
          </div>

          <div className="category-list">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div className="category-row" key={category.key}>
                  <Icon size={18} />
                  <span>{category.label}</span>
                  <small>{category.weight} P</small>
                </div>
              );
            })}
          </div>

          <div className="post-question">
            <span>Google Post in den letzten 30 Tagen veröffentlicht?</span>
            <button onClick={() => setPostsAnswer("ja")}>Ja</button>
            <button onClick={() => setPostsAnswer("nein")}>Nein</button>
          </div>

          <a className="btn btn-primary widget-button" href={CAL_URL} target="_blank" rel="noreferrer">
            Termin vereinbaren
            <span className="btn-icon">
              <ArrowRight size={18} />
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
