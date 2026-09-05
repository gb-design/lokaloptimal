import { describe, expect, it } from "vitest";
import { classifyAuditResponse } from "./audit-response";

describe("classifyAuditResponse", () => {
  it("passes a complete answer through as a result", () => {
    expect(classifyAuditResponse(200, { found: { name: "Café Blau" }, details: { rating: 4.8 } })).toEqual({
      kind: "results",
      found: { name: "Café Blau" },
      details: { rating: 4.8 },
    });
  });

  it("separates an unindexed profile from an outage", () => {
    expect(classifyAuditResponse(404, { error: "PLACE_NOT_FOUND" })).toEqual({ kind: "not-found" });
  });

  it("still reads a 404 as unindexed when a proxy replaced the body", () => {
    expect(classifyAuditResponse(404, { error: "Not Found" })).toEqual({ kind: "not-found" });
  });

  it("reports an unusable link separately so the input can be corrected", () => {
    expect(classifyAuditResponse(400, { error: "INVALID_GOOGLE_MAPS_URL" })).toEqual({ kind: "invalid-url" });
    expect(classifyAuditResponse(422, { error: "INVALID_GOOGLE_MAPS_URL" })).toEqual({ kind: "invalid-url" });
  });

  it("reports the daily limit", () => {
    expect(classifyAuditResponse(429, { error: "RATE_LIMITED" })).toEqual({ kind: "rate-limited" });
  });

  it("treats a server error, a missing body and an empty result as a failure", () => {
    expect(classifyAuditResponse(500, { error: "Internal server error." })).toEqual({ kind: "failed" });
    expect(classifyAuditResponse(200, null)).toEqual({ kind: "failed" });
    expect(classifyAuditResponse(200, { found: { name: "Café Blau" } })).toEqual({ kind: "failed" });
  });

  it("does not mistake a 400 without the known code for a link problem", () => {
    expect(classifyAuditResponse(400, { error: "Missing url parameter." })).toEqual({ kind: "failed" });
  });
});
