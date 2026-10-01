import type { Province, Regency } from "../types";
import { useFetch } from "./useFetch";

const WILAYAH_BASE = "https://www.emsifa.com/api-wilayah-indonesia/api";

export function useLocationData(
  provinceId?: string | null,
  enabled = Boolean(provinceId),
) {
  const provinces = useFetch<Province[]>(
    enabled ? `${WILAYAH_BASE}/provinces.json` : null,
  );
  const regencies = useFetch<Regency[]>(
    enabled && provinceId
      ? `${WILAYAH_BASE}/regencies/${provinceId}.json`
      : null,
  );

  return { provinces, regencies };
}
