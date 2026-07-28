import { describe, expect, it } from "vitest";
import { canConvertOfferToProject, canTransitionOffer, leadStatusRequiresFollowUp } from "./workflow";

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
});
