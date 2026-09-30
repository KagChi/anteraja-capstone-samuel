import type { Province, Regency } from "../types";
import { useFetch } from "./useFetch";

const WILAYAH_BASE = "https://www.emsifa.com/api-wilayah-indonesia/api";

export function useLocationData(provinceId?: string | null) {
  const provinces = useFetch<Province[]>(`${WILAYAH_BASE}/provinces.json`);
  const regencies = useFetch<Regency[]>(
    provinceId ? `${WILAYAH_BASE}/regencies/${provinceId}.json` : null,
  );

  return { provinces, regencies };
}
