export type Interval = "einmalig" | "monatlich" | "laufzeit";

export type Addon = {
  id: string;
  name: string;
  sub: string;
  price: string;
  priceValue: number;
  period: string;
  interval: Interval;
  tooltip: string;
};

export type Offer = {
  id: string;
  name: string;
  badge: string;
  price: string;
  priceValue: number;
  period: string;
  interval: Interval;
  termMonths?: number;
  text: string;
  items: string[];
  featured?: boolean;
  includedAddonIds: string[];
};

export function formatEuro(value: number): string {
  return `€${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export const packages: Offer[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "Einmalig",
    price: "€347",
    priceValue: 347,
    period: "einmalig",
    interval: "einmalig",
    text: "Der perfekte Einstieg für ein professionelles Profil-Setup.",
    items: ["GBP Audit & Analyse", "Vollständiges Profil-Setup", "Kategorien, Texte, Öffnungszeiten"],
    includedAddonIds: [],
  },
  {
    id: "essential",
    name: "Essential",
    badge: "Einmalig",
    price: "€697",
    priceValue: 697,
    period: "einmalig",
    interval: "einmalig",
    text: "Das komplette Setup mit Wettbewerbs-Blick für einen starken ersten Eindruck.",
    items: ["Alles aus Starter", "Foto-Briefing Dokument", "1x Google Post", "Konkurrenzanalyse (3 Mitbewerber)"],
    includedAddonIds: ["foto-briefing", "konkurrenzanalyse"],
  },
  {
    id: "growth",
    name: "Growth",
    badge: "3 Monate",
    price: "€1.397",
    priceValue: 1397,
    period: "3 Monate Laufzeit",
    interval: "laufzeit",
    termMonths: 3,
    text: "Aktives Management für mehr Sichtbarkeit und Interaktionen.",
    items: ["Alles aus Essential", "3 Monate aktives Management", "4x Google Posts / Monat", "Review-Monitoring & Antworten (bis 15 / Monat)", "Monatliches PDF-Reporting"],
    featured: true,
    includedAddonIds: ["foto-briefing", "konkurrenzanalyse", "review-response"],
  },
  {
    id: "local-pro",
    name: "Local Pro",
    badge: "6 Monate",
    price: "€3.497",
    priceValue: 3497,
    period: "6 Monate Laufzeit",
    interval: "laufzeit",
    termMonths: 6,
    text: "Die Komplettlösung für nachhaltiges Wachstum & maximale Präsenz.",
    items: ["Alles aus Growth", "6 Monate aktives Management", "8x Google Posts / Monat", "Review- & Q&A Management (bis 15 Bewertungen & 10 Fragen / Monat)", "Strategie-Call pro Monat"],
    includedAddonIds: ["foto-briefing", "konkurrenzanalyse", "review-response", "qa-management"],
  },
];

export const retainers: Offer[] = [
  {
    id: "care",
    name: "Care",
    badge: "Direkt buchbar",
    price: "€399",
    priceValue: 399,
    period: "/ Monat",
    interval: "monatlich",
    text: "Hält Ihr Profil dauerhaft aktiv und gepflegt – monatlich kündbar. Direkter Einstieg inkl. einmaligem Profil Quick-Check.",
    items: ["4x Google Posts / Monat", "Review-Monitoring", "Monatliches Reporting"],
    includedAddonIds: [],
  },
  {
    id: "pro-care",
    name: "Pro Care",
    badge: "Direkt buchbar",
    price: "€499",
    priceValue: 499,
    period: "/ Monat",
    interval: "monatlich",
    text: "Die dauerhafte Rundum-Betreuung für maximale Präsenz – monatlich kündbar. Direkter Einstieg inkl. einmaligem Profil Quick-Check.",
    items: ["8x Google Posts / Monat", "Review- & Q&A Management", "Strategie-Call pro Quartal"],
    includedAddonIds: ["review-response", "qa-management"],
  },
];

export const addons: Addon[] = [
  {
    id: "extra-posts",
    name: "Extra Google Posts",
    sub: "+4 / Monat",
    price: "€167",
    priceValue: 167,
    period: "/ Monat",
    interval: "monatlich",
    tooltip: "Hält Ihr Profil sichtbar aktiv und bringt aktuelle Angebote, News oder Aktionen direkt in die Google-Suche.",
  },
  {
    id: "review-response",
    name: "Review-Response Service",
    sub: "bis 15 / Monat",
    price: "€127",
    priceValue: 127,
    period: "/ Monat",
    interval: "monatlich",
    tooltip: "Zeigt Interessenten, dass Ihr Unternehmen auf Feedback reagiert und Kunden ernst nimmt. Inkludiert bis zu 15 Bewertungsantworten pro Monat, jede weitere €6.",
  },
  {
    id: "landingpage",
    name: "Landingpage",
    sub: "1-Pager",
    price: "€1.197",
    priceValue: 1197,
    period: "einmalig",
    interval: "einmalig",
    tooltip: "LokalOptimal erstellt oder optimiert Ihre Website – klar, lokal sichtbar und vorbereitet für KI-Suchmaschinen. Inkl. einer Korrekturrunde.",
  },
  {
    id: "konkurrenzanalyse",
    name: "Konkurrenzanalyse",
    sub: "3 Mitbewerber",
    price: "€197",
    priceValue: 197,
    period: "einmalig",
    interval: "einmalig",
    tooltip: "Macht sichtbar, wo Mitbewerber stärker auftreten und welche Chancen Ihr Profil noch nutzen kann.",
  },
  {
    id: "foto-briefing",
    name: "Foto-Briefing Dokument",
    sub: "",
    price: "€97",
    priceValue: 97,
    period: "einmalig",
    interval: "einmalig",
    tooltip: "Hilft Ihnen, genau die Bilder zu erstellen, die Vertrauen aufbauen und Ihr Profil professioneller wirken lassen.",
  },
  {
    id: "qa-management",
    name: "Q&A Management",
    sub: "bis 10 / Monat",
    price: "€79",
    priceValue: 79,
    period: "/ Monat",
    interval: "monatlich",
    tooltip: "Beantwortet typische Fragen direkt im Profil und reduziert Unsicherheit vor der Kontaktaufnahme. Inkludiert bis zu 10 Fragen pro Monat.",
  },
];

export const geoCheck: Addon = {
  id: "geo-check",
  name: "Website GEO-Check",
  sub: "KI-Sichtbarkeit",
  price: "€197",
  priceValue: 197,
  period: "einmalig",
  interval: "einmalig",
  tooltip: "Prüft, ob KI-Suchmaschinen wie ChatGPT, Perplexity und Google AI Overviews Ihr Unternehmen korrekt erfassen und zitieren können.",
};

export const qrReviewTrigger: Addon = {
  id: "qr-review-trigger",
  name: "QR Review Trigger",
  sub: "Aufsteller",
  price: "auf Anfrage",
  priceValue: 0,
  period: "",
  interval: "einmalig",
  tooltip: "Individuell gestalteter QR-Code-Aufsteller, der Kundinnen und Kunden direkt vor Ort zur Google-Bewertung führt.",
};

export const quickCheck: Addon = {
  id: "quick-check",
  name: "Profil Quick-Check & Übernahme",
  sub: "Pflicht beim Direkteinstieg",
  price: "€147",
  priceValue: 147,
  period: "einmalig",
  interval: "einmalig",
  tooltip: "Einmalige Prüfung und saubere Übernahme Ihres bestehenden Profils, bevor die laufende Betreuung startet.",
};

const allAddons: Addon[] = [...addons, geoCheck, qrReviewTrigger, quickCheck];
const allOffers: Offer[] = [...packages, ...retainers];

export function findOffer(id: string): Offer | undefined {
  return allOffers.find((offer) => offer.id === id);
}

export function findAddon(id: string): Addon | undefined {
  return allAddons.find((addon) => addon.id === id);
}
