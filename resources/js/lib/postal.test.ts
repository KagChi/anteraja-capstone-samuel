import { describe, expect, it } from "vitest";
import { districtFromAddress } from "./postal";

describe("districtFromAddress", () => {
  it("picks the district before the city", () => {
    expect(
      districtFromAddress(
        "Jl. Senopati No. 12, Kebayoran Baru, Jakarta Selatan",
      ),
    ).toBe("Kebayoran Baru");
  });

  it("skips city names and postal codes", () => {
    expect(
      districtFromAddress(
        "Grha Pengharapan 2nd Fl, Jl. Denpasar Raya No.2 Blok F3, RT.16/RW.4, Kuningan, East Kuningan, Setiabudi, South Jakarta City, Jakarta 12950",
      ),
    ).toBe("Setiabudi");
  });

  it("returns a segment even when everything looks like a city", () => {
    expect(districtFromAddress("Jakarta Selatan")).toBe("Jakarta Selatan");
  });

  it("returns an empty string without an address", () => {
    expect(districtFromAddress(null)).toBe("");
  });
});
