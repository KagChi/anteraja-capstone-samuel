import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  pageCount: number;
  hasMorePages: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
  goTo: (page: number) => void;
  reload: () => void;
}

/** The slice of a cursor resource the shared Pagination control needs. */
export function paginationOf<T>(resource: CursorPagination<T>) {
  return {
    page: resource.page,
    pageCount: resource.pageCount,
    hasMorePages: resource.hasMorePages,
    isLoading: resource.isLoading,
    goTo: resource.goTo,
  };
}

export const PER_PAGE = 10;

/**
 * Page numbers the strip offers at once. These endpoints are keyset-only:
 * every response carries one opaque cursor and nothing else, so instead of
 * revealing a number each time the visitor walks forward, the hook fetches the
 * cursors for the pages it wants to show ahead of time.
 */
const STRIP_PAGES = 5;

/** Pages kept discoverable past the current one. */
const PAGES_AHEAD = 2;

/**
 * Cursor (keyset) pagination for a data table: keeps a stack of the cursors
 * used so any opened page stays reachable without offset scans, and walks the
 * chain forward in the background so the number strip is complete on arrival.
 */
export function useCursorPagination<T>(
  url: string | null,
  perPage: number = PER_PAGE,
  params: Record<string, string | undefined> = {},
): CursorPagination<T> {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<CursorMeta | null>(null);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const requestId = useRef(0);
  const hasItems = useRef(false);
  const lastPageRef = useRef<number | null>(null);
  const cursorsRef = useRef<(string | null)[]>([null]);

  useEffect(() => {
    cursorsRef.current = cursors;
  }, [cursors]);

  const paramsKey = useMemo(
    () =>
      JSON.stringify(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== "")
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
    [params],
  );

  const activeParams = useMemo(
    () => JSON.parse(paramsKey) as [string, string][],
    [paramsKey],
  );

  const buildUrl = useCallback(
    (cursor: string | null) => {
      const search = new URLSearchParams({ per_page: String(perPage) });
      for (const [key, value] of activeParams) {
        search.set(key, value);
      }
      if (cursor) search.set("cursor", cursor);
      const base = url ?? "";
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}${search.toString()}`;
    },
    [url, perPage, activeParams],
  );

  const readPage = useCallback(
    (cursor: string | null) => fetchJson<CursorResponse<T>>(buildUrl(cursor)),
    [buildUrl],
  );

  const load = useCallback(
    (cursor: string | null, targetPage: number) => {
      if (!url) return;

      const id = requestId.current + 1;
      requestId.current = id;

      // Keep the current rows on screen while the next page loads; only the
      // very first load blanks the table.
      setIsLoading(!hasItems.current);
      setIsRefreshing(hasItems.current);
      setIsError(false);

      readPage(cursor)
        .then((response) => {
          if (id !== requestId.current) return;

          const rows = response.data ?? [];
          const ahead = response.meta?.next_cursor ?? null;

          setItems(rows);
          hasItems.current = rows.length > 0;
          setMeta(response.meta ?? null);
          setPage(targetPage);
          setCursors((previous) => {
            // Keep the cursors of pages already walked so jumping back never
            // drops the numbers further ahead, and store the cursor the server
            // handed out for the page after this one.
            const next = [...previous];
            next[targetPage - 1] = cursor;

            if (ahead) {
              next[targetPage] = ahead;
            } else {
              next.length = targetPage;
            }

            return next;
          });

          if (!ahead || rows.length === 0) {
            lastPageRef.current = targetPage;
            setLastPage(targetPage);
          }

          setIsLoading(false);
          setIsRefreshing(false);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setIsError(true);
          setIsLoading(false);
          setIsRefreshing(false);
        });
    },
    [url, readPage],
  );

  const queryKey = `${url ?? ""}|${paramsKey}`;

  // A new query drops everything discovered for the previous one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: queryKey covers url, params and nonce
  useEffect(() => {
    requestId.current += 1;
    hasItems.current = false;
    lastPageRef.current = null;
    cursorsRef.current = [null];

    setItems([]);
    setMeta(null);
    setPage(1);
    setCursors([null]);
    setLastPage(null);
    setIsLoading(Boolean(url));
    setIsRefreshing(false);
    setIsError(false);

    if (url) load(null, 1);
  }, [queryKey, url, load, nonce]);

  // Walk the cursor chain forward so the strip can offer its pages together
  // instead of growing a number at a time. Each completed step adds one
  // cursor, which re-runs this effect for the next step.
  useEffect(() => {
    if (!url || lastPageRef.current !== null) return;

    const wanted = Math.max(STRIP_PAGES, page + PAGES_AHEAD);
    if (cursors.length >= wanted) return;

    const chainAtStart = cursors;
    readPage(cursors[cursors.length - 1] ?? null)
      .then((response) => {
        // Drop the step if the query changed underneath it.
        if (cursorsRef.current !== chainAtStart) return;

        const ahead = response.meta?.next_cursor ?? null;

        if (!ahead || (response.data ?? []).length === 0) {
          lastPageRef.current = cursors.length;
          setLastPage(cursors.length);
          return;
        }

        setCursors([...chainAtStart, ahead]);
      })
      .catch(() => {
        // Prefetching is an optimisation: a failure keeps the pages we have.
      });
  }, [url, page, cursors, readPage]);

  const pageCount = lastPage ?? cursors.length;
  const hasMorePages = lastPage === null;

  const goTo = useCallback(
    (target: number) => {
      if (isLoading || target === page || target < 1 || target > pageCount) {
        return;
      }

      load(cursors[target - 1] ?? null, target);
    },
    [cursors, isLoading, load, page, pageCount],
  );

  const next = useCallback(() => goTo(page + 1), [goTo, page]);
  const prev = useCallback(() => goTo(page - 1), [goTo, page]);
  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    items,
    meta,
    page,
    pageCount,
    hasMorePages,
    isLoading,
    isRefreshing,
    isError,
    hasNext: page < pageCount,
    hasPrev: page > 1,
    next,
    prev,
    goTo,
    reload,
  };
}
