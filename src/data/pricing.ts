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
  icon?: string;
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
  scope: string;
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
    scope: "Google Business Profil: Setup",
    badge: "Einmalig",
    price: "€347",
    priceValue: 347,
    period: "einmalig",
    interval: "einmalig",
    text: "Der Einstieg: ein sauberes, vollständiges Profil-Setup.",
    items: ["GBP Audit & Analyse", "Vollständiges Profil-Setup", "Kategorien, Texte, Öffnungszeiten"],
    includedAddonIds: [],
  },
  {
    id: "essential",
    name: "Essential",
    scope: "Google Business Profil: Setup & Konkurrenzanalyse",
    badge: "Einmalig",
    price: "€697",
    priceValue: 697,
    period: "einmalig",
    interval: "einmalig",
    text: "Das komplette Setup, inklusive Blick auf die Mitbewerber.",
    items: ["Alles aus Starter", "Foto-Briefing Dokument", "1x Google Post", "Konkurrenzanalyse (3 Mitbewerber)"],
    includedAddonIds: ["foto-briefing", "konkurrenzanalyse"],
  },
  {
    id: "growth",
    name: "Growth",
    scope: "Google Business Profil: Setup & 3 Monate Betreuung",
    badge: "3 Monate",
    price: "€1.397",
    priceValue: 1397,
    period: "3 Monate Laufzeit",
    interval: "laufzeit",
    termMonths: 3,
    text: "Aktives Management: regelmäßige Beiträge, Bewertungsantworten und monatlicher Bericht.",
    items: ["Alles aus Essential", "3 Monate aktives Management", "4x Google Posts / Monat", "Review-Monitoring & Antworten (bis 15 / Monat)", "Monatliches PDF-Reporting"],
    featured: true,
    includedAddonIds: ["foto-briefing", "konkurrenzanalyse", "review-response"],
  },
  {
    id: "local-pro",
    name: "Local Pro",
    scope: "Google Business Profil: Setup & 6 Monate Betreuung",
    badge: "6 Monate",
    price: "€3.497",
    priceValue: 3497,
    period: "6 Monate Laufzeit",
    interval: "laufzeit",
    termMonths: 6,
    text: "Wie Growth, aber über 6 Monate, mit mehr Beiträgen, KI-Antworten-Management und monatlichem Strategie-Call.",
    items: ["Alles aus Growth", "6 Monate aktives Management", "8x Google Posts / Monat", "Review- & KI-Antworten-Management (bis 15 Bewertungen & 10 Fragen / Monat)", "Strategie-Call pro Monat"],
    includedAddonIds: ["foto-briefing", "konkurrenzanalyse", "review-response", "qa-management"],
  },
];

export const retainers: Offer[] = [
  {
    id: "care",
    name: "Care",
    scope: "Google Business Profil: laufende Betreuung",
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
    scope: "Google Business Profil: laufende Betreuung",
    badge: "Direkt buchbar",
    price: "€499",
    priceValue: 499,
    period: "/ Monat",
    interval: "monatlich",
    text: "Dauerhafte Betreuung mit mehr Beiträgen und KI-Antworten-Management – monatlich kündbar. Direkter Einstieg inkl. einmaligem Profil Quick-Check.",
    items: ["8x Google Posts / Monat", "Review- & KI-Antworten-Management", "Strategie-Call pro Quartal"],
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
    icon: "campaign",
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
    icon: "rate_review",
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
    icon: "web",
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
    icon: "query_stats",
  },
  {
    id: "foto-briefing",
    name: "Foto-Briefing Dokument",
    sub: "",
    price: "€97",
    priceValue: 97,
    period: "einmalig",
    interval: "einmalig",
    tooltip: "Hilft Ihnen, genau die Bilder zu erstellen, die Vertrauen aufbauen.",
    icon: "photo_camera",
  },
  {
    id: "qa-management",
    name: "KI-Antworten-Management",
    sub: "bis 10 Fragen / Monat",
    price: "€79",
    priceValue: 79,
    period: "/ Monat",
    interval: "monatlich",
    tooltip: "Google beantwortet Kundenfragen inzwischen selbst per KI – aus Ihrem Profil, Ihren Bewertungen und Ihrer Website. Ich recherchiere die typischen Fragen Ihrer Kundschaft und hinterlege die Antworten genau dort, wo die KI sie ausliest. Inkludiert bis zu 10 Fragen pro Monat.",
    icon: "psychology",
  },
  {
    id: "qr-review-trigger",
    name: "QR Review Trigger",
    sub: "Design + Druckdaten",
    price: "€147",
    priceValue: 147,
    period: "einmalig",
    interval: "einmalig",
    tooltip: "Individuell gestalteter QR-Code mit Ihrem Logo und klarer Handlungsaufforderung, der Kundinnen und Kunden vor Ort direkt zur Google-Bewertung führt. Sie erhalten druckfertige Dateien.",
    icon: "qr_code_2",
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

const allAddons: Addon[] = [...addons, geoCheck, quickCheck];
const allOffers: Offer[] = [...packages, ...retainers];

export function findOffer(id: string): Offer | undefined {
  return allOffers.find((offer) => offer.id === id);
}

export function findAddon(id: string): Addon | undefined {
  return allAddons.find((addon) => addon.id === id);
}
