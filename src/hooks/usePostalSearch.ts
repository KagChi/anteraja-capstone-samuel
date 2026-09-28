import type { AsyncResource, PostalResult } from "../types";
import { useDebouncedValue } from "./useDebouncedValue";
import { useFetch } from "./useFetch";

const POSTAL_BASE = "https://kodepos.vercel.app/search/";
const MIN_QUERY_LENGTH = 3;

interface PostalResponse {
  statusCode: number;
  code: string;
  data: PostalResult[];
}

export function usePostalSearch(query: string): AsyncResource<PostalResult[]> {
  const debounced = useDebouncedValue(query, 350);
  const term = debounced.trim();
  const url =
    term.length >= MIN_QUERY_LENGTH
      ? `${POSTAL_BASE}?q=${encodeURIComponent(term)}`
      : null;

  const resource = useFetch<PostalResponse>(url);

  return { ...resource, data: resource.data?.data ?? null };
}
