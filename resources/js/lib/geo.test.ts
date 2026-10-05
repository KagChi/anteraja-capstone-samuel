import { describe, expect, it } from "vitest";
import { formatMeters, haversineMeters } from "./geo";

describe("haversineMeters", () => {
  it("returns zero for the same point", () => {
    expect(haversineMeters(-6.2418, 106.7993, -6.2418, 106.7993)).toBe(0);
  });

  it("matches a known short distance (~111 m per 0.001 degree of latitude)", () => {
    const distance = haversineMeters(-6.2418, 106.7993, -6.2428, 106.7993);

    expect(distance).toBeGreaterThan(105);
    expect(distance).toBeLessThan(118);
  });
});

describe("formatMeters", () => {
  it("keeps metres below one kilometre", () => {
    expect(formatMeters(28)).toBe("28 m");
  });

  it("switches to kilometres with a comma decimal", () => {
    expect(formatMeters(1450)).toBe("1,5 km");
    expect(formatMeters(2000)).toBe("2 km");
  });
});
