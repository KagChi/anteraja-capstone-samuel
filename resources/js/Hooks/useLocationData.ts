import type { Province, Regency } from "../types";
import { useFetch } from "./useFetch";

// Same-origin proxy - the wilayah upstream is only called by the server.
const REGION_BASE = "/api/v1/regions";

export function useLocationData(
  provinceId?: string | null,
  enabled = Boolean(provinceId),
) {
  const provincesResource = useFetch<{ data: Province[] }>(
    enabled ? `${REGION_BASE}/provinces` : null,
  );
  const regenciesResource = useFetch<{ data: Regency[] }>(
    enabled && provinceId ? `${REGION_BASE}/regencies/${provinceId}` : null,
  );

  return {
    provinces: {
      ...provincesResource,
      data: provincesResource.data?.data ?? null,
    },
    regencies: {
      ...regenciesResource,
      data: regenciesResource.data?.data ?? null,
    },
  };
}
