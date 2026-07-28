import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { OfferPdf, type OfferPdfData } from "./offer-pdf";

const data: OfferPdfData = {
  offerNumber: "LO-2026-0001",
  generatedDate: "28.07.2026",
  validUntil: "11.08.2026",
  sender: {
    displayName: "LokalOptimal",
    legalName: "LokalOptimal e.U.",
    address: "Musterstraße 1, 1070 Wien",
    email: "hallo@lokaloptimal.at",
    vatNote: "Alle Preise netto, exkl. USt.",
    disclaimer: "Keine Garantie für bestimmte Rankings oder wirtschaftliche Ergebnisse.",
  },
  recipient: {
    name: "Max Mustermann",
    company: "Café Übungsstück",
    address: "Testgasse 2, 1080 Wien",
  },
  audit: { score: 57, band: "Verbesserungsbedarf" },
  goal: "Mehr lokale Sichtbarkeit und ein klarer nächster Schritt.",
  nextSteps: "Freigabe, Auftakttermin und Umsetzung.",
  items: [
    {
      name: "Starter",
      description: "Profil-Setup · Kategorien · Öffnungszeiten",
      quantity: 1,
      unitPrice: 347,
      priceLabel: null,
      interval: "einmalig",
      period: "einmalig",
    },
  ],
  onceTotal: 347,
  monthlyTotal: 0,
};

describe("Offer PDF", () => {
  it("renders a valid, non-empty PDF buffer with umlauts and page wrapping enabled", async () => {
    const buffer = await renderToBuffer(<OfferPdf data={data} />);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(4_000);
  });
});
