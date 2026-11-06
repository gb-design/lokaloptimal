import { describe, expect, it } from "vitest";
import {
  extractMapsLink,
  isAllowedGoogleMapsUrl,
  isDirectGoogleMapsUrl,
  MAX_MAPS_LINK_LENGTH,
  mapsLinkErrorMessage,
} from "./maps-link";

describe("isAllowedGoogleMapsUrl", () => {
  it.each([
    "https://www.google.com/maps/place/Beispiel",
    "https://google.com/maps/place/Beispiel",
    "https://maps.google.com/maps/place/Beispiel",
    "https://www.google.at/maps/place/Beispiel",
    "https://google.at/maps/place/Beispiel",
    "https://www.google.de/maps/place/Beispiel",
    "https://www.google.ch/maps/place/Beispiel",
    "https://maps.app.goo.gl/abc123",
    "https://goo.gl/maps/abc123",
  ])("akzeptiert %s", (link) => {
    expect(isAllowedGoogleMapsUrl(link)).toBe(true);
  });

  it.each([
    "",
    "kein Link",
    "http://www.google.at/maps/place/Beispiel",
    "https://www.google.at/search?q=Beispiel",
    "https://google.at.evil.com/maps/place/Beispiel",
    "https://evil.com/www.google.at/maps/place/Beispiel",
    "https://maps.google.evil.com/maps/place/Beispiel",
    "https://www.google.fr/maps/place/Beispiel",
    "https://maps.app.goo.gl/",
    "https://goo.gl/abc123",
    "https://share.google/abc123",
    "https://g.co/kgs/abc123",
  ])("lehnt %s ab", (link) => {
    expect(isAllowedGoogleMapsUrl(link)).toBe(false);
  });

  it("lehnt zu lange Links ab", () => {
    const link = `https://www.google.at/maps/place/${"a".repeat(MAX_MAPS_LINK_LENGTH)}`;
    expect(isAllowedGoogleMapsUrl(link)).toBe(false);
  });
});

describe("isDirectGoogleMapsUrl", () => {
  it("behandelt Kurzlinks nicht als direkt, weil der Server sie erst auflösen muss", () => {
    expect(isDirectGoogleMapsUrl("https://www.google.at/maps/place/Beispiel")).toBe(true);
    expect(isDirectGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe(false);
  });
});

describe("extractMapsLink", () => {
  it("übernimmt nur die URL aus geteiltem Text", () => {
    expect(extractMapsLink("Salon Beispiel, Wien\nhttps://maps.app.goo.gl/abc123")).toBe("https://maps.app.goo.gl/abc123");
  });

  it("entfernt Satzzeichen am Ende", () => {
    expect(extractMapsLink("Hier: https://maps.app.goo.gl/abc123.")).toBe("https://maps.app.goo.gl/abc123");
  });

  it("gibt Text ohne URL unverändert zurück", () => {
    expect(extractMapsLink("  Salon Beispiel ")).toBe("Salon Beispiel");
  });
});

describe("mapsLinkErrorMessage", () => {
  it("erklärt Links aus der Google-Suche gezielt", () => {
    expect(mapsLinkErrorMessage("https://share.google/abc123")).toContain("Google-Suche");
  });

  it("nennt sonst den Weg über Google Maps", () => {
    expect(mapsLinkErrorMessage("Salon Beispiel")).toContain("Google Maps");
  });
});
