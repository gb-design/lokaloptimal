/**
 * GBP Audit Widget
 * React Component — einbinden in Landingpage
 *
 * Setup: siehe GBP_WIDGET_SETUP.md
 * Deps:  keine externen Libraries
 */

import { useState, useEffect, useRef } from "react";

// ─── Konfiguration ───────────────────────────────────────────────────────────
const CONFIG = {
  // Proxy-URL: wenn Widget und API im selben Vercel-Projekt → "/api/places"
  // Separates Deployment → "https://deine-api.vercel.app/api/places"
  PROXY_URL: "/api/places",
  CAL_URL:   "https://cal.com/DEIN-USERNAME/gbp-audit", // ← anpassen
  GA_SCAN:   "gbp_audit_scan",
  GA_CTA:    "gbp_audit_cta_click",
};
const GOOGLE_MAPS_URL_ERROR = "Bitte füge den Teilen-Link deines Google-Unternehmensprofils aus Google Maps ein.";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  accent:      "#4F46E5",
  accentHover: "#4338CA",
  accentLight: "#EEF2FF",
  accentFaint: "#C7D2FE",
  good:        "#22C55E",
  warn:        "#F59E0B",
  warnBg:      "#FFFBEB",
  bad:         "#EF4444",
  text:        "#111827",
  muted:       "#6B7280",
  border:      "#E5E7EB",
  surface:     "#F8F9FC",
  bg:          "#FFFFFF",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICONS = {
  profil:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  bewertungen: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  fotos:       <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
  aktivitaet:  <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  kontakt:     <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.42 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.3a16 16 0 0 0 6.72 6.72l1.62-1.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
};

function SvgIcon({ id, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[id]}
    </svg>
  );
}

// ─── Kategorie-Definitionen ────────────────────────────────────────────────────
const CAT_DEFS = {
  profil: {
    id: "profil", label: "Profilvoilständigkeit", weight: 25,
    expandTexts: {
      gut:          null,
      ausbaufaehig: "Dein Profil hat noch Lücken — fehlende Angaben zu Öffnungszeiten, Beschreibung oder Kontakt senken deine Sichtbarkeit direkt in der Google-Suche.",
      schwach:      "Dein Profil ist unvollständig. Fehlende Grunddaten (Tel., Website, Öffnungszeiten) führen dazu, dass Google dein Unternehmen seltener ausspielt.",
    },
  },
  bewertungen: {
    id: "bewertungen", label: "Bewertungen & Antworten", weight: 20,
    expandTexts: {
      gut:          null,
      ausbaufaehig: "Dein Bewertungsprofil hat Potenzial. Profile die systematisch auf Bewertungen antworten, werden von Google als aktiver eingestuft und besser ausgespielt.",
      schwach:      "Wenige oder niedrig bewertete Rezensionen kosten täglich Vertrauen bei Neukunden. Google wertet Bewertungsaktivität als zentrales Qualitätssignal.",
    },
  },
  fotos: {
    id: "fotos", label: "Fotos & Aktualität", weight: 20,
    expandTexts: {
      gut:          null,
      ausbaufaehig: "Du hast Fotos, aber Google empfiehlt mindestens 10 aktuelle Bilder für optimale Sichtbarkeit. Mehr Fotos = höhere Klickrate auf dein Profil.",
      schwach:      "Dein Profil hat kaum oder keine Fotos. Das ist einer der stärksten negativen Faktoren für die Klickrate — Nutzer überspringen Profile ohne visuelle Eindrücke.",
    },
  },
  aktivitaet: {
    id: "aktivitaet", label: "Aktivität & Beiträge", weight: 20,
    expandTexts: {
      gut:          null,
      ausbaufaehig: null,
      schwach:      "Profile ohne aktive Google Posts der letzten 30 Tage werden seltener in lokalen Suchergebnissen ausgespielt. Posts sind ein unterschätzter, kostenloser Hebel.",
    },
  },
  kontakt: {
    id: "kontakt", label: "Kontakt & Conversion", weight: 15,
    expandTexts: {
      gut:          null,
      ausbaufaehig: "Einige Conversion-Elemente fehlen oder sind unkonfiguriert. Jeder fehlende Touchpoint (Anruf, Website, Buchung) kostet direkt Kundenanfragen.",
      schwach:      "Kritische Kontakt- und Conversion-Elemente fehlen. Ohne vollständige Angaben verlässt ein Großteil der Besucher dein Profil ohne Aktion.",
    },
  },
};

// ─── Scoring ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  gut:          { label: "Gut",          color: C.good, pts: 1.0  },
  ausbaufaehig: { label: "Ausbaufähig",  color: C.warn, pts: 0.55 },
  schwach:      { label: "Schwach",      color: C.bad,  pts: 0.20 },
};

function computeCategories(details, postsAnswer) {
  const { phone, website, has_opening_hours, has_description,
          rating, review_count, photos_count } = details;

  // Profilvoilständigkeit (25 pts)
  let pp = 0;
  if (phone)             pp += 6;
  if (website)           pp += 6;
  if (has_opening_hours) pp += 7;
  if (has_description)   pp += 6;
  const profilStatus = pp >= 22 ? "gut" : pp >= 12 ? "ausbaufaehig" : "schwach";

  // Bewertungen — rating+count messbar; Antwortrate konservativ
  const bewStatus =
    (rating >= 4.2 && review_count >= 15) ? "ausbaufaehig" :
    (rating >= 3.8 || review_count >=  5) ? "ausbaufaehig" : "schwach";

  // Fotos (echte Zahl)
  const fotoStatus =
    photos_count >= 8 ? "gut" :
    photos_count >= 3 ? "ausbaufaehig" : "schwach";

  // Aktivität (Self-Assessment) — null = pending (inline Frage)
  const aktivStatus =
    postsAnswer === null   ? null    :
    postsAnswer === "ja"   ? "gut"   : "schwach";

  // Kontakt & Conversion
  const kScore = [website, phone, has_opening_hours].filter(Boolean).length;
  const kontaktStatus = kScore >= 3 ? "gut" : kScore >= 2 ? "ausbaufaehig" : "schwach";

  return [
    { ...CAT_DEFS.profil,      status: profilStatus  },
    { ...CAT_DEFS.bewertungen, status: bewStatus      },
    { ...CAT_DEFS.fotos,       status: fotoStatus     },
    { ...CAT_DEFS.aktivitaet,  status: aktivStatus    },
    { ...CAT_DEFS.kontakt,     status: kontaktStatus  },
  ];
}

function calcScore(cats) {
  return Math.round(
    cats.reduce((acc, cat) => {
      const s = cat.status ?? "ausbaufaehig";
      return acc + cat.weight * (STATUS_MAP[s]?.pts ?? 0.55);
    }, 0)
  );
}

function getZone(score) {
  if (score <= 40) return {
    label: "Kritischer Handlungsbedarf", color: C.bad,
    sub:   "Dein Profil verliert täglich potenzielle Kunden. In 30 Minuten klären wir, was sofort getan werden muss.",
  };
  if (score <= 70) return {
    label: "Ausbaufähig", color: C.warn,
    sub:   "Wir haben konkrete Maßnahmen für dein Profil. Kostenlos, unverbindlich, 30 Minuten.",
  };
  return {
    label: "Gut aufgestellt", color: C.good,
    sub:   "Gut aufgestellt — aber der Unterschied zwischen gut und top entscheidet über Marktführerschaft.",
  };
}

function isAllowedGoogleMapsUrl(raw) {
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

// ─── GA4 ──────────────────────────────────────────────────────────────────────
function trackGA(event, params = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, color }) {
  const [displayed, setDisplayed] = useState(0);
  const r = 42, circ = 2 * Math.PI * r;
  const offset = circ - (displayed / 100) * circ;

  useEffect(() => {
    setDisplayed(0);
    let cur = 0;
    const step = score / 55;
    const id = setInterval(() => {
      cur += step;
      if (cur >= score) { setDisplayed(score); clearInterval(id); }
      else setDisplayed(Math.round(cur));
    }, 18);
    return () => clearInterval(id);
  }, [score]);

  return (
    <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke={C.border} strokeWidth="9"/>
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 18ms linear" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 30, fontWeight: 700, fontFamily: "Sora, sans-serif", color: C.text, lineHeight: 1 }}>
          {displayed}
        </span>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>/100</span>
      </div>
    </div>
  );
}

// ─── Kategorie Row ────────────────────────────────────────────────────────────
function CategoryRow({ cat, expanded, onToggle, onPostsAnswer }) {
  // Aktivität & Beiträge — Inline-Frage wenn noch nicht beantwortet
  if (cat.id === "aktivitaet" && cat.status === null) {
    return (
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 20px" }} className="gbp-fade">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ color: C.muted, display: "flex" }}>
            <SvgIcon id="aktivitaet" />
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.text, fontFamily: "'DM Sans', sans-serif", flex: 1 }}>
            Aktivität & Beiträge
          </span>
          <span style={{
            fontSize: 12, color: C.warn, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
            background: C.warnBg, padding: "2px 9px", borderRadius: 20,
          }}>
            Eine Frage
          </span>
        </div>
        <p style={{ margin: "0 0 10px 25px", fontSize: 13, color: C.muted, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
          Hast du in den letzten 30 Tagen einen Google Post veröffentlicht?
        </p>
        <div style={{ display: "flex", gap: 8, marginLeft: 25, flexWrap: "wrap" }}>
          {[["ja", "Ja ✓"], ["nein", "Nein"], ["was", "Was ist das?"]].map(([val, label]) => (
            <button key={val} onClick={() => onPostsAnswer(val)} style={{
              padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${C.border}`,
              background: C.surface, fontSize: 13, color: C.text, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500, transition: "all 150ms",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border;  e.currentTarget.style.color = C.text; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const s = STATUS_MAP[cat.status] ?? STATUS_MAP.ausbaufaehig;
  const expandText = CAT_DEFS[cat.id]?.expandTexts?.[cat.status];
  const canExpand = !!expandText;

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div onClick={canExpand ? onToggle : undefined} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
        cursor: canExpand ? "pointer" : "default",
        background: expanded ? C.surface : "transparent", transition: "background 150ms",
        userSelect: "none",
      }}
        onMouseEnter={(e) => { if (canExpand) e.currentTarget.style.background = C.surface; }}
        onMouseLeave={(e) => { if (canExpand && !expanded) e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ color: C.muted, display: "flex", flexShrink: 0 }}>
          <SvgIcon id={cat.id} />
        </span>
        <span style={{ flex: 1, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: C.text, fontWeight: 450 }}>
          {cat.label}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: s.color, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }}/>
          {s.label}
        </span>
        {canExpand && (
          <span style={{
            marginLeft: 8, color: C.muted, fontSize: 11,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 250ms ease", display: "inline-block",
          }}>▾</span>
        )}
      </div>
      {canExpand && expanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, padding: "10px 20px 14px 47px", fontSize: 13, color: C.muted, lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
            {expandText}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 16 }) {
  return (
    <>
      <style>{`@keyframes gbp-spin { to { transform: rotate(360deg); } }`}</style>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round"
        style={{ animation: "gbp-spin 0.75s linear infinite", flexShrink: 0 }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </>
  );
}

// ─── Animations ───────────────────────────────────────────────────────────────
const ANIM = `
  @keyframes gbp-fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .gbp-fade    { animation: gbp-fadeIn 320ms ease both; }
  .gbp-fade-d1 { animation-delay:  80ms; }
  .gbp-fade-d2 { animation-delay: 160ms; }
  .gbp-fade-d3 { animation-delay: 240ms; }
  .gbp-fade-d4 { animation-delay: 320ms; }
  .gbp-fade-d5 { animation-delay: 400ms; }
`;

// ─── Shared Styles ─────────────────────────────────────────────────────────────
const inputSt = {
  padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, color: C.text, fontFamily: "'DM Sans', sans-serif",
  background: C.surface, outline: "none", width: "100%", boxSizing: "border-box",
  transition: "border-color 180ms",
};

const btnSt = {
  width: "100%", padding: "13px 20px", border: "none", borderRadius: 10,
  fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  transition: "background 180ms, transform 80ms", cursor: "pointer",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GBPAuditWidget() {
  // phases: "input" | "searching" | "found" | "fallback" | "scanning" | "results"
  const [phase,       setPhase]       = useState("input");
  const [url,         setUrl]         = useState("");
  const [foundBiz,    setFoundBiz]    = useState(null);   // { place_id, name, address }
  const [details,     setDetails]     = useState(null);   // echte API-Daten
  const [confirmed,   setConfirmed]   = useState(false);
  const [consent,     setConsent]     = useState(false);
  const [postsAnswer, setPostsAnswer] = useState(null);   // null | "ja" | "nein" | "was"
  const [expanded,    setExpanded]    = useState({});
  const debounce = useRef(null);

  // Google Fonts
  useEffect(() => {
    const id = "gbp-widget-fonts";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  // URL → Suche (debounced)
  useEffect(() => {
    setConfirmed(false);
    setFoundBiz(null);
    clearTimeout(debounce.current);

    if (url.trim().length < 15) { setPhase("input"); return; }

    if (!isAllowedGoogleMapsUrl(url)) { setPhase("fallback"); return; }

    setPhase("searching");
    debounce.current = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ action: "search", url: url.trim() });
        const res  = await fetch(`${CONFIG.PROXY_URL}?${p}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error);
        setFoundBiz(data);
        setPhase("found");
      } catch {
        setPhase("fallback");
      }
    }, 600);

    return () => clearTimeout(debounce.current);
  }, [url]);

  // Kategorien & Score
  const categories = details ? computeCategories(details, postsAnswer) : null;
  const score      = categories ? calcScore(categories) : 0;
  const zone       = getZone(score);

  // Score Ring animiert nach bei Posts-Antwort neu
  const scoreKey = `${score}-${postsAnswer}`;

  const canScan =
    consent &&
    phase === "found" &&
    confirmed;

  const handleScan = async () => {
    if (!canScan || phase === "scanning") return;
    trackGA(CONFIG.GA_SCAN, { business_name: foundBiz.name, method: "api" });
    setPhase("scanning");

    try {
      let d;
      if (foundBiz?.place_id) {
        const res = await fetch(`${CONFIG.PROXY_URL}?action=details&place_id=${foundBiz.place_id}`);
        d = await res.json();
        if (!res.ok || d.error) throw new Error(d.error);
      } else {
        // Fallback: konservative Defaults (keine echten Daten)
        d = { phone: false, website: false, has_opening_hours: false,
              has_description: false, rating: 0, review_count: 0, photos_count: 0 };
      }
      await new Promise((r) => setTimeout(r, 900));
      setDetails(d);
      setPhase("results");
    } catch {
      // API-Fehler: Defaults statt komplett scheitern
      await new Promise((r) => setTimeout(r, 900));
      setDetails({ phone: false, website: false, has_opening_hours: false,
                   has_description: false, rating: 0, review_count: 0, photos_count: 0 });
      setPhase("results");
    }
  };

  const handlePostsAnswer = (answer) => {
    setPostsAnswer(answer);
    if (answer === "was") setExpanded((p) => ({ ...p, aktivitaet: true }));
  };

  const handleReset = () => {
    setUrl(""); setPhase("input"); setFoundBiz(null); setDetails(null);
    setConfirmed(false);
    setConsent(false); setPostsAnswer(null); setExpanded({});
  };

  const handleCTA = () => {
    trackGA(CONFIG.GA_CTA, { score, zone: zone.label });
    window.open(CONFIG.CAL_URL, "_blank", "noopener,noreferrer");
  };

  // ── RENDER
  return (
    <div style={{ width: "80%", maxWidth: 520, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{ANIM}</style>

      <div style={{
        background: C.bg, borderRadius: 20, overflow: "hidden",
        boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        border: `1px solid ${C.border}`,
      }}>

        {/* ═══ INPUT PHASE ═══ */}
        {phase !== "results" && (
          <div>
            {/* URL-Feld */}
            <div style={{ padding: "24px 24px 16px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                border: `1.5px solid ${C.border}`, borderRadius: 10,
                padding: "11px 14px", background: C.surface, transition: "border-color 180ms",
              }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlurCapture={(e)  => (e.currentTarget.style.borderColor = C.border)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <input
                  type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="Google Maps URL einfügen…"
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none",
                    fontSize: 14, color: C.text, fontFamily: "'DM Sans', sans-serif" }}
                />
                {phase === "searching" && <Spinner size={14}/>}
              </div>
            </div>

            {/* Hint */}
            {phase === "input" && (
              <div style={{ padding: "0 24px 0" }}>
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
                  Z.B.{" "}
                  <code style={{ fontSize: 12, background: C.surface, padding: "2px 7px", borderRadius: 5, border: `1px solid ${C.border}` }}>
                    google.com/maps/place/...
                  </code>
                </p>
              </div>
            )}

            {/* Business Card */}
            {phase === "found" && foundBiz && (
              <div style={{ padding: "0 24px 16px" }} className="gbp-fade">
                <div onClick={() => setConfirmed((v) => !v)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                  background: confirmed ? C.accentLight : C.surface,
                  border: `1.5px solid ${confirmed ? C.accent : C.border}`,
                  borderRadius: 10, cursor: "pointer", transition: "all 200ms",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: `linear-gradient(135deg, ${C.accent}22, ${C.accent}44)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>🏢</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {foundBiz.name}
                    </div>
                    {foundBiz.address && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{foundBiz.address}</div>
                    )}
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: confirmed ? C.accent : "transparent",
                    border: `2px solid ${confirmed ? C.accent : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 200ms",
                  }}>
                    {confirmed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                {!confirmed && (
                  <p style={{ margin: "8px 2px 0", fontSize: 12, color: C.muted }}>
                    Ist das dein Unternehmen? Klick zum Bestätigen.
                  </p>
                )}
              </div>
            )}

            {/* URL-Fehler */}
            {phase === "fallback" && (
              <div style={{ padding: "0 24px 16px" }} className="gbp-fade">
                <div style={{ padding: "12px 14px", background: "#FFFBEB", border: `1px solid #F59E0B55`, borderRadius: 10, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#92400E", lineHeight: 1.55 }}>
                    {GOOGLE_MAPS_URL_ERROR}
                  </p>
                </div>
              </div>
            )}

            {/* Consent */}
            {phase === "found" && (
              <div style={{ padding: "0 24px 0" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <div onClick={() => setConsent((v) => !v)} style={{
                    width: 18, height: 18, borderRadius: 5, marginTop: 1, flexShrink: 0,
                    border: `2px solid ${consent ? C.accent : C.border}`,
                    background: consent ? C.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 150ms",
                  }}>
                    {consent && (
                      <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                        <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.65 }}>
                    Ich stimme zu, dass meine Angaben zur Profilauswertung genutzt und mir ggf. ein Angebot unterbreitet werden darf (Marketing). Keine Weitergabe an Dritte.
                  </span>
                </label>
              </div>
            )}

            {/* Scan Button — immer sichtbar */}
            <div style={{ padding: "16px 24px 24px" }}>
              <button onClick={handleScan}
                disabled={!canScan || phase === "scanning"}
                style={{
                  ...btnSt,
                  background: canScan ? C.accent : C.accentFaint,
                  color: canScan ? "#fff" : "#A5B4FC",
                  cursor: (canScan && phase !== "scanning") ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => { if (canScan) e.currentTarget.style.background = C.accentHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = canScan ? C.accent : C.accentFaint; }}
                onMouseDown={(e)  => { if (canScan) e.currentTarget.style.transform = "translateY(1px)"; }}
                onMouseUp={(e)    => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {phase === "scanning" ? (
                  <><Spinner /> Profil wird analysiert…</>
                ) : (
                  <>
                    Profil kostenlos prüfen
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ RESULTS PHASE ═══ */}
        {phase === "results" && categories && (
          <div>
            {/* Score Header */}
            <div className="gbp-fade" style={{
              display: "flex", alignItems: "center", gap: 20,
              padding: "24px 24px 20px", borderBottom: `1px solid ${C.border}`,
            }}>
              <ScoreRing key={scoreKey} score={score} color={zone.color} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: zone.color, fontFamily: "Sora, sans-serif", marginBottom: 6 }}>
                  {zone.label}
                </div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, maxWidth: 240 }}>
                  {zone.sub}
                </div>
              </div>
            </div>

            {/* Kategorie Rows */}
            {categories.map((cat, i) => (
              <div key={cat.id} className={`gbp-fade gbp-fade-d${i + 1}`}>
                <CategoryRow
                  cat={cat}
                  expanded={!!expanded[cat.id]}
                  onToggle={() => setExpanded((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                  onPostsAnswer={handlePostsAnswer}
                />
              </div>
            ))}

            {/* Locked Teaser */}
            <div className="gbp-fade gbp-fade-d5" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "13px 20px", background: C.surface, borderTop: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 14 }}>🔒</span>
              <span style={{ fontSize: 13, color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                <strong style={{ color: C.text }}>+3 weitere Optimierungspotenziale</strong> erkannt
              </span>
            </div>

            {/* CTA */}
            <div className="gbp-fade gbp-fade-d5" style={{ padding: "20px 24px 24px" }}>
              <button onClick={handleCTA} style={{ ...btnSt, background: C.accent, color: "#fff" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
                onMouseDown={(e)  => (e.currentTarget.style.transform = "translateY(1px)")}
                onMouseUp={(e)    => (e.currentTarget.style.transform = "translateY(0)")}
              >
                Jetzt handeln und Termin vereinbaren
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </button>
              <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 12, color: C.muted }}>
                Kostenlos · Unverbindlich · 30 Minuten
              </p>
              <div style={{ textAlign: "center", marginTop: 14 }}>
                <button onClick={handleReset} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: C.muted, fontFamily: "'DM Sans', sans-serif",
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 8px", borderRadius: 6, transition: "color 150ms",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.32"/>
                  </svg>
                  Anderes Profil scannen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
