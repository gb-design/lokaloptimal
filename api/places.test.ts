import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlaceDetails, PLACE_NOT_FOUND, queryFromSubmittedUrl, searchPlace } from "./places";

/** Echter Teilen-Link: Kartenmitte (@) und Profil-Pin (!3d/!4d) liegen ~5,7 km auseinander. */
const PROFILE_URL =
  "https://www.google.com/maps/place/george%26burn+Design+Co./@48.2082464,16.3027285,16.27z/data=!4m6!3m5!1s0x67d10451c9605c65:0xd92b6166a1214452!8m2!3d48.2202331!4d16.3796424!16s%2Fg%2F11n9w4lp5t?entry=ttu";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("queryFromSubmittedUrl", () => {
  it("decodes the business name out of the place segment", async () => {
    await expect(queryFromSubmittedUrl(PROFILE_URL)).resolves.toMatchObject({
      name: "george&burn Design Co.",
    });
  });

  it("prefers the profile pin over the map viewport centre", async () => {
    await expect(queryFromSubmittedUrl(PROFILE_URL)).resolves.toMatchObject({
      lat: "48.2202331",
      lng: "16.3796424",
    });
  });

  it("falls back to the viewport centre when the link carries no pin", async () => {
    await expect(
      queryFromSubmittedUrl("https://www.google.com/maps/place/Caf%C3%A9+Blau/@48.21,16.37,17z"),
    ).resolves.toMatchObject({ lat: "48.21", lng: "16.37" });
  });
});

describe("searchPlace", () => {
  it("raises a stable machine code when Google indexes no matching place", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));

    await expect(searchPlace("key", "george&burn Design Co.")).rejects.toMatchObject({
      message: PLACE_NOT_FOUND,
      status: 404,
    });
  });
});

describe("getPlaceDetails", () => {
  it("does not leak Google's upstream error text to the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { message: "The provided Place ID is not valid." } }, 400)),
    );

    await expect(getPlaceDetails("key", "place-1")).rejects.toMatchObject({
      message: PLACE_NOT_FOUND,
      status: 404,
    });
  });
});
