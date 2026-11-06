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
import { classifyAuditResponse } from "../lib/audit-response";
import { extractMapsLink, isAllowedGoogleMapsUrl, mapsLinkErrorMessage } from "../lib/maps-link";

const CAL_URL = import.meta.env.PUBLIC_CAL_URL || "https://cal.com/DEIN-USERNAME/gbp-audit";

type Phase = "input" | "fallback" | "scanning" | "results" | "limit" | "notfound";
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
  "Link wird geprüft",
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
      2: "Eine der drei Grundangaben fehlt: Telefon, Website oder Öffnungszeiten. Diese Lücke kann Suchende abschrecken.",
      1: "Nur eine der drei Grundangaben ist gepflegt. Ohne Telefon, Website und Öffnungszeiten bleibt Ihr Profil eine Sackgasse.",
      0: "Weder Telefon noch Website noch Öffnungszeiten sind hinterlegt. Suchende finden Sie, können aber nichts damit anfangen.",
    },
  },
  {
    key: "bewertungen_menge",
    label: "Bewertungen: Menge",
    icon: Star,
    hints: {
      3: "Sie haben schon eine gute Anzahl an Bewertungen. Wichtig ist jetzt, dass regelmäßig neue dazukommen.",
      2: "Eine solide Basis. Ab etwa 40 Bewertungen wirkt das Profil deutlich belastbarer.",
      1: "Wenige Bewertungen. Neukunden vergleichen, und wenige Bewertungen können dabei gegen Sie sprechen.",
      0: "So gut wie keine Bewertungen. Hier lässt sich meist am einfachsten etwas verbessern.",
    },
  },
  {
    key: "bewertungen_qualitaet",
    label: "Bewertungen: Qualität",
    icon: Message,
    hints: {
      3: "Ein sehr guter Schnitt. Antworten auf Bewertungen halten dieses Niveau und zeigen, dass jemand zuhört.",
      2: "Ein ordentlicher Schnitt mit Luft nach oben. Gezielt zufriedene Kunden um eine Bewertung zu bitten kann ihn heben.",
      1: "Der Schnitt liegt unter dem, was Suchende erwarten. Einzelne schlechte Bewertungen wiegen schwer, wenn wenige gute dagegenstehen.",
      0: "Der Bewertungsschnitt kann Sie Anfragen kosten. Hier lohnt sich zuerst ein Blick auf die Ursachen, dann auf die Menge.",
    },
  },
  {
    key: "fotos",
    label: "Fotos",
    icon: Check,
    hints: {
      3: "Die Galerie ist gut gefüllt. Aktuelle, echte Bilder geben Suchenden einen guten ersten Eindruck.",
      2: "Ein paar Bilder sind da. Mehr Aufnahmen von Räumen, Team und Arbeit machen den Unterschied zwischen anschauen und anrufen.",
      1: "Kaum Fotos. Nutzer bekommen keinen Eindruck vom Unternehmen.",
      0: "Keine Fotos im Profil. Das ist die auffälligste Lücke, die Suchende sofort bemerken.",
    },
  },
];

const EMPTY_LINK_MESSAGE = "Bitte fügen Sie zuerst den Link zu Ihrem Google-Eintrag ein.";
const CONSENT_MESSAGE = "Bitte bestätigen Sie zuerst die Einwilligung oben.";

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
  if (score <= SCORE_BAND_THRESHOLDS.kritisch) return { label: "Kritischer Handlungsbedarf", tone: "bad", headline: (name: string) => `${name}: Hier fehlen wichtige Angaben.` };
  if (score <= SCORE_BAND_THRESHOLDS.solide) return { label: "Ausbaufähig", tone: "warn", headline: (name: string) => `${name} hat noch sichtbare Lücken.` };
  return { label: "Gut aufgestellt", tone: "good", headline: (name: string) => `${name} ist gut aufgestellt. Jetzt geht es ums Dranbleiben.` };
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
  const link = extractMapsLink(url);
  const hasValidUrl = isAllowedGoogleMapsUrl(link);

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
    if (isScanning) return;
    if (!link) {
      setMessage(EMPTY_LINK_MESSAGE);
      return;
    }
    if (!hasValidUrl) {
      setMessage(mapsLinkErrorMessage(url));
      return;
    }
    if (!consent) {
      setMessage(CONSENT_MESSAGE);
      return;
    }

    setPhase("scanning");
    setMessage("");
    setFound(null);
    setOpenCategory(undefined);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    try {
      if (import.meta.env.DEV) {
        const preview = localMockResult(link);
        setFound(preview.found);
        setDetails(preview.details);
        await new Promise((resolve) => window.setTimeout(resolve, 1800));
        setPhase("results");
        return;
      }

      const params = new URLSearchParams({ action: "check", url: link });
      const response = await fetch(`/api/places?${params}`, { signal: controller.signal });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;

      const outcome = classifyAuditResponse(response.status, payload);

      if (outcome.kind === "invalid-url") {
        setMessage(mapsLinkErrorMessage(url));
        setPhase("input");
        return;
      }

      if (outcome.kind === "rate-limited") {
        try {
          window.localStorage.setItem("gbp-audit-rate-limited", String(Date.now()));
        } catch {
          // Storage can be unavailable in hardened/private browser contexts.
        }
        setPhase("limit");
        return;
      }

      // "Nicht im Index" ist kein Ausfall und bekommt deshalb einen eigenen
      // Zustand. Sonst rät der Interessent auf einen Serverfehler und versucht
      // es vergeblich später erneut, statt den Termin zu buchen.
      if (outcome.kind === "not-found") {
        setPhase("notfound");
        return;
      }

      if (outcome.kind === "failed") throw new Error("Audit request failed.");

      setFound(outcome.found as FoundBusiness);
      setDetails(outcome.details as Details);
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
            <p>Ich prüfe, was Google über Ihren Eintrag zeigt, und bereite Ihr Ergebnis auf.</p>
          </div>
        </div>
      ) : phase === "limit" ? (
        <div className="limit-state" role="status" aria-live="polite">
          <div className="limit-icon" aria-hidden="true">
            <ArrowRight size={22} />
          </div>
          <div>
            <p className="result-label">Tageslimit erreicht</p>
            <h3>Sie haben heute alle kostenlosen Prüfungen genutzt.</h3>
            <p>
              Buchen Sie ein kostenloses Erstgespräch. Dort kläre ich direkt, welche Maßnahmen für
              Ihr Profil sinnvoll sind.
            </p>
          </div>
          <a className="btn btn-primary widget-button cta-pulse" href={CAL_URL} rel="noreferrer" data-cal-open>
            Kostenloses Erstgespräch buchen
            <span className="btn-icon">
              <ArrowRight size={18} />
            </span>
          </a>
        </div>
      ) : phase === "notfound" ? (
        <div className="limit-state notice-state" role="status" aria-live="polite">
          <div className="limit-icon notice-icon" aria-hidden="true">
            <Shield size={22} />
          </div>
          <div>
            <p className="result-label">Eintrag nicht abrufbar</p>
            <h3>Diesen Eintrag kann der automatische Check nicht abrufen.</h3>
            <p>
              Der Link ist korrekt, Google stellt diesen Eintrag für den automatischen Check nur noch nicht bereit. Das
              ist normal bei frisch verifizierten Einträgen und bei Betrieben ohne öffentlich sichtbare Adresse, und es
              sagt nichts über die Qualität Ihres Eintrags aus. Ich prüfe ihn im Erstgespräch manuell.
            </p>
          </div>
          <a className="btn btn-primary widget-button cta-pulse" href={CAL_URL} rel="noreferrer" data-cal-open>
            Eintrag manuell prüfen lassen
            <span className="btn-icon">
              <ArrowRight size={18} />
            </span>
          </a>
          <button className="rescan-button" type="button" onClick={resetScan}>
            Anderen Eintrag prüfen
          </button>
        </div>
      ) : phase !== "results" ? (
        <>
          <div className="widget-head">
            <label htmlFor="audit-widget-link">Link zu Ihrem Google-Eintrag</label>
            <small>Kostenloser Erstcheck</small>
          </div>

          <input
            id="audit-widget-link"
            className="widget-input"
            type="url"
            value={url}
            inputMode="url"
            maxLength={900}
            aria-invalid={Boolean(link && !hasValidUrl)}
            aria-describedby={message ? "audit-widget-message audit-link-help" : "audit-link-help"}
            onChange={(event) => {
              setUrl(event.target.value);
              setMessage("");
              if (phase === "fallback") setPhase("input");
            }}
            onBlur={() => {
              if (link && !hasValidUrl) setMessage(mapsLinkErrorMessage(url));
            }}
            placeholder="Link hier einfügen"
          />

          {message && <p id="audit-widget-message" className="form-message error" role="alert">{message}</p>}

          <div className="link-help" id="audit-link-help">
            <p className="link-help-title">So finden Sie den Link</p>
            <ol>
              <li>
                <span>
                  <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps öffnen</a> und Ihren Betrieb suchen
                </span>
              </li>
              <li><span>Auf „Teilen“ tippen oder klicken</span></li>
              <li><span>„Link kopieren“ wählen und oben einfügen</span></li>
            </ol>
            <p className="link-help-none">
              Noch kein Eintrag? <a href={CAL_URL} rel="noreferrer" data-cal-open>Erstgespräch buchen</a>
            </p>
          </div>

          <label className="check-line consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (message === CONSENT_MESSAGE) setMessage("");
              }}
            />
            Ich bin einverstanden, dass die eingegebenen Profildaten zur Analyse verarbeitet werden.
          </label>

          <button className="btn btn-primary widget-button" disabled={isScanning} onClick={scan}>
            {isScanning ? "Eintrag wird geprüft..." : "Eintrag prüfen"}
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
              <h3>{currentZone.headline(found?.name || "Ihr Google-Eintrag")}</h3>
              <p>
                In 30 Minuten zeige ich Ihnen, welche Maßnahmen Ihr Profil am schnellsten voranbringen.
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
            Bewertet wird ausschließlich, was Google öffentlich über Ihr Profil hergibt. Google Beiträge,
            Ihre Website, Ihre Position gegenüber Mitbewerbern und Ihr Umgang mit Bewertungen lassen sich
            hier nicht automatisch prüfen, sind aber oft die größten Hebel. Genau das sehen wir uns im
            Gespräch gemeinsam an.
          </p>

          <a className="btn btn-primary widget-button" href={CAL_URL} rel="noreferrer" data-cal-open>
            Ergebnis im Erstgespräch besprechen
            <span className="btn-icon">
              <ArrowRight size={18} />
            </span>
          </a>
          <button className="rescan-button" type="button" onClick={resetScan}>
            Anderen Eintrag prüfen
          </button>
        </div>
      )}
    </div>
  );
}
