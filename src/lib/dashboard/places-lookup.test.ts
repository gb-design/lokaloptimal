import { beforeEach, describe, expect, it, vi } from "vitest";

const getSecret = vi.fn();
const queryFromSubmittedUrl = vi.fn();
const searchPlace = vi.fn();
const getPlaceDetails = vi.fn();

vi.mock("astro:env/server", () => ({ getSecret }));
vi.mock("../../../api/places", () => ({
  queryFromSubmittedUrl,
  searchPlace,
  getPlaceDetails,
}));

const { POST } = await import("../../pages/api/internal/places/lookup");

function request(url = "https://maps.app.goo.gl/example") {
  return new Request("http://localhost/api/internal/places/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

describe("internal places lookup environment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryFromSubmittedUrl.mockResolvedValue({ name: "Café Blau", lat: 48.2, lng: 16.3 });
    searchPlace.mockResolvedValue({ place_id: "place-1", name: "Café Blau" });
    getPlaceDetails.mockResolvedValue({ name: "Café Blau", rating: 4.8 });
  });

  it("uses Astro's server-only secret accessor for a configured key", async () => {
    getSecret.mockReturnValue(" server-secret ");

    const response = await POST({ request: request() } as never);

    expect(response.status).toBe(200);
    expect(searchPlace).toHaveBeenCalledWith("server-secret", "Café Blau", 48.2, 16.3);
    expect(await response.json()).toMatchObject({
      found: { place_id: "place-1" },
      details: { rating: 4.8 },
    });
  });

  it("returns a precise setup error only when the secret is truly absent", async () => {
    getSecret.mockReturnValue(undefined);

    const response = await POST({ request: request() } as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Der Google Places API-Schlüssel ist noch nicht konfiguriert.",
    });
    expect(searchPlace).not.toHaveBeenCalled();
  });
});
