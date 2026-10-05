import { ApiError } from "./api";
import { haversineMeters } from "./geo";

export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  /** Device epoch milliseconds (GeolocationPosition.timestamp). */
  timestamp: number;
}

export type GpsLevel = "clean" | "suspected" | "blocked";

export interface GpsReason {
  code: string;
  label: string;
  detail: string;
  severity: "strong" | "weak";
}

export interface GpsFixWindow {
  count: number;
  spanSeconds: number;
  distinctPoints: number;
}

export interface GpsAssessment {
  level: GpsLevel;
  reasons: GpsReason[];
  accuracyM: number | null;
  fixWindow: GpsFixWindow | null;
}

/** Mirrors the server thresholds in App\Services\Verification\FakeGpsDetector. */
export const GPS_THRESHOLDS = {
  accuracyMinM: 1,
  frozenMinFixes: 8,
  frozenMinSpanSeconds: 45,
  frozenMaxAccuracyM: 2,
  staleFixSeconds: 600,
  teleportMaxSpeedKmh: 150,
  teleportMinGapSeconds: 5,
  teleportMinDistanceM: 200,
  diversityMinSpanSeconds: 45,
  diversityMinDistinctPoints: 3,
  diversityMaxAccuracyM: 5,
  maxWindow: 60,
} as const;

const LABELS: Record<string, string> = {
  accuracy_invalid: "Akurasi GPS tidak wajar",
  frozen_fix: "Koordinat beku (tidak ada variasi sinyal)",
  client_teleport: "Lompatan posisi tidak wajar",
  stale_fix: "Data GPS sudah lama",
  low_diversity: "Variasi sinyal GPS rendah",
};

function reason(
  code: string,
  severity: "strong" | "weak",
  detail: string,
): GpsReason {
  return { code, label: LABELS[code] ?? code, detail, severity };
}

function format(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function windowStats(fixes: GpsFix[]): GpsFixWindow | null {
  if (fixes.length === 0) return null;

  const first = fixes[0].timestamp;
  const last = fixes[fixes.length - 1].timestamp;
  const keys = new Set(
    fixes.map(
      (fix) => `${fix.latitude.toFixed(6)},${fix.longitude.toFixed(6)}`,
    ),
  );

  return {
    count: fixes.length,
    spanSeconds: Math.max(0, Math.round((last - first) / 1000)),
    distinctPoints: keys.size,
  };
}

/**
 * FRD-06 client-side assessment: a DOM-free heuristic over the fix window the
 * courier hook has seen so far. It is advisory - the server re-derives its own
 * verdict and owns the authoritative block decision.
 */
export function assessFixes(fixes: GpsFix[], now: number): GpsAssessment {
  const clean: GpsAssessment = {
    level: "clean",
    reasons: [],
    accuracyM: null,
    fixWindow: null,
  };

  if (fixes.length === 0) return clean;

  const reasons: GpsReason[] = [];
  const window = windowStats(fixes);
  const latest = fixes[fixes.length - 1];
  const accuracy = latest.accuracy;
  const staleSeconds = Math.round((now - latest.timestamp) / 1000);

  if (accuracy !== null && accuracy < GPS_THRESHOLDS.accuracyMinM) {
    reasons.push(
      reason(
        "accuracy_invalid",
        "strong",
        `Perangkat melaporkan akurasi ±${format(accuracy)} m (ciri lokasi simulasi).`,
      ),
    );
  }

  const frozen =
    window !== null &&
    window.count >= GPS_THRESHOLDS.frozenMinFixes &&
    window.spanSeconds >= GPS_THRESHOLDS.frozenMinSpanSeconds &&
    window.distinctPoints === 1 &&
    accuracy !== null &&
    accuracy <= GPS_THRESHOLDS.frozenMaxAccuracyM;

  if (frozen && window) {
    reasons.push(
      reason(
        "frozen_fix",
        "strong",
        `${window.count} titik identik selama ${window.spanSeconds} dtk tanpa variasi sinyal GPS.`,
      ),
    );
  }

  for (let index = 1; index < fixes.length; index++) {
    const previous = fixes[index - 1];
    const current = fixes[index];
    const gap = (current.timestamp - previous.timestamp) / 1000;

    if (gap < GPS_THRESHOLDS.teleportMinGapSeconds) continue;

    const distance = haversineMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );

    if (distance < GPS_THRESHOLDS.teleportMinDistanceM) continue;

    const speed = distance / 1000 / (gap / 3600);

    if (speed > GPS_THRESHOLDS.teleportMaxSpeedKmh) {
      reasons.push(
        reason(
          "client_teleport",
          "weak",
          `Lompatan ${format(distance / 1000)} km dalam ${Math.round(gap)} dtk (±${Math.round(speed)} km/jam) pada sesi ini.`,
        ),
      );

      break;
    }
  }

  if (staleSeconds > GPS_THRESHOLDS.staleFixSeconds) {
    reasons.push(
      reason(
        "stale_fix",
        "weak",
        `Fix GPS terakhir sudah ${Math.round(staleSeconds / 60)} menit lalu.`,
      ),
    );
  }

  if (
    !frozen &&
    window !== null &&
    window.spanSeconds >= GPS_THRESHOLDS.diversityMinSpanSeconds &&
    window.distinctPoints < GPS_THRESHOLDS.diversityMinDistinctPoints &&
    accuracy !== null &&
    accuracy <= GPS_THRESHOLDS.diversityMaxAccuracyM
  ) {
    reasons.push(
      reason(
        "low_diversity",
        "weak",
        `Hanya ${window.distinctPoints} titik berbeda dalam ${window.spanSeconds} dtk terakhir padahal akurasi ±${format(accuracy)} m.`,
      ),
    );
  }

  const level: GpsLevel = reasons.some((item) => item.severity === "strong")
    ? "blocked"
    : reasons.length > 0
      ? "suspected"
      : "clean";

  return {
    level,
    reasons,
    accuracyM: accuracy !== null ? Math.round(accuracy) : null,
    fixWindow: window,
  };
}

/**
 * Extracts the server's block reasons from a FAKE_GPS_SUSPECTED error so the
 * courier can see exactly what the detector flagged.
 */
export function gpsBlockedReasons(error: unknown): GpsReason[] {
  if (!(error instanceof ApiError) || error.code !== "FAKE_GPS_SUSPECTED") {
    return [];
  }

  const raw = (error.details as { errors?: unknown } | null)?.errors;

  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): GpsReason[] => {
    if (typeof entry !== "object" || entry === null) return [];

    const value = entry as Record<string, unknown>;
    const detail = typeof value.detail === "string" ? value.detail : "";
    const label = typeof value.label === "string" ? value.label : "";

    if (label === "" && detail === "") return [];

    return [
      {
        code: typeof value.code === "string" ? value.code : "unknown",
        label: label !== "" ? label : "Lokasi tidak wajar",
        detail,
        severity: value.severity === "weak" ? "weak" : "strong",
      },
    ];
  });
}
