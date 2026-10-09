import { useCallback, useEffect, useState } from "react";
import { buildHubViews } from "../lib/metrics.js";

const DATA_FILES = {
  metrics: "data/metrics.json",
  locations: "data/locations.json",
  summary: "data/ai-summary.json",
};

const EMPTY_STATE = {
  status: "loading",
  error: null,
  metrics: null,
  locations: null,
  summary: null,
  views: [],
};

function demoState() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("state");
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Gagal memuat " + path + " (HTTP " + response.status + ")");
  }
  return response.json();
}

function emptyMetrics(metrics) {
  return {
    ...metrics,
    hubs: [],
    global: {
      ...metrics?.global,
      hub_count: 0,
      completed_visits: 0,
      priority_hub_count: 0,
      mean_dwell_hours: null,
    },
  };
}

/**
 * Memuat metrics.json, locations.json, dan ai-summary.json sekaligus.
 * Status yang mungkin: loading | ready | empty | error.
 * Query ?state=loading|empty|error dipakai untuk meninjau application state saat uji UI.
 */
export function useHubData() {
  const [state, setState] = useState(EMPTY_STATE);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const demo = demoState();
    if (demo === "loading") {
      setState({ ...EMPTY_STATE, status: "loading" });
      return undefined;
    }
    if (demo === "error") {
      setState({
        ...EMPTY_STATE,
        status: "error",
        error: "Simulasi error (?state=error): data hub gagal dimuat.",
      });
      return undefined;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, status: "loading", error: null }));

    (async () => {
      try {
        const [metrics, locations, summary] = await Promise.all([
          fetchJson(DATA_FILES.metrics),
          fetchJson(DATA_FILES.locations),
          fetchJson(DATA_FILES.summary),
        ]);
        if (cancelled) return;
        const effectiveMetrics = demo === "empty" ? emptyMetrics(metrics) : metrics;
        const views = buildHubViews(effectiveMetrics, locations);
        setState({
          status: views.length > 0 ? "ready" : "empty",
          error: null,
          metrics: effectiveMetrics,
          locations,
          summary,
          views,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          ...EMPTY_STATE,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { ...state, reload };
}

