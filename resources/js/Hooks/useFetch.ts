import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import type { AsyncResource } from "../types";

export function useFetch<T>(url: string | null): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce forces a manual refetch via reload()
  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setError(null);

    fetchJson<T>(url, controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, isLoading, isError: error !== null, error, reload };
}
