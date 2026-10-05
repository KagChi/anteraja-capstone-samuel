import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationStatus = "idle" | "locating" | "ready" | "error";

export interface GeolocationState {
  status: GeolocationStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: number | null;
  error: string | null;
}

const INITIAL: GeolocationState = {
  status: "idle",
  latitude: null,
  longitude: null,
  accuracy: null,
  updatedAt: null,
  error: null,
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
        setState({
          status: "ready",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? Math.round(position.coords.accuracy)
            : null,
          updatedAt: position.timestamp,
          error: null,
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

  return { ...state, retry };
}
