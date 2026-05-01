import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Message, Shield, Star } from "./icons";

const CAL_URL = import.meta.env.PUBLIC_CAL_URL || "https://cal.com/DEIN-USERNAME/gbp-audit";

type Phase = "input" | "fallback" | "scanning" | "results" | "limit";
type StatusTone = "good" | "warn" | "bad";
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
type CategoryDefinition = {
  key: "profil" | "reviews" | "photos" | "activity" | "contact";
  label: string;
  weight: number;
  icon: typeof Shield;
  hints: Record<StatusTone, string>;
};
type ScoredCategory = CategoryDefinition & {
  status: StatusTone;
  statusLabel: string;
  pointsMultiplier: number;
  hintText: string;
};

const statusMeta: Record<StatusTone, { label: string; pointsMultiplier: number }> = {
  good: { label: "Gut", pointsMultiplier: 1 },
  warn: { label: "Ausbaufähig", pointsMultiplier: 0.65 },
  bad: { label: "Schwach", pointsMultiplier: 0.2 },
};

const scanMessages = [
  "Profil-Link wird geprüft",
  "Unternehmensdaten werden geladen",
  "Bewertungen und Fotos werden bewertet",
  "Ergebnis wird vorbereitet",
];

const categories: CategoryDefinition[] = [
  {
    key: "profil",
    label: "Profilvollständigkeit",
    weight: 25,
    icon: Shield,
    hints: {
      good: "Die wichtigsten Profildaten sind vorhanden. Das schafft Vertrauen und hilft Google, dein Unternehmen korrekt einzuordnen.",
      warn: "Dein Profil hat noch Lücken. Fehlende Angaben zu Öffnungszeiten, Beschreibung oder Kontakt senken deine Wirkung direkt in der Google-Suche.",
      bad: "Dein Profil ist unvollständig. Fehlende Grunddaten wie Telefon, Website oder Öffnungszeiten können Sichtbarkeit und Vertrauen deutlich schwächen.",
    },
  },
  {
    key: "reviews",
    label: "Bewertungen & Antworten",
    weight: 20,
    icon: Star,
    hints: {
      good: "Dein Bewertungsprofil wirkt solide. Regelmäßige neue Bewertungen und aktive Antworten halten diesen Vertrauensvorsprung stabil.",
      warn: "Dein Bewertungsprofil hat Potenzial. Profile, die systematisch Bewertungen sammeln und beantworten, wirken aktiver und vertrauenswürdiger.",
      bad: "Wenige oder niedrig bewertete Rezensionen kosten Vertrauen bei Neukunden. Google wertet Bewertungsaktivität als wichtiges Qualitätssignal.",
    },
  },
  {
    key: "photos",
    label: "Fotos & Aktualität",
    weight: 20,
    icon: Check,
    hints: {
      good: "Dein Profil hat eine gute visuelle Basis. Aktuelle Bilder helfen, Klicks und Vertrauen direkt im Suchergebnis zu erhöhen.",
      warn: "Du hast Fotos, aber es fehlt noch Aktualität oder Menge. Mehr relevante Bilder verbessern die Wirkung deines Profils sichtbar.",
      bad: "Dein Profil hat kaum oder keine Fotos. Das schwächt die Klickrate, weil Nutzer weniger echte Eindrücke vom Unternehmen bekommen.",
    },
  },
  {
    key: "activity",
    label: "Aktivität & Beiträge",
    weight: 20,
    icon: Message,
    hints: {
      good: "Dein Profil sendet aktive Signale. Regelmäßige Beiträge zeigen Google und Suchenden, dass dein Unternehmen gepflegt wird.",
      warn: "Die Aktivität ist ausbaufähig. Wiederkehrende Updates können helfen, dein Profil frischer und relevanter wirken zu lassen.",
      bad: "Profile ohne aktive Google Posts der letzten 30 Tage werden seltener als aktuell wahrgenommen. Beiträge sind ein kostenloser Hebel für mehr Präsenz.",
    },
  },
  {
    key: "contact",
    label: "Kontakt & Conversion",
    weight: 15,
    icon: ArrowRight,
    hints: {
      good: "Die wichtigsten Kontaktpunkte sind vorhanden. Interessenten können ohne Umweg anrufen, die Website öffnen oder Öffnungszeiten prüfen.",
      warn: "Einige Conversion-Elemente fehlen oder sind unvollständig. Jeder fehlende Touchpoint kann direkte Kundenanfragen kosten.",
      bad: "Kritische Kontakt- und Conversion-Elemente fehlen. Ohne vollständige Angaben verlassen viele Besucher dein Profil ohne Aktion.",
    },
  },
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

function decodeMapsValue(value: string) {
  return decodeURIComponent(value).replace(/\+/g, " ").trim();
}

function businessNameFromMapsUrl(raw: string) {
  try {
    const parsed = new URL(raw.trim());
    const placeMatch = parsed.toString().match(/\/maps\/place\/([^/@?&]+)/);
    const query = parsed.searchParams.get("q") || parsed.searchParams.get("query");
    if (placeMatch) return decodeMapsValue(placeMatch[1]).split("—")[0].trim();
    if (query) return decodeMapsValue(query);
  } catch {
    return "";
  }
  return "";
}

function localMockResult(raw: string) {
  const name = businessNameFromMapsUrl(raw) || "Lokales Testprofil";

  return {
    found: {
      place_id: "local-dev-preview",
      name,
      address: "Lokale Testdaten",
    },
    details: {
      name,
      address: "Lokale Testdaten",
      phone: true,
      website: true,
      has_opening_hours: true,
      has_description: false,
      rating: 4.4,
      review_count: 18,
      photos_count: 6,
    },
  };
}

function scoreCategories(scoredCategories: ScoredCategory[]) {
  return Math.round(scoredCategories.reduce((sum, category) => sum + category.weight * category.pointsMultiplier, 0));
}

function scoreDetails(details: Details) {
  return scoreCategories(getScoredCategories(details));
}

function getScoredCategories(details: Details): ScoredCategory[] {
  const profilePoints =
    (details.phone ? 6 : 0) +
    (details.website ? 6 : 0) +
    (details.has_opening_hours ? 7 : 0) +
    (details.has_description ? 6 : 0);
  const profile: StatusTone = profilePoints >= 18 ? "good" : profilePoints >= 12 ? "warn" : "bad";
  const reviews: StatusTone =
    (details.rating || 0) >= 4.6 && (details.review_count || 0) >= 40
      ? "good"
      : (details.rating || 0) >= 3.8 || (details.review_count || 0) >= 5
        ? "warn"
        : "bad";
  const photos: StatusTone = (details.photos_count || 0) >= 8 ? "good" : (details.photos_count || 0) >= 3 ? "warn" : "bad";
  const activity: StatusTone = "bad";
  const contactScore = [details.website, details.phone, details.has_opening_hours].filter(Boolean).length;
  const contact: StatusTone = contactScore >= 3 ? "good" : contactScore >= 2 ? "warn" : "bad";
  const values = { profil: profile, reviews, photos, activity, contact };

  return categories.map((category) => {
    const status = values[category.key];
    return {
      ...category,
      status,
      statusLabel: statusMeta[status].label,
      pointsMultiplier: statusMeta[status].pointsMultiplier,
      hintText: category.hints[status],
    };
  });
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
  const [message, setMessage] = useState("");
  const [scanMessageIndex, setScanMessageIndex] = useState(0);
  const [openCategory, setOpenCategory] = useState<string | null>("activity");

  const scoredCategories = useMemo(() => (details ? getScoredCategories(details) : []), [details]);
  const score = useMemo(() => (details ? scoreDetails(details) : 0), [details]);
  const currentZone = zone(score);
  const isScanning = phase === "scanning";
  const hasValidUrl = isAllowedGoogleMapsUrl(url);
  const canScan = consent && !isScanning && hasValidUrl;

  useEffect(() => {
    if (!isScanning) {
      setScanMessageIndex(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setScanMessageIndex((index) => (index + 1) % scanMessages.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [isScanning]);

  async function scan() {
    if (!hasValidUrl) {
      setMessage(GOOGLE_MAPS_URL_ERROR);
      return;
    }
    if (!canScan) return;

    setPhase("scanning");
    setMessage("");
    setFound(null);
    setOpenCategory("activity");

    try {
      if (import.meta.env.DEV) {
        const preview = localMockResult(url);
        setFound(preview.found);
        setDetails(preview.details);
        await new Promise((resolve) => window.setTimeout(resolve, 1800));
        setPhase("results");
        return;
      }

      const params = new URLSearchParams({ action: "check", url: url.trim() });
      const response = await fetch(`/api/places?${params}`);
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;

      if (!payload) throw new Error("Unexpected API response.");

      if ((response.status === 400 || response.status === 422) && payload.error === "INVALID_GOOGLE_MAPS_URL") {
        setMessage(GOOGLE_MAPS_URL_ERROR);
        setPhase("input");
        return;
      }

      if (response.status === 429) {
        window.localStorage.setItem("gbp-audit-rate-limited", String(Date.now()));
        setPhase("limit");
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

  function resetScan() {
    setPhase("input");
    setUrl("");
    setFound(null);
    setDetails(null);
    setMessage("");
    setOpenCategory("activity");
  }

  return (
    <div className="audit-widget">
      {phase === "scanning" ? (
        <div className="scan-loading" role="status" aria-live="polite">
          <div className="scan-spinner" aria-hidden="true" />
          <div className="scan-copy">
            <p className="scan-kicker">Analyse läuft</p>
            <h3>{scanMessages[scanMessageIndex]}</h3>
            <p>Wir prüfen die sichtbaren Profil-Signale und bereiten dein Ergebnis auf.</p>
          </div>
        </div>
      ) : phase === "limit" ? (
        <div className="limit-state" role="status" aria-live="polite">
          <div className="limit-icon" aria-hidden="true">
            <ArrowRight size={22} />
          </div>
          <div>
            <p className="result-label">Tageslimit erreicht</p>
            <h3>Ihr maximales tägliches Scan-Limit ist erreicht.</h3>
            <p>
              Zögern Sie nicht und buchen Sie ein kostenloses Erstgespräch. Dort klären wir direkt, welche Maßnahmen für
              Ihr Profil sinnvoll sind.
            </p>
          </div>
          <a className="btn btn-primary widget-button cta-pulse" href={CAL_URL} rel="noreferrer" data-cal-open>
            Jetzt handeln und Termin vereinbaren
            <span className="btn-icon">
              <ArrowRight size={18} />
            </span>
          </a>
        </div>
      ) : phase !== "results" ? (
        <>
          <div className="widget-head">
            <span>Google Business Profil-URL</span>
            <small>Kostenloser Erstcheck</small>
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
          <div className="result-summary">
            <div className={`score-ring ${currentZone.tone}`} style={{ "--score": `${score}%` } as CSSProperties}>
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
          </div>

          <div className="category-list">
            {scoredCategories.map((category) => {
              const Icon = category.icon;
              const isOpen = openCategory === category.key;
              return (
                <div className={`category-item ${isOpen ? "open" : ""}`} key={category.key}>
                  <button
                    className="category-row"
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenCategory(isOpen ? null : category.key)}
                  >
                    <Icon size={18} />
                    <span>{category.label}</span>
                    <small className={`status-pill ${category.status}`}>
                      <span className="status-dot" aria-hidden="true" />
                      <span className="status-text">{category.statusLabel}</span>
                    </small>
                    <span className="category-chevron" aria-hidden="true">
                      <ArrowRight size={17} />
                    </span>
                  </button>
                  {isOpen && <p className="category-hint">{category.hintText}</p>}
                </div>
              );
            })}
          </div>

          <a className="btn btn-primary widget-button" href={CAL_URL} rel="noreferrer" data-cal-open>
            Jetzt handeln und Termin vereinbaren
            <span className="btn-icon">
              <ArrowRight size={18} />
            </span>
          </a>
          <button className="rescan-button" type="button" onClick={resetScan}>
            Anderes Profil scannen
          </button>
        </div>
      )}
    </div>
  );
}
