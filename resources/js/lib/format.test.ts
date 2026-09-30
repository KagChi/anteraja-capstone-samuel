import { describe, expect, it } from "vitest";
import {
  clamp,
  formatClock,
  initialOf,
  pad2,
  randomDigits,
  titleCase,
} from "./format";

describe("clamp", () => {
  it("keeps values inside the bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("pad2", () => {
  it("pads single digits", () => {
    expect(pad2(4)).toBe("04");
    expect(pad2(12)).toBe("12");
  });
});

describe("formatClock", () => {
  it("renders 24h HH:MM", () => {
    expect(formatClock(new Date(2026, 0, 2, 9, 5))).toBe("09:05");
  });
});

describe("randomDigits", () => {
  it("returns the requested number of digits", () => {
    const value = randomDigits(6);
    expect(value).toMatch(/^\d{6}$/);
  });
});

describe("initialOf", () => {
  it("uppercases the first letter and falls back when empty", () => {
    expect(initialOf("budi")).toBe("B");
    expect(initialOf("   ")).toBe("D");
  });
});

describe("titleCase", () => {
  it("normalises casing", () => {
    expect(titleCase("  jl. senopati ")).toBe("Jl. Senopati");
  });
});
