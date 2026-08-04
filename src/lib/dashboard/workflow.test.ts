import { describe, expect, it } from "vitest";
import {
  canArchiveOffer,
  canConvertOfferToProject,
  canDeleteOffer,
  canEditOffer,
  canTransitionOffer,
  leadStatusRequiresFollowUp,
} from "./workflow";

describe("Workflow rules", () => {
  it("requires follow-up data for active lead stages", () => {
    expect(leadStatusRequiresFollowUp("kontaktiert")).toBe(true);
    expect(leadStatusRequiresFollowUp("angebot")).toBe(true);
    expect(leadStatusRequiresFollowUp("neu")).toBe(false);
    expect(leadStatusRequiresFollowUp("gewonnen")).toBe(false);
  });

  it("locks sent offers to terminal decisions", () => {
    expect(canTransitionOffer("erstellt", "versendet")).toBe(true);
    expect(canTransitionOffer("versendet", "angenommen")).toBe(true);
    expect(canTransitionOffer("versendet", "entwurf")).toBe(false);
    expect(canTransitionOffer("angenommen", "entwurf")).toBe(false);
  });

  it("only converts accepted offers", () => {
    expect(canConvertOfferToProject("angenommen")).toBe(true);
    expect(canConvertOfferToProject("versendet")).toBe(false);
  });

  it("erlaubt Änderungen nur vor dem Versand", () => {
    expect(canEditOffer("entwurf")).toBe(true);
    expect(canEditOffer("erstellt")).toBe(true);
    expect(canEditOffer("versendet")).toBe(false);
    expect(canEditOffer("angenommen")).toBe(false);
    expect(canEditOffer("abgelehnt")).toBe(false);
  });

  it("archiviert nur, was den Kunden schon erreicht hat", () => {
    expect(canArchiveOffer("versendet")).toBe(true);
    expect(canArchiveOffer("abgelehnt")).toBe(true);
    expect(canArchiveOffer("abgelaufen")).toBe(true);
    expect(canArchiveOffer("entwurf")).toBe(false);
    expect(canArchiveOffer("erstellt")).toBe(false);
  });

  it("löscht nie versendete Angebote direkt, versendete erst aus dem Archiv", () => {
    expect(canDeleteOffer("entwurf", false, null)).toBe(true);
    expect(canDeleteOffer("erstellt", false, null)).toBe(true);
    expect(canDeleteOffer("abgelehnt", false, null)).toBe(false);
    expect(canDeleteOffer("abgelehnt", false, "2026-08-05T10:00:00Z")).toBe(true);
    expect(canDeleteOffer("versendet", false, "2026-08-05T10:00:00Z")).toBe(true);
  });

  it("sperrt das Löschen, solange ein Projekt am Angebot hängt", () => {
    expect(canDeleteOffer("entwurf", true, null)).toBe(false);
    expect(canDeleteOffer("angenommen", true, "2026-08-05T10:00:00Z")).toBe(false);
  });
});
