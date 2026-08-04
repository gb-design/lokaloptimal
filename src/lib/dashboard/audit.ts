import { findAddon, findOffer } from "../../data/pricing";
import {
  contactBasicsLevel,
  photosLevel,
  reviewVolumeLevel,
  SCORE_BAND_THRESHOLDS,
  toPlaceSignals,
} from "../place-signals";
import type {
  AuditAnswerInput,
  AuditBand,
  AuditCategory,
  AuditCategoryScore,
  AuditCriterion,
  GooglePlaceSnapshot,
  LeadPriority,
  Recommendation,
} from "./types";

const categories: Array<{ key: AuditCategory; label: string; weight: number }> = [
  { key: "google_profil", label: "Google-Profil", weight: 25 },
  { key: "website", label: "Website", weight: 20 },
  { key: "bewertungen", label: "Bewertungen", weight: 15 },
  { key: "lokale_auffindbarkeit", label: "Lokale Auffindbarkeit", weight: 15 },
  { key: "inhalte_bilder", label: "Inhalte & Bilder", weight: 15 },
  { key: "vertrauen_kontakt", label: "Vertrauen & Kontakt", weight: 10 },
];

function criteriaFor(
  category: AuditCategory,
  entries: Array<Omit<AuditCriterion, "category" | "categoryLabel" | "weight">>,
): AuditCriterion[] {
  const meta = categories.find((entry) => entry.key === category)!;
  const weight = meta.weight / entries.length;
  return entries.map((entry) => ({
    ...entry,
    category,
    categoryLabel: meta.label,
    weight,
  }));
}

export const auditCriteria: AuditCriterion[] = [
  ...criteriaFor("google_profil", [
    {
      key: "gbp_basisdaten",
      label: "Basisdaten vollständig",
      description: "Telefon, Website und Öffnungszeiten sind vollständig und korrekt hinterlegt.",
      recommendationIds: ["starter"],
    },
    {
      key: "gbp_kategorien",
      label: "Kategorien & Positionierung",
      description: "Primäre und zusätzliche Kategorien bilden das Angebot präzise ab.",
      recommendationIds: ["starter", "konkurrenzanalyse"],
    },
  ]),
  ...criteriaFor("website", [
    {
      key: "website_angebot",
      label: "Angebot sofort verständlich",
      description: "Besucher verstehen in wenigen Sekunden, was angeboten wird und für wen.",
      recommendationIds: ["landingpage"],
    },
    {
      key: "website_mobil",
      label: "Mobil, schnell & aktuell",
      description: "Die Website funktioniert auf kleinen Screens, lädt zügig und wirkt gepflegt.",
      recommendationIds: ["landingpage", "geo-check"],
    },
  ]),
  ...criteriaFor("bewertungen", [
    {
      key: "reviews_menge",
      label: "Menge & Aktualität",
      description: "Es gibt regelmäßig neue, glaubwürdige Bewertungen.",
      recommendationIds: ["qr-review-trigger"],
    },
    {
      key: "reviews_antworten",
      label: "Antworten & Umgang",
      description: "Bewertungen werden zeitnah, professionell und individuell beantwortet.",
      recommendationIds: ["review-response"],
    },
  ]),
  ...criteriaFor("lokale_auffindbarkeit", [
    {
      key: "local_relevanz",
      label: "Lokale Relevanz",
      description: "Leistungen, Standort und Einzugsgebiet sind auf Profil und Website klar verknüpft.",
      recommendationIds: ["geo-check"],
    },
    {
      key: "local_wettbewerb",
      label: "Wettbewerbsposition",
      description: "Stärken und Lücken gegenüber den wichtigsten lokalen Mitbewerbern sind bekannt.",
      recommendationIds: ["konkurrenzanalyse"],
    },
  ]),
  ...criteriaFor("inhalte_bilder", [
    {
      key: "content_aktuell",
      label: "Aktuelle Beiträge",
      description: "Profil und Website zeigen regelmäßig relevante Neuigkeiten, Angebote oder Einblicke.",
      recommendationIds: ["extra-posts", "growth"],
    },
    {
      key: "bilder_qualitaet",
      label: "Aussagekräftige Bilder",
      description: "Aktuelle, glaubwürdige Fotos zeigen Team, Ort, Leistung und Atmosphäre.",
      recommendationIds: ["foto-briefing"],
    },
  ]),
  ...criteriaFor("vertrauen_kontakt", [
    {
      key: "trust_signale",
      label: "Vertrauenssignale",
      description: "Referenzen, Qualifikationen, echte Einblicke und klare Verantwortliche sind sichtbar.",
      recommendationIds: ["landingpage"],
    },
    {
      key: "kontakt_wege",
      label: "Kontakt ohne Umweg",
      description: "Telefon, Route, Anfrage und Termin sind auf allen Geräten schnell erreichbar.",
      recommendationIds: ["landingpage", "starter"],
    },
  ]),
];

export function auditBand(score: number): AuditBand {
  if (score <= SCORE_BAND_THRESHOLDS.kritisch) return "kritisch";
  if (score <= SCORE_BAND_THRESHOLDS.verbesserungsbedarf) return "verbesserungsbedarf";
  if (score <= SCORE_BAND_THRESHOLDS.solide) return "solide";
  return "gut_aufgestellt";
}

/**
 * Score über das BEANTWORTETE Gewicht, nicht über alle zwölf Kriterien.
 *
 * Zählte Unbeantwortetes als 0, würde ein halbfertiges Audit dramatisch
 * untertreiben — genau der Grund, warum derselbe Betrieb im öffentlichen Check
 * 47 und im Dashboard 14 bekam. Sind alle zwölf beantwortet, ist das Ergebnis
 * identisch mit der alten Formel, weil die Gewichte exakt 100 ergeben.
 */
export function calculateAuditScore(answers: AuditAnswerInput[]): number {
  const ratings = new Map(answers.map((answer) => [answer.criterionKey, answer.rating]));
  let points = 0;
  let answeredWeight = 0;
  for (const criterion of auditCriteria) {
    const rating = ratings.get(criterion.key);
    if (rating === undefined) continue;
    points += criterion.weight * (rating / 3);
    answeredWeight += criterion.weight;
  }
  if (!answeredWeight) return 0;
  return Math.round((points / answeredWeight) * 100);
}

export function calculateAuditCategoryScores(answers: AuditAnswerInput[]): AuditCategoryScore[] {
  const ratings = new Map(answers.map((answer) => [answer.criterionKey, answer.rating]));
  return categories.map((category) => {
    const criteria = auditCriteria.filter((criterion) => criterion.category === category.key);
    const answeredCriteria = criteria.filter((criterion) => ratings.has(criterion.key));
    const contribution = answeredCriteria.reduce(
      (sum, criterion) => sum + criterion.weight * ((ratings.get(criterion.key) ?? 0) / 3),
      0,
    );
    const answeredWeight = answeredCriteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    const normalized = answeredWeight ? Math.round((contribution / answeredWeight) * 100) : 0;
    return {
      category: category.key,
      label: category.label,
      score: normalized,
      contribution: Math.round(contribution * 10) / 10,
      maximum: category.weight,
      answeredWeight: Math.round(answeredWeight * 10) / 10,
      answered: answeredCriteria.length,
      criteria: criteria.length,
      // Ohne Antwort gibt es kein Urteil — sonst stünde "kritisch" über einer leeren Menge.
      band: answeredWeight ? auditBand(normalized) : null,
    };
  });
}

export function priorityFromScore(score: number): LeadPriority {
  if (score <= 39) return "hoch";
  if (score <= 59) return "mittel";
  return "niedrig";
}

function catalogName(id: string) {
  return findOffer(id)?.name || findAddon(id)?.name || id;
}

export function recommendationsFromAnswers(answers: AuditAnswerInput[]): Recommendation[] {
  const answerMap = new Map(answers.map((answer) => [answer.criterionKey, answer.rating]));
  const collected = new Map<string, Recommendation>();

  for (const criterion of auditCriteria) {
    // Unbeantwortetes zählt nicht in den Score und darf deshalb auch keine
    // Empfehlung mit Priorität "hoch" erzeugen.
    if (!answerMap.has(criterion.key)) continue;
    const rating = answerMap.get(criterion.key) ?? 0;
    if (rating > 1) continue;

    for (const id of criterion.recommendationIds) {
      const priority: LeadPriority = rating === 0 ? "hoch" : "mittel";
      const existing = collected.get(id);
      const reason = criterion.label;
      collected.set(id, {
        catalogItemId: id,
        catalogItemName: catalogName(id),
        reason: existing ? `${existing.reason}; ${reason}` : reason,
        priority: existing?.priority === "hoch" ? "hoch" : priority,
        selected: true,
      });
    }
  }

  return [...collected.values()];
}

/**
 * Vorschläge für die drei Kriterien, die sich aus Google-Daten ableiten lassen.
 * Die Schwellen kommen aus dem gemeinsamen Modul, damit der öffentliche Check
 * und das interne Audit dieselben Daten nicht unterschiedlich bewerten.
 *
 * `kontakt_wege` bleibt bewusst manuell: es beschreibt die Kontaktwege auf der
 * Website, die Google nicht sehen kann — und würde dieselben drei Signale wie
 * `gbp_basisdaten` ein zweites Mal zählen.
 */
export function suggestedRatingsFromGoogle(snapshot: GooglePlaceSnapshot): Partial<Record<string, 0 | 1 | 2 | 3>> {
  const signals = toPlaceSignals(snapshot);
  return {
    gbp_basisdaten: contactBasicsLevel(signals),
    reviews_menge: reviewVolumeLevel(signals),
    bilder_qualitaet: photosLevel(signals),
  };
}
