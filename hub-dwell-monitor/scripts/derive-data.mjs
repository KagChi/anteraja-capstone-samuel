#!/usr/bin/env node
/**
 * derive-data.mjs - Day 19 Anteraja Hub Dwell Monitor
 *
 * Membaca dataset scan event Day 18 (scripts/data/scan_events.csv) dan menulis
 * public/data/metrics.json (KPI global + metrik per hub) memakai logika di
 * scripts/lib/dwell-metrics.mjs. Jalankan: npm run data:build
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIORITY_RULES, deriveMetrics } from "./lib/dwell-metrics.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const SOURCE_CSV = resolve(here, "data/scan_events.csv");
const OUT_JSON = resolve(root, "public/data/metrics.json");
const SOURCE_LABEL =
  "docs/big-data-bottleneck-analysis/analysis/scan_events.csv (Day 18, branch feature/bigdata-bottleneck-hubs)";

const csvText = readFileSync(SOURCE_CSV, "utf8");
const derived = deriveMetrics(csvText);
const metrics = {
  generated_at: new Date().toISOString(),
  source: SOURCE_LABEL,
  pipeline: [
    "parse timestamp (drop invalid)",
    "drop duplicate scan events",
    "pair ARRIVAL -> DEPARTURE per hub x package",
    "drop incomplete pairs and DEPARTURE <= ARRIVAL",
    "dwell hours = last DEPARTURE - first ARRIVAL",
    "aggregate per hub + global KPI",
  ],
  rules: {
    ...PRIORITY_RULES,
    ranking_basis: "raw numeric mean_dwell_hours, bukan string terformat",
  },
  quality: derived.quality,
  global: derived.global,
  hubs: derived.hubs,
};

mkdirSync(resolve(root, "public/data"), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(metrics, null, 2) + "\n", "utf8");

const global = metrics.global;
console.log(
  "metrics.json -> " +
    global.hub_count + " hub, " +
    global.completed_visits + " completed visits, mean " +
    global.mean_dwell_hours + " jam, " +
    global.priority_hub_count + " hub prioritas",
);

