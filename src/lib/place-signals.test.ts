import { describe, expect, it } from "vitest";
import {
  contactBasicsLevel,
  photosLevel,
  reviewQualityLevel,
  reviewVolumeLevel,
  scorePlaceSignals,
  toPlaceSignals,
  type PlaceSignals,
} from "./place-signals";

function signals(overrides: Partial<PlaceSignals> = {}): PlaceSignals {
  return {
    phone: false,
    website: false,
    hasOpeningHours: false,
    hasDescription: false,
    rating: 0,
    reviewCount: 0,
    photosCount: 0,
    ...overrides,
  };
}

describe("toPlaceSignals", () => {
  it("vereinheitlicht leere Zeichenketten, null und false zu false", () => {
    expect(toPlaceSignals({ phone: "", website: null, has_opening_hours: null })).toMatchObject({
      phone: false,
      website: false,
      hasOpeningHours: false,
    });
  });

  it("akzeptiert sowohl Zeichenketten als auch Booleans als Vorhandensein", () => {
    expect(toPlaceSignals({ phone: "+43 1 234", website: true })).toMatchObject({
      phone: true,
      website: true,
    });
  });

  it("macht aus fehlenden Zahlen eine Null statt NaN", () => {
    const result = toPlaceSignals({});
    expect(result.rating).toBe(0);
    expect(result.reviewCount).toBe(0);
    expect(result.photosCount).toBe(0);
  });
});

describe("contactBasicsLevel", () => {
  it("zählt Telefon, Website und Öffnungszeiten", () => {
    expect(contactBasicsLevel(signals())).toBe(0);
    expect(contactBasicsLevel(signals({ phone: true }))).toBe(1);
    expect(contactBasicsLevel(signals({ phone: true, hasOpeningHours: true }))).toBe(2);
    expect(contactBasicsLevel(signals({ phone: true, website: true, hasOpeningHours: true }))).toBe(3);
  });

  it("bewertet die Google-Beschreibung nicht mit", () => {
    expect(contactBasicsLevel(signals({ hasDescription: true }))).toBe(0);
    expect(
      contactBasicsLevel(signals({ phone: true, website: true, hasOpeningHours: true, hasDescription: false })),
    ).toBe(3);
  });
});

describe("reviewVolumeLevel", () => {
  it("hält die Grenzen bei 5, 15 und 40 ein", () => {
    expect(reviewVolumeLevel(signals({ reviewCount: 4 }))).toBe(0);
    expect(reviewVolumeLevel(signals({ reviewCount: 5 }))).toBe(1);
    expect(reviewVolumeLevel(signals({ reviewCount: 14 }))).toBe(1);
    expect(reviewVolumeLevel(signals({ reviewCount: 15 }))).toBe(2);
    expect(reviewVolumeLevel(signals({ reviewCount: 39 }))).toBe(2);
    expect(reviewVolumeLevel(signals({ reviewCount: 40 }))).toBe(3);
  });
});

describe("reviewQualityLevel", () => {
  it("hält die Sterne-Grenzen bei 3,5, 4,0 und 4,5 ein", () => {
    const many = { reviewCount: 50 };
    expect(reviewQualityLevel(signals({ ...many, rating: 3.4 }))).toBe(0);
    expect(reviewQualityLevel(signals({ ...many, rating: 3.5 }))).toBe(1);
    expect(reviewQualityLevel(signals({ ...many, rating: 3.9 }))).toBe(1);
    expect(reviewQualityLevel(signals({ ...many, rating: 4.0 }))).toBe(2);
    expect(reviewQualityLevel(signals({ ...many, rating: 4.4 }))).toBe(2);
    expect(reviewQualityLevel(signals({ ...many, rating: 4.5 }))).toBe(3);
  });

  it("deckelt den Schnitt bei wenigen Bewertungen auf Stufe 2", () => {
    expect(reviewQualityLevel(signals({ reviewCount: 1, rating: 5 }))).toBe(2);
    expect(reviewQualityLevel(signals({ reviewCount: 4, rating: 5 }))).toBe(2);
    expect(reviewQualityLevel(signals({ reviewCount: 5, rating: 5 }))).toBe(3);
  });

  it("gibt ohne Bewertungen Stufe 0 zurück", () => {
    expect(reviewQualityLevel(signals({ reviewCount: 0, rating: 0 }))).toBe(0);
  });
});

describe("photosLevel", () => {
  it("hält die Grenzen bei 1, 5 und 10 ein", () => {
    expect(photosLevel(signals({ photosCount: 0 }))).toBe(0);
    expect(photosLevel(signals({ photosCount: 1 }))).toBe(1);
    expect(photosLevel(signals({ photosCount: 4 }))).toBe(1);
    expect(photosLevel(signals({ photosCount: 5 }))).toBe(2);
    expect(photosLevel(signals({ photosCount: 9 }))).toBe(2);
    expect(photosLevel(signals({ photosCount: 10 }))).toBe(3);
  });
});

describe("scorePlaceSignals", () => {
  it("erreicht ohne jedes Signal null Punkte statt eines Sockels", () => {
    expect(scorePlaceSignals(signals()).score).toBe(0);
  });

  it("erreicht mit allen Signalen volle 100 Punkte", () => {
    const perfect = signals({
      phone: true,
      website: true,
      hasOpeningHours: true,
      rating: 4.8,
      reviewCount: 120,
      photosCount: 10,
    });
    expect(scorePlaceSignals(perfect).score).toBe(100);
  });

  it("rechnet den Beispielbetrieb ohne Website auf 50", () => {
    // Martina Skrobar: Telefon und Öffnungszeiten vorhanden, keine Website,
    // 8 Bewertungen mit 4,2 Sternen, 2 Fotos.
    const example = signals({
      phone: true,
      website: false,
      hasOpeningHours: true,
      rating: 4.2,
      reviewCount: 8,
      photosCount: 2,
    });
    expect(scorePlaceSignals(example).score).toBe(50);
  });

  it("zählt jedes Signal genau einmal", () => {
    const keys = scorePlaceSignals(signals()).rows.map((row) => row.key);
    expect(keys).toEqual(["kontakt", "bewertungen_menge", "bewertungen_qualitaet", "fotos"]);
    expect(scorePlaceSignals(signals()).rows.reduce((sum, row) => sum + row.weight, 0)).toBe(100);
  });
});
