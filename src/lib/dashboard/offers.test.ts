import { describe, expect, it } from "vitest";
import { buildOfferItems, calculateOfferTotals, offerNumber, selectionFromItems } from "./offers";

describe("Offer snapshots", () => {
  it("copies package and add-on prices into stable line items", () => {
    const items = buildOfferItems("starter", ["landingpage"]);
    expect(items.map((item) => item.catalogItemId)).toEqual(["starter", "landingpage"]);
    expect(items[0]).toMatchObject({ name: "Starter", unitPrice: 347, interval: "einmalig" });
    expect(calculateOfferTotals(items)).toEqual({ once: 1544, monthly: 0 });
  });

  it("adds the required quick check to monthly retainers", () => {
    const items = buildOfferItems("care", []);
    expect(items.map((item) => item.catalogItemId)).toEqual(["care", "quick-check"]);
    expect(calculateOfferTotals(items)).toEqual({ once: 147, monthly: 399 });
  });

  it("does not add included or duplicate add-ons twice", () => {
    const items = buildOfferItems("growth", ["review-response", "review-response", "landingpage"]);
    expect(items.filter((item) => item.catalogItemId === "review-response")).toHaveLength(0);
    expect(items.filter((item) => item.catalogItemId === "landingpage")).toHaveLength(1);
  });

  it("requires at least one line item", () => {
    expect(() => buildOfferItems(null, [])).toThrow("mindestens eine Leistung");
  });

  it("preserves on-request price labels instead of rendering zero euros", () => {
    const items = buildOfferItems(null, ["qr-review-trigger"]);
    expect(items[0]).toMatchObject({ unitPrice: 0, priceLabel: "auf Anfrage" });
  });

  it("formats deterministic offer numbers", () => {
    expect(offerNumber(27, new Date("2026-07-28T10:00:00Z"))).toBe("LO-2026-0027");
  });
});

describe("Katalogauswahl aus gespeicherten Positionen", () => {
  const asRows = (items: ReturnType<typeof buildOfferItems>) =>
    items.map((item) => ({ catalog_item_id: item.catalogItemId }));

  it("erkennt Basispaket und gewählte Ergänzungen", () => {
    expect(selectionFromItems(asRows(buildOfferItems("starter", ["landingpage"])))).toEqual({
      offerId: "starter",
      addonIds: ["landingpage"],
    });
  });

  it("gibt den automatisch ergänzten Quick-Check nicht als gewählte Ergänzung zurück", () => {
    // Sonst würde die Auswahl bei jedem Speichern um eine Position wachsen.
    expect(selectionFromItems(asRows(buildOfferItems("care", [])))).toEqual({
      offerId: "care",
      addonIds: [],
    });
  });

  it("kommt mit einem Angebot ohne Basispaket zurecht", () => {
    expect(selectionFromItems(asRows(buildOfferItems(null, ["qr-review-trigger"])))).toEqual({
      offerId: null,
      addonIds: ["qr-review-trigger"],
    });
  });

  it("bleibt über Speichern und erneutes Bearbeiten stabil", () => {
    const cases: Array<[string | null, string[]]> = [
      ["starter", ["landingpage"]],
      ["care", []],
      ["growth", ["landingpage"]],
      [null, ["qr-review-trigger", "geo-check"]],
    ];
    for (const [offerId, addonIds] of cases) {
      const first = buildOfferItems(offerId, addonIds);
      const selection = selectionFromItems(asRows(first));
      const second = buildOfferItems(selection.offerId, selection.addonIds);
      expect(second.map((item) => item.catalogItemId)).toEqual(first.map((item) => item.catalogItemId));
    }
  });
});
