import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Message, Shield, Star } from "./icons";
import {
  SCORE_BAND_THRESHOLDS,
  scorePlaceSignals,
  toPlaceSignals,
  type PlaceScoreRowKey,
  type SignalLevel,
} from "../lib/place-signals";

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
  key: PlaceScoreRowKey;
  label: string;
  icon: typeof Shield;
  hints: Record<SignalLevel, string>;
};
type ScoredCategory = CategoryDefinition & {
  level: SignalLevel;
  points: number;
  status: StatusTone;
  statusLabel: string;
  hintText: string;
};

/** Vier Bewertungsstufen auf die drei vorhandenen CSS-Töne abbilden. */
const levelMeta: Record<SignalLevel, { label: string; tone: StatusTone }> = {
  3: { label: "Stark", tone: "good" },
  2: { label: "Solide", tone: "warn" },
  1: { label: "Ausbaufähig", tone: "warn" },
  0: { label: "Schwach", tone: "bad" },
};

const scanMessages = [
  "Profil-Link wird geprüft",
  "Unternehmensdaten werden geladen",
  "Bewertungen und Fotos werden bewertet",
  "Ergebnis wird vorbereitet",
];

const categories: CategoryDefinition[] = [
  {
    key: "kontakt",
    label: "Kontakt & Erreichbarkeit",
    icon: Shield,
    hints: {
      3: "Telefon, Website und Öffnungszeiten sind hinterlegt. Interessenten können ohne Umweg anrufen, buchen oder vorbeikommen.",
      2: "Eine der drei Grundangaben fehlt — Telefon, Website oder Öffnungszeiten. Genau an dieser Lücke springen Suchende ab.",
      1: "Nur eine der drei Grundangaben ist gepflegt. Ohne Telefon, Website und Öffnungszeiten bleibt dein Profil eine Sackgasse.",
      0: "Weder Telefon noch Website noch Öffnungszeiten sind hinterlegt. Suchende finden dich, können aber nichts damit anfangen.",
    },
  },
  {
    key: "bewertungen_menge",
    label: "Bewertungen: Menge",
    icon: Star,
    hints: {
      3: "Du hast genug Bewertungen, dass sie statistisch tragen. Wichtig ist jetzt, dass regelmäßig neue dazukommen.",
      2: "Eine solide Basis. Ab etwa 40 Bewertungen wirkt das Profil deutlich belastbarer als das der meisten Mitbewerber.",
      1: "Wenige Bewertungen. Neukunden vergleichen, und ein dünnes Bewertungsprofil verliert diesen Vergleich fast immer.",
      0: "So gut wie keine Bewertungen. Das ist der wirksamste und billigste Hebel, den du gerade liegen lässt.",
    },
  },
  {
    key: "bewertungen_qualitaet",
    label: "Bewertungen: Qualität",
    icon: Message,
    hints: {
      3: "Ein sehr guter Schnitt. Antworten auf Bewertungen halten dieses Niveau und zeigen, dass jemand zuhört.",
      2: "Ein ordentlicher Schnitt mit Luft nach oben. Gezielt zufriedene Kunden um eine Bewertung zu bitten hebt ihn spürbar.",
      1: "Der Schnitt liegt unter dem, was Suchende erwarten. Einzelne schlechte Bewertungen wiegen schwer, wenn wenige gute dagegenstehen.",
      0: "Der Bewertungsschnitt kostet dich aktiv Anfragen. Hier lohnt sich zuerst ein Blick auf die Ursachen, dann auf die Menge.",
    },
  },
  {
    key: "fotos",
    label: "Fotos",
    icon: Check,
    hints: {
      3: "Deine Galerie ist gut gefüllt. Aktuelle, echte Bilder erhöhen die Klickrate direkt im Suchergebnis.",
      2: "Ein paar Bilder sind da. Mehr Aufnahmen von Räumen, Team und Arbeit machen den Unterschied zwischen anschauen und anrufen.",
      1: "Kaum Fotos. Nutzer bekommen keinen Eindruck vom Unternehmen und klicken eher auf den Mitbewerber daneben.",
      0: "Keine Fotos im Profil. Das ist die auffälligste Lücke, die Suchende sofort bemerken.",
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

/** Eine Berechnung für Score und Zeilen, damit das Modell nicht zweimal pro Render läuft. */
function evaluate(details: Details): { score: number; rows: ScoredCategory[] } {
  const { score, rows } = scorePlaceSignals(toPlaceSignals(details));
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    score,
    rows: categories.map((category) => {
      const row = byKey.get(category.key)!;
      const meta = levelMeta[row.level];
      return {
        ...category,
        level: row.level,
        points: row.points,
        status: meta.tone,
        statusLabel: meta.label,
        hintText: category.hints[row.level],
      };
    }),
  };
}

function zone(score: number) {
  if (score <= SCORE_BAND_THRESHOLDS.kritisch) return { label: "Kritischer Handlungsbedarf", tone: "bad" };
  if (score <= SCORE_BAND_THRESHOLDS.solide) return { label: "Ausbaufähig", tone: "warn" };
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
  // undefined heißt "noch nicht angetippt" und öffnet die schwächste Zeile.
  const [openCategory, setOpenCategory] = useState<string | null | undefined>(undefined);

  const evaluation = useMemo(() => (details ? evaluate(details) : { score: 0, rows: [] }), [details]);
  const scoredCategories = evaluation.rows;
  const score = evaluation.score;
  const weakestCategory = useMemo(() => {
    if (!scoredCategories.length) return null;
    return [...scoredCategories].sort((a, b) => a.points - b.points)[0].key as string;
  }, [scoredCategories]);
  const activeCategory = openCategory === undefined ? weakestCategory : openCategory;
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
    setOpenCategory(undefined);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

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
      const response = await fetch(`/api/places?${params}`, { signal: controller.signal });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;

      if (!payload) throw new Error("Unexpected API response.");

      if ((response.status === 400 || response.status === 422) && payload.error === "INVALID_GOOGLE_MAPS_URL") {
        setMessage(GOOGLE_MAPS_URL_ERROR);
        setPhase("input");
        return;
      }

      if (response.status === 429) {
        try {
          window.localStorage.setItem("gbp-audit-rate-limited", String(Date.now()));
        } catch {
          // Storage can be unavailable in hardened/private browser contexts.
        }
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
    } finally {
      window.clearTimeout(timeout);
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
    setOpenCategory(undefined);
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
            type="url"
            value={url}
            inputMode="url"
            maxLength={900}
            aria-invalid={Boolean(url.trim() && !hasValidUrl)}
            aria-describedby={message ? "audit-widget-message" : undefined}
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

          {message && <p id="audit-widget-message" className="form-message error" role="alert">{message}</p>}

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
              const isOpen = activeCategory === category.key;
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

          <p className="result-note">
            <strong>Was dieser Check nicht sieht</strong>
            Bewertet wird ausschließlich, was Google öffentlich über dein Profil hergibt. Google Beiträge,
            deine Website, deine Position gegenüber Mitbewerbern und dein Umgang mit Bewertungen lassen sich
            hier nicht automatisch prüfen — sind aber oft die größten Hebel. Genau das schauen wir uns im
            Gespräch gemeinsam an.
          </p>

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
