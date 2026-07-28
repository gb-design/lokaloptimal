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
    expect(suggestions.gbp_basisdaten).toBe(2);
    expect(suggestions.reviews_menge).toBe(3);
    expect(suggestions.bilder_qualitaet).toBe(3);
    expect(suggestions.website_angebot).toBeUndefined();
  });
});
