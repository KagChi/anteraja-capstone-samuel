const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance used for the live courier-to-destination readout.
 * The server recomputes the authoritative distance with PostGIS on capture.
 */
export function haversineMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const deltaLat = toRadians(latitude2 - latitude1);
  const deltaLng = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(deltaLng / 2) ** 2;

  return Math.round(EARTH_RADIUS_M * 2 * Math.asin(Math.min(1, Math.sqrt(a))));
}

export function formatMeters(value: number): string {
  if (value < 1000) {
    return `${value} m`;
  }

  const km = (Math.round(value / 100) / 10)
    .toFixed(1)
    .replace(/\.0$/, "")
    .replace(".", ",");

  return `${km} km`;
}
