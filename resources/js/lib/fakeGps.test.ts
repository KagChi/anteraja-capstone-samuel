import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { assessFixes, type GpsFix, gpsBlockedReasons } from "./fakeGps";

const NOW = Date.UTC(2026, 9, 5, 3, 0, 0);

function fix(overrides: Partial<GpsFix> = {}): GpsFix {
  return {
    latitude: -6.2418,
    longitude: 106.7993,
    accuracy: 12,
    timestamp: NOW,
    ...overrides,
  };
}

describe("assessFixes", () => {
  it("returns clean for an empty window", () => {
    const assessment = assessFixes([], NOW);

    expect(assessment.level).toBe("clean");
    expect(assessment.reasons).toEqual([]);
  });

  it("blocks an implausible accuracy", () => {
    const assessment = assessFixes([fix({ accuracy: 0 })], NOW);

    expect(assessment.level).toBe("blocked");
    expect(assessment.reasons[0].code).toBe("accuracy_invalid");
    expect(assessment.accuracyM).toBe(0);
  });

  it("keeps a realistic fix clean", () => {
    const assessment = assessFixes([fix()], NOW);

    expect(assessment.level).toBe("clean");
  });

  it("blocks a frozen window of identical coordinates", () => {
    const fixes = Array.from({ length: 8 }, (_, index) =>
      fix({ accuracy: 1.5, timestamp: NOW - (60 - index * 8) * 1000 }),
    );

    const assessment = assessFixes(fixes, NOW);

    expect(assessment.level).toBe("blocked");
    expect(assessment.reasons.map((reason) => reason.code)).toContain(
      "frozen_fix",
    );
    expect(assessment.fixWindow?.distinctPoints).toBe(1);
  });

  it("does not freeze a stationary window with a realistic accuracy", () => {
    const fixes = Array.from({ length: 8 }, (_, index) =>
      fix({ timestamp: NOW - (60 - index * 8) * 1000 }),
    );

    expect(assessFixes(fixes, NOW).level).toBe("clean");
  });

  it("flags a session teleport as suspected", () => {
    const fixes = [
      fix({ timestamp: NOW - 120_000 }),
      fix({ latitude: -6.15, longitude: 106.7993, timestamp: NOW }),
    ];

    const assessment = assessFixes(fixes, NOW);

    expect(assessment.level).toBe("suspected");
    expect(assessment.reasons.map((reason) => reason.code)).toContain(
      "client_teleport",
    );
  });

  it("flags a stale fix as suspected", () => {
    const assessment = assessFixes(
      [fix({ timestamp: NOW - 20 * 60 * 1000 })],
      NOW,
    );

    expect(assessment.level).toBe("suspected");
    expect(assessment.reasons.map((reason) => reason.code)).toContain(
      "stale_fix",
    );
  });

  it("flags a low-diversity window as suspected", () => {
    const fixes = [
      fix({ accuracy: 4, timestamp: NOW - 60_000 }),
      fix({ accuracy: 4, timestamp: NOW - 40_000 }),
      fix({
        latitude: -6.24181,
        accuracy: 4,
        timestamp: NOW - 20_000,
      }),
      fix({ accuracy: 4, timestamp: NOW }),
    ];

    const assessment = assessFixes(fixes, NOW);

    expect(assessment.level).toBe("suspected");
    expect(assessment.reasons.map((reason) => reason.code)).toContain(
      "low_diversity",
    );
  });
});

describe("gpsBlockedReasons", () => {
  it("extracts the server reasons from a FAKE_GPS_SUSPECTED error", () => {
    const error = new ApiError(
      "Lokasi tidak wajar.",
      "FAKE_GPS_SUSPECTED",
      422,
      {
        code: "FAKE_GPS_SUSPECTED",
        message: "Lokasi tidak wajar.",
        errors: [
          {
            code: "accuracy_invalid",
            label: "Akurasi GPS tidak wajar",
            detail: "±0 m",
            severity: "strong",
          },
        ],
      },
    );

    const reasons = gpsBlockedReasons(error);

    expect(reasons).toHaveLength(1);
    expect(reasons[0].code).toBe("accuracy_invalid");
  });

  it("ignores other API errors", () => {
    expect(gpsBlockedReasons(new Error("nope"))).toEqual([]);
    expect(
      gpsBlockedReasons(new ApiError("validasi", "VALIDATION_ERROR", 422)),
    ).toEqual([]);
  });
});
