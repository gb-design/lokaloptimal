/**
 * Gemeinsame Ableitung von Bewertungsstufen aus Google-Places-Daten.
 *
 * Wird sowohl vom öffentlichen GBP-Check-Widget als auch vom internen
 * Dashboard-Audit benutzt, damit beide Seiten dieselben Schwellen verwenden.
 *
 * ACHTUNG: Dieses Modul landet im öffentlichen Homepage-Bundle.
 * Keine Supabase-Imports, kein `astro:env`, nichts aus `lib/dashboard/`.
 * Die Abhängigkeit läuft ausschließlich in diese Richtung.
 */

export type SignalLevel = 0 | 1 | 2 | 3;

export type PlaceSignals = {
  phone: boolean;
  website: boolean;
  hasOpeningHours: boolean;
  hasDescription: boolean;
  rating: number;
  reviewCount: number;
  photosCount: number;
};

/** Rohdaten aus der Places-Antwort bzw. dem gespeicherten Snapshot vereinheitlichen. */
export function toPlaceSignals(raw: {
  phone?: string | null | boolean;
  website?: string | null | boolean;
  has_opening_hours?: boolean | null;
  has_description?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  photos_count?: number | null;
}): PlaceSignals {
  return {
    phone: Boolean(raw.phone),
    website: Boolean(raw.website),
    hasOpeningHours: Boolean(raw.has_opening_hours),
    hasDescription: Boolean(raw.has_description),
    rating: Number(raw.rating) || 0,
    reviewCount: Number(raw.review_count) || 0,
    photosCount: Number(raw.photos_count) || 0,
  };
}

/**
 * Telefon, Website und Öffnungszeiten — drei Signale, die der Betrieb selbst
 * pflegen kann. Die Anzahl ist bereits die Stufe, keine willkürliche Leiter nötig.
 *
 * Die Google-Beschreibung (`editorialSummary`) geht bewusst NICHT ein: sie wird
 * von Google verfasst, fehlt bei den meisten KMU und lässt sich vom Betrieb
 * nicht beeinflussen. Was man nicht ändern kann, wird nicht bewertet.
 */
export function contactBasicsLevel(signals: PlaceSignals): SignalLevel {
  return [signals.phone, signals.website, signals.hasOpeningHours].filter(Boolean).length as SignalLevel;
}

/** Reine Bewertungsmenge. */
export function reviewVolumeLevel(signals: PlaceSignals): SignalLevel {
  if (signals.reviewCount >= 40) return 3;
  if (signals.reviewCount >= 15) return 2;
  if (signals.reviewCount >= 5) return 1;
  return 0;
}

/**
 * Bewertungsschnitt, an die Menge gekoppelt: unter fünf Bewertungen ist der
 * Schnitt statistisch wertlos, deshalb Deckel bei Stufe 2 — eine einzelne
 * Fünf-Sterne-Bewertung soll nicht die volle Punktzahl kaufen.
 */
export function reviewQualityLevel(signals: PlaceSignals): SignalLevel {
  if (signals.reviewCount === 0) return 0;
  const base: SignalLevel =
    signals.rating >= 4.5 ? 3 : signals.rating >= 4.0 ? 2 : signals.rating >= 3.5 ? 1 : 0;
  if (signals.reviewCount < 5) return Math.min(base, 2) as SignalLevel;
  return base;
}

/**
 * Fotoanzahl. Die Places API liefert für diese Feldmaske höchstens rund zehn
 * Einträge, Stufe 3 bedeutet also "Galerie voll", nicht "genau zehn Fotos".
 */
export function photosLevel(signals: PlaceSignals): SignalLevel {
  if (signals.photosCount >= 10) return 3;
  if (signals.photosCount >= 5) return 2;
  if (signals.photosCount >= 1) return 1;
  return 0;
}

/**
 * Bandgrenzen für beide Seiten. Das Dashboard nutzt alle vier Bänder, das
 * Widget fasst die mittleren beiden zu "Ausbaufähig" zusammen. Eine Quelle,
 * damit die Grenzen nicht wieder auseinanderlaufen.
 */
export const SCORE_BAND_THRESHOLDS = {
  kritisch: 39,
  verbesserungsbedarf: 59,
  solide: 79,
} as const;

export type PlaceScoreRowKey = "kontakt" | "bewertungen_menge" | "bewertungen_qualitaet" | "fotos";

/**
 * Gewichte des öffentlichen Checks. Jedes Places-Signal geht genau einmal ein —
 * keine Kategorie wiederholt die Eingaben einer anderen.
 */
export const PLACE_SCORE_ROWS: Array<{ key: PlaceScoreRowKey; weight: number; level: (signals: PlaceSignals) => SignalLevel }> = [
  { key: "kontakt", weight: 30, level: contactBasicsLevel },
  { key: "bewertungen_menge", weight: 25, level: reviewVolumeLevel },
  { key: "bewertungen_qualitaet", weight: 20, level: reviewQualityLevel },
  { key: "fotos", weight: 25, level: photosLevel },
];

export type PlaceScoreRow = {
  key: PlaceScoreRowKey;
  level: SignalLevel;
  weight: number;
  points: number;
};

/**
 * Gesamtscore 0–100 ohne künstliche Untergrenze: `Gewicht × Stufe/3`,
 * dieselbe Formel wie im Dashboard-Audit.
 */
export function scorePlaceSignals(signals: PlaceSignals): { score: number; rows: PlaceScoreRow[] } {
  const rows = PLACE_SCORE_ROWS.map((row) => {
    const level = row.level(signals);
    return { key: row.key, level, weight: row.weight, points: (row.weight * level) / 3 };
  });
  return {
    score: Math.round(rows.reduce((sum, row) => sum + row.points, 0)),
    rows,
  };
}
