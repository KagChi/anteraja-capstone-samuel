import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "../lib/api";
import type { AsyncResource } from "../types";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/** Short-lived, module-level response cache to avoid refetching on navigation. */
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function readCache<T>(url: string): T | undefined {
  const entry = cache.get(url);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(url);
    return undefined;
  }
  return entry.data as T;
}

function request<T>(url: string): Promise<T> {
  const existing = inflight.get(url) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetchJson<T>(url).then(
    (result) => {
      cache.set(url, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      inflight.delete(url);
      return result;
    },
    (error) => {
      inflight.delete(url);
      throw error;
    },
  );

  inflight.set(url, promise);
  return promise;
}

export function useFetch<T>(url: string | null): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const forcedUrl = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce forces a manual refetch via reload()
  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    const force = forcedUrl.current === url;
    forcedUrl.current = null;

    if (!force) {
      const cached = readCache<T>(url);
      if (cached !== undefined) {
        setData(cached);
        setError(null);
        setIsLoading(false);
        return () => {
          active = false;
        };
      }
    }

    setIsLoading(true);
    setError(null);

    request<T>(url)
      .then((result) => {
        if (!active) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, nonce]);

  const reload = useCallback(() => {
    forcedUrl.current = url;
    setNonce((value) => value + 1);
  }, [url]);

  return { data, isLoading, isError: error !== null, error, reload };
}
