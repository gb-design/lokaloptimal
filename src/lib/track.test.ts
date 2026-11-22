import { afterEach, describe, expect, it, vi } from "vitest";
import { isCalBookingMessage, scoreBand, track } from "./track";

describe("track", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("übergibt Name und Parameter an gtag", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    track("booking_click", { position: "hero" });

    expect(gtag).toHaveBeenCalledWith("event", "booking_click", { position: "hero" });
  });

  it("wirft nicht, wenn gtag fehlt", () => {
    vi.stubGlobal("window", {});
    expect(() => track("generate_lead", { form: "kontakt" })).not.toThrow();
  });

  it("wirft nicht ohne window (Server-Rendering)", () => {
    vi.stubGlobal("window", undefined);
    expect(() => track("gbp_check_complete")).not.toThrow();
  });

  it("schluckt Fehler aus gtag, damit Formulare weiterlaufen", () => {
    vi.stubGlobal("window", {
      gtag: () => {
        throw new Error("kaputt");
      },
    });
    expect(() => track("booking_complete")).not.toThrow();
  });
});

describe("isCalBookingMessage", () => {
  const booking = { originator: "CAL", type: "bookingSuccessfulV2", namespace: "true", data: {} };

  it("erkennt eine erfolgreiche Buchung von cal.com", () => {
    expect(isCalBookingMessage("https://cal.com", booking)).toBe(true);
    expect(isCalBookingMessage("https://cal.com", { ...booking, type: "bookingSuccessful" })).toBe(true);
  });

  it("erkennt die Nachricht auch als JSON-Text", () => {
    expect(isCalBookingMessage("https://cal.com", JSON.stringify(booking))).toBe(true);
  });

  it("ignoriert andere Cal-Ereignisse", () => {
    expect(isCalBookingMessage("https://cal.com", { ...booking, type: "availabilityLoaded" })).toBe(false);
  });

  it("ignoriert fremde Herkunft, auch mit passendem Inhalt", () => {
    expect(isCalBookingMessage("https://evil.example", booking)).toBe(false);
    expect(isCalBookingMessage("https://cal.com.evil.example", booking)).toBe(false);
  });

  it("ignoriert Nachrichten ohne Cal-Kennung und kaputtes JSON", () => {
    expect(isCalBookingMessage("https://cal.com", { type: "bookingSuccessful" })).toBe(false);
    expect(isCalBookingMessage("https://cal.com", "{kein json")).toBe(false);
    expect(isCalBookingMessage("https://cal.com", null)).toBe(false);
  });
});

describe("scoreBand", () => {
  it("übersetzt die Ampel des Checks in eine grobe Stufe", () => {
    expect(scoreBand("bad")).toBe("niedrig");
    expect(scoreBand("warn")).toBe("mittel");
    expect(scoreBand("good")).toBe("hoch");
  });
});
