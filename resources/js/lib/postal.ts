const POSTAL_CODE = /^\d{4,6}$/;
const TRAILING_CODE = /\d{4,6}$/;
const CITY_WORD =
  /^(kota|kabupaten|kab\.?|city|administrasi|jakarta|south|north|east|west|central)\b/i;

/**
 * Indonesian addresses end with the city (and often a postal code), so the
 * district for a postal-code lookup is the nearest meaningful segment before
 * those. The value is derived from the shipment address, never configured.
 */
export function districtFromAddress(
  address: string | null | undefined,
): string {
  const segments = (address ?? "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of [...segments].reverse()) {
    if (
      POSTAL_CODE.test(segment) ||
      TRAILING_CODE.test(segment) ||
      CITY_WORD.test(segment)
    ) {
      continue;
    }

    return segment;
  }

  return segments.at(-1) ?? "";
}
