import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "../lib/api";

export interface CursorMeta {
  per_page: number;
  next_cursor: string | null;
  has_more: boolean;
}

interface CursorResponse<T> {
  data: T[];
  meta: CursorMeta;
}

export interface CursorPagination<T> {
  items: T[];
  meta: CursorMeta | null;
  page: number;
  isLoading: boolean;
  isError: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
  reload: () => void;
}

export const PER_PAGE = 10;

/**
 * Cursor (keyset) pagination for a data table: keeps a stack of the cursors
 * used so "next"/"previous" can page forward and back without offset scans.
 */
export function useCursorPagination<T>(
  url: string | null,
  perPage: number = PER_PAGE,
): CursorPagination<T> {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<CursorMeta | null>(null);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [isError, setIsError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const requestId = useRef(0);

  const buildUrl = useCallback(
    (cursor: string | null) => {
      const params = new URLSearchParams({ per_page: String(perPage) });
      if (cursor) params.set("cursor", cursor);
      const base = url ?? "";
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}${params.toString()}`;
    },
    [url, perPage],
  );

  const load = useCallback(
    (cursor: string | null, targetPage: number) => {
      if (!url) return;

      const id = requestId.current + 1;
      requestId.current = id;

      setIsLoading(true);
      setIsError(false);

      fetchJson<CursorResponse<T>>(buildUrl(cursor))
        .then((response) => {
          if (id !== requestId.current) return;
          setItems(response.data ?? []);
          setMeta(response.meta ?? null);
          setPage(targetPage);
          setCursors((previous) => {
            const next = previous.slice(0, targetPage - 1);
            next[targetPage - 1] = cursor;
            return next;
          });
          setIsLoading(false);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setIsError(true);
          setIsLoading(false);
        });
    },
    [url, buildUrl],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce forces a manual refetch via reload()
  useEffect(() => {
    if (!url) {
      setItems([]);
      setMeta(null);
      setPage(1);
      setCursors([null]);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    load(null, 1);
  }, [url, load, nonce]);

  const next = useCallback(() => {
    const cursor = meta?.next_cursor;
    if (!cursor || isLoading) return;
    load(cursor, page + 1);
  }, [meta, page, isLoading, load]);

  const prev = useCallback(() => {
    if (page <= 1 || isLoading) return;
    load(cursors[page - 2] ?? null, page - 1);
  }, [page, cursors, isLoading, load]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    items,
    meta,
    page,
    isLoading,
    isError,
    hasNext: Boolean(meta?.next_cursor),
    hasPrev: page > 1,
    next,
    prev,
    reload,
  };
}
