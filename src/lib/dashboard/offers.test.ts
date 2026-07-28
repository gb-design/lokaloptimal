import { describe, expect, it } from "vitest";
import { buildOfferItems, calculateOfferTotals, offerNumber } from "./offers";

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
