import { usePage } from "@inertiajs/react";

/**
 * The shipment the courier flow is working on, read synchronously from the
 * current URL (?tracking=). Deriving it from the page URL - instead of a
 * mirrored context state - avoids a render where the value is not yet known.
 */
export function useActiveTracking(): string | null {
  const { url } = usePage();
  const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";

  return new URLSearchParams(query).get("tracking")?.trim() || null;
}
