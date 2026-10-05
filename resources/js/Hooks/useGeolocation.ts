import { useCallback, useEffect, useRef, useState } from "react";
import {
  assessFixes,
  GPS_THRESHOLDS,
  type GpsAssessment,
  type GpsFix,
} from "../lib/fakeGps";

export type GeolocationStatus = "idle" | "locating" | "ready" | "error";

export interface GeolocationState {
  status: GeolocationStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: number | null;
  error: string | null;
  /** Latest derivative fields (null when the platform does not provide them). */
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  /** Device clock of the latest fix (epoch ms), shipped to the server. */
  deviceTimestamp: number | null;
  /** Bounded recent fix window used for FRD-06 detection. */
  fixes: GpsFix[];
  assessment: GpsAssessment;
}

const INITIAL: GeolocationState = {
  status: "idle",
  latitude: null,
  longitude: null,
  accuracy: null,
  updatedAt: null,
  error: null,
  speed: null,
  heading: null,
  altitude: null,
  deviceTimestamp: null,
  fixes: [],
  assessment: { level: "clean", reasons: [], accuracyM: null, fixWindow: null },
};

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

export function describeGeolocationError(
  error: GeolocationPositionError,
): string {
  switch (error.code) {
    case PERMISSION_DENIED:
      return "Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi untuk aplikasi kurir.";
    case POSITION_UNAVAILABLE:
      return "Sinyal GPS tidak tersedia. Pindah ke area terbuka lalu coba lagi.";
    default:
      return "Pencarian lokasi melebihi batas waktu. Coba lagi.";
  }
}

/**
 * Live courier GPS detection. Watches the device position so the distance to
 * the destination updates as the courier moves; the coordinates submitted
 * with the POD are the latest fix shown here.
 */
export function useGeolocation(enabled = true): GeolocationState & {
  retry: () => void;
} {
  const [state, setState] = useState<GeolocationState>(INITIAL);
  const [_retryToken, setRetryToken] = useState(0);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({
        ...INITIAL,
        status: "error",
        error: "Perangkat ini tidak menyediakan deteksi GPS.",
      });
      return;
    }

    setState((current) =>
      current.latitude === null
        ? { ...current, status: "locating", error: null }
        : current,
    );

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { coords } = position;
        const accuracy = Number.isFinite(coords.accuracy)
          ? coords.accuracy
          : null;
        const timestamp = Number.isFinite(position.timestamp)
          ? position.timestamp
          : Date.now();
        const fix: GpsFix = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy,
          timestamp,
        };

        setState((current) => {
          const previous = current.fixes[current.fixes.length - 1];

          // A cached fix (same instant, same point) adds no evidence; keep
          // the window clean without re-rendering.
          if (
            previous &&
            previous.timestamp === fix.timestamp &&
            previous.latitude === fix.latitude &&
            previous.longitude === fix.longitude
          ) {
            return current;
          }

          const fixes = [...current.fixes, fix].slice(
            -GPS_THRESHOLDS.maxWindow,
          );

          return {
            status: "ready",
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: accuracy === null ? null : Math.round(accuracy),
            updatedAt: timestamp,
            error: null,
            speed: Number.isFinite(coords.speed) ? coords.speed : null,
            heading: Number.isFinite(coords.heading) ? coords.heading : null,
            altitude: Number.isFinite(coords.altitude) ? coords.altitude : null,
            deviceTimestamp: timestamp,
            fixes,
            assessment: assessFixes(fixes, Date.now()),
          };
        });
      },
      (error) => {
        // Keep the last known fix; only surface the error while we have none.
        setState((current) =>
          current.latitude !== null
            ? current
            : {
                ...INITIAL,
                status: "error",
                error: describeGeolocationError(error),
              },
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled]);

  const retry = useCallback(() => {
    setRetryToken((value) => value + 1);
  }, []);

  return {
    ...state,
    // The window ages even without a new fix, so the stale-fix reason is
    // recomputed on every render.
    assessment: assessFixes(state.fixes, Date.now()),
    retry,
  };
}
