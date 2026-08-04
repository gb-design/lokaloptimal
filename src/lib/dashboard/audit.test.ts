import { describe, expect, it } from "vitest";
import {
  auditBand,
  auditCriteria,
  calculateAuditCategoryScores,
  calculateAuditScore,
  priorityFromScore,
  recommendationsFromAnswers,
  suggestedRatingsFromGoogle,
} from "./audit";
import { scorePlaceSignals, toPlaceSignals } from "../place-signals";
import type { AuditAnswerInput, GooglePlaceSnapshot } from "./types";

describe("Audit scoring", () => {
  it("normalizes all criteria to a 0–100 score", () => {
    const perfect = auditCriteria.map((criterion) => ({
      criterionKey: criterion.key,
      rating: 3 as const,
    }));
    const empty = auditCriteria.map((criterion) => ({
      criterionKey: criterion.key,
      rating: 0 as const,
    }));
    expect(calculateAuditScore(perfect)).toBe(100);
    expect(calculateAuditScore(empty)).toBe(0);
  });

  it("calculates transparent category contributions", () => {
    const answers = auditCriteria.map((criterion) => ({
      criterionKey: criterion.key,
      rating: (criterion.category === "google_profil" ? 3 : 0) as 0 | 3,
    }));
    const categories = calculateAuditCategoryScores(answers);
    const google = categories.find((category) => category.category === "google_profil");
    const website = categories.find((category) => category.category === "website");
    expect(google).toMatchObject({ score: 100, contribution: 25, maximum: 25, answered: 2 });
    expect(website).toMatchObject({ score: 0, contribution: 0, maximum: 20, answered: 2 });
  });

  it("uses the four agreed score bands", () => {
    expect(auditBand(0)).toBe("kritisch");
    expect(auditBand(39)).toBe("kritisch");
    expect(auditBand(40)).toBe("verbesserungsbedarf");
    expect(auditBand(59)).toBe("verbesserungsbedarf");
    expect(auditBand(60)).toBe("solide");
    expect(auditBand(79)).toBe("solide");
    expect(auditBand(80)).toBe("gut_aufgestellt");
    expect(auditBand(100)).toBe("gut_aufgestellt");
  });

  it("derives lead priority from the score", () => {
    expect(priorityFromScore(28)).toBe("hoch");
    expect(priorityFromScore(52)).toBe("mittel");
    expect(priorityFromScore(76)).toBe("niedrig");
  });

  it("deduplicates recommendations and keeps the strongest priority", () => {
    const answers = auditCriteria.map((criterion) => ({
      criterionKey: criterion.key,
      rating: (criterion.recommendationIds.includes("landingpage") ? 0 : 3) as 0 | 3,
    }));
    const recommendations = recommendationsFromAnswers(answers);
    const landingpage = recommendations.find((entry) => entry.catalogItemId === "landingpage");
    expect(recommendations.filter((entry) => entry.catalogItemId === "landingpage")).toHaveLength(1);
    expect(landingpage?.priority).toBe("hoch");
    expect(landingpage?.reason).toContain("Angebot sofort verständlich");
  });

  it("prefills only signals available from Google Places", () => {
    const suggestions = suggestedRatingsFromGoogle({
      phone: true,
      website: true,
      has_opening_hours: true,
      has_description: false,
      rating: 4.7,
      review_count: 55,
      photos_count: 12,
    });
    // Telefon, Website und Öffnungszeiten sind vorhanden; die Google-Beschreibung
    // geht seit der Angleichung an den öffentlichen Check nicht mehr ein.
    expect(suggestions.gbp_basisdaten).toBe(3);
    expect(suggestions.reviews_menge).toBe(3);
    expect(suggestions.bilder_qualitaet).toBe(3);
    expect(suggestions.website_angebot).toBeUndefined();
    expect(suggestions.kontakt_wege).toBeUndefined();
  });
});

describe("Teilweise beantwortete Audits", () => {
  const answered = (keys: string[], rating: 0 | 1 | 2 | 3) =>
    keys.map((criterionKey) => ({ criterionKey, rating }));

  it("rechnet nur über die beantworteten Kriterien statt Unbeantwortetes als Null zu werten", () => {
    expect(calculateAuditScore(answered(["gbp_basisdaten"], 3))).toBe(100);
    expect(calculateAuditScore(answered(["gbp_basisdaten", "reviews_menge"], 2))).toBe(67);
  });

  it("gibt ohne jede Antwort Null zurück statt NaN", () => {
    expect(calculateAuditScore([])).toBe(0);
  });

  it("liefert bei allen zwölf Antworten exakt das Ergebnis der alten Formel", () => {
    // Die Kriteriengewichte summieren sich auf 100, deshalb ist der neue Nenner
    // bei vollständiger Beantwortung identisch. Das ist die Garantie, dass
    // gespeicherte abgeschlossene Audits keine Migration brauchen.
    const mixed = auditCriteria.map((criterion, index) => ({
      criterionKey: criterion.key,
      rating: (index % 4) as 0 | 1 | 2 | 3,
    }));
    const legacy = Math.round(
      auditCriteria.reduce((sum, criterion, index) => sum + criterion.weight * ((index % 4) / 3), 0),
    );
    expect(calculateAuditScore(mixed)).toBe(legacy);
  });

  it("misst Kategorien am beantworteten Gewicht und urteilt nicht über Unbeantwortetes", () => {
    const categories = calculateAuditCategoryScores(answered(["gbp_basisdaten"], 3));
    const google = categories.find((category) => category.category === "google_profil");
    const website = categories.find((category) => category.category === "website");
    expect(google).toMatchObject({ score: 100, answered: 1, answeredWeight: 12.5, maximum: 25 });
    expect(website).toMatchObject({ score: 0, answered: 0, answeredWeight: 0, band: null });
  });

  it("leitet aus unbeantworteten Kriterien keine Empfehlungen ab", () => {
    expect(recommendationsFromAnswers([])).toEqual([]);
    const partial = recommendationsFromAnswers(answered(["website_angebot"], 0));
    expect(partial.every((entry) => entry.reason === "Angebot sofort verständlich")).toBe(true);
  });
});

describe("Öffentlicher Check und interner Audit-Start", () => {
  /** Der Startwert des Audits, direkt nachdem die Google-Daten geladen wurden. */
  function dashboardStartScore(snapshot: GooglePlaceSnapshot) {
    const answers = Object.entries(suggestedRatingsFromGoogle(snapshot))
      .filter((entry): entry is [string, 0 | 1 | 2 | 3] => entry[1] !== undefined)
      .map(([criterionKey, rating]) => ({ criterionKey, rating })) as AuditAnswerInput[];
    return calculateAuditScore(answers);
  }

  const fixtures: Array<{ name: string; snapshot: GooglePlaceSnapshot }> = [
    {
      name: "Kosmetikstudio ohne Website",
      snapshot: { phone: true, website: false, has_opening_hours: true, rating: 4.2, review_count: 8, photos_count: 2 },
    },
    {
      name: "gepflegtes Profil",
      snapshot: { phone: true, website: true, has_opening_hours: true, rating: 4.1, review_count: 20, photos_count: 6 },
    },
    {
      name: "Vorzeigebetrieb",
      snapshot: { phone: true, website: true, has_opening_hours: true, rating: 4.7, review_count: 60, photos_count: 12 },
    },
    {
      name: "verwaistes Profil",
      snapshot: { phone: false, website: false, has_opening_hours: false, rating: 0, review_count: 0, photos_count: 0 },
    },
  ];

  // Genau diese Prüfung hätte die Differenz von 47 zu 14 aufgedeckt.
  it.each(fixtures)("liegt bei $name nicht mehr als 10 Punkte auseinander", ({ snapshot }) => {
    const widget = scorePlaceSignals(toPlaceSignals(snapshot)).score;
    const dashboard = dashboardStartScore(snapshot);
    expect(Math.abs(widget - dashboard)).toBeLessThanOrEqual(10);
  });

  it("rechnet den Beispielbetrieb auf 50 im Widget und 48 im Audit", () => {
    const snapshot = fixtures[0].snapshot;
    expect(scorePlaceSignals(toPlaceSignals(snapshot)).score).toBe(50);
    expect(dashboardStartScore(snapshot)).toBe(48);
  });
});
