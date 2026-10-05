import type { AsyncResource, PostalResult } from "../types";
import { useDebouncedValue } from "./useDebouncedValue";
import { useFetch } from "./useFetch";

// Same-origin proxy - the postal upstream is only called by the server.
const POSTAL_BASE = "/api/v1/postal/search";
const MIN_QUERY_LENGTH = 3;

export function usePostalSearch(query: string): AsyncResource<PostalResult[]> {
  const debounced = useDebouncedValue(query, 350);
  const term = debounced.trim();
  const url =
    term.length >= MIN_QUERY_LENGTH
      ? `${POSTAL_BASE}?q=${encodeURIComponent(term)}`
      : null;

  const resource = useFetch<{ data: PostalResult[] }>(url);

  return { ...resource, data: resource.data?.data ?? null };
}
