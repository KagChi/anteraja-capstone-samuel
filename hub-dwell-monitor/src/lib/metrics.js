/**
 * metrics.js - logika metrik & filter yang dipakai aplikasi dan unit test.
 *
 * Prinsip yang dijaga di file ini:
 *   - ranking selalu memakai nilai numerik mentah (mean_dwell_hours), bukan string terformat;
 *   - global mean dihitung dari completed visits (berbobot jumlah kunjungan selesai);
 *   - open visit (ARRIVAL tanpa DEPARTURE) tidak pernah masuk hitungan completed mean;
 *   - filter prioritas adalah satu sumber kebenaran untuk hub list dan Leaflet map.
 */

export const PRIORITY_RULES = {
  minMeanDwellHours: 6,
  highMinMeanDwellHours: 8,
  criticalMinMeanDwellHours: 10,
  minCompletedVisits: 100,
  label: "mean ≥ 6 jam & ≥ 100 kunjungan",
  disclaimer:
    "Ambang 6 jam hanya aturan simulasi latihan Day 19, bukan SLA resmi Anteraja.",
  severitySource:
    "Tingkat keparahan (Kritis/Tinggi/Waspada/Normal) mengadaptasi pola desain Stitch ke ambang data Day 18.",
};

const idNumber = new Intl.NumberFormat("id-ID");
const decimalFormatters = new Map();

function decimalFormatter(decimals) {
  if (!decimalFormatters.has(decimals)) {
    decimalFormatters.set(
      decimals,
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    );
  }
  return decimalFormatters.get(decimals);
}

export function toNumber(value) {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : Number.NaN;
}

export function formatHours(value, options = {}) {
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return "—";
  const text = decimalFormatter(options.decimals ?? 2).format(numeric);
  return options.withUnit === false ? text : text + " jam";
}

export function formatInteger(value) {
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return "—";
  return idNumber.format(numeric);
}

export function formatHubs(hubs, limit = 3) {
  return hubs
    .slice(0, limit)
    .map((hub) => hub.hub_name)
    .join(", ");
}

export function sampleIsSufficient(hub, rules = PRIORITY_RULES) {
  return toNumber(hub.completed_visits) >= rules.minCompletedVisits;
}

export function isPriorityHub(hub, rules = PRIORITY_RULES) {
  return (
    toNumber(hub.mean_dwell_hours) >= rules.minMeanDwellHours && sampleIsSufficient(hub, rules)
  );
}

/** Tingkat keparahan yang dipakai untuk badge, marker peta, dan legenda. */
export const SEVERITY_META = {
  critical: { id: "critical", label: "Kritis", hint: "mean ≥ 10 jam" },
  high: { id: "high", label: "Tinggi", hint: "mean 8–10 jam" },
  watch: { id: "watch", label: "Waspada", hint: "mean 6–8 jam" },
  normal: { id: "normal", label: "Normal", hint: "mean < 6 jam" },
  "low-sample": { id: "low-sample", label: "Sampel kecil", hint: "< 100 kunjungan selesai" },
};

export const SEVERITY_ORDER = ["critical", "high", "watch", "normal", "low-sample"];

export function severityFor(hub, rules = PRIORITY_RULES) {
  if (!sampleIsSufficient(hub, rules)) return "low-sample";
  const mean = toNumber(hub.mean_dwell_hours);
  if (Number.isNaN(mean)) return "low-sample";
  if (mean >= rules.criticalMinMeanDwellHours) return "critical";
  if (mean >= rules.highMinMeanDwellHours) return "high";
  if (mean >= rules.minMeanDwellHours) return "watch";
  return "normal";
}

export function severityCounts(hubs = [], rules = PRIORITY_RULES) {
  const counts = { critical: 0, high: 0, watch: 0, normal: 0, "low-sample": 0 };
  for (const hub of hubs) counts[severityFor(hub, rules)] += 1;
  return counts;
}

/** Ranking memakai nilai numerik mentah; format tampilan tidak pernah dipakai untuk sort. */
export function rankHubsByMean(hubs = []) {
  return [...hubs]
    .sort(
      (a, b) =>
        toNumber(b.mean_dwell_hours) - toNumber(a.mean_dwell_hours) ||
        String(a.hub_id).localeCompare(String(b.hub_id)),
    )
    .map((hub, index) => ({ ...hub, mean_rank: index + 1 }));
}

/** Global mean = total dwell / jumlah completed visit (bukan rata-rata dari rata-rata). */
export function computeGlobalMean(hubs = []) {
  let completedVisits = 0;
  let dwellTotal = 0;
  for (const hub of hubs) {
    const visits = toNumber(hub.completed_visits);
    const mean = toNumber(hub.mean_dwell_hours);
    if (Number.isNaN(visits) || Number.isNaN(mean) || visits <= 0) continue;
    completedVisits += visits;
    dwellTotal += mean * visits;
  }
  if (completedVisits === 0) return { completed_visits: 0, mean_dwell_hours: null };
  return { completed_visits: completedVisits, mean_dwell_hours: dwellTotal / completedVisits };
}

export function buildHubViews(metrics, locations, rules = PRIORITY_RULES) {
  const byId = new Map((locations?.hubs ?? []).map((entry) => [entry.hub_id, entry]));
  return rankHubsByMean(metrics?.hubs ?? []).map((hub) => {
    const location = byId.get(hub.hub_id) ?? null;
    const lat = toNumber(location?.lat);
    const lng = toNumber(location?.lng);
    const view = {
      ...hub,
      hub_name: location?.hub_name ?? hub.hub_id,
      city: location?.city ?? null,
      province: location?.province ?? null,
      island: location?.island ?? null,
      lat: Number.isNaN(lat) ? null : lat,
      lng: Number.isNaN(lng) ? null : lng,
      has_coordinates: !Number.isNaN(lat) && !Number.isNaN(lng),
      sample_sufficient: sampleIsSufficient(hub, rules),
      is_priority: isPriorityHub(hub, rules),
    };
    return { ...view, severity: severityFor(view, rules) };
  });
}

export function topHubsByMean(views = [], limit = 3) {
  return views.filter((hub) => hub.sample_sufficient).slice(0, limit);
}

/** Hub bersampel kecil yang mean-nya lebih tinggi dari Top N (mis. HUB_AMB 36 kunjungan). */
export function excludedLowSampleHubs(views = [], limit = 3) {
  const top = topHubsByMean(views, limit);
  const cutoff = top.length > 0 ? toNumber(top[top.length - 1].mean_dwell_hours) : Number.POSITIVE_INFINITY;
  return views.filter(
    (hub) => !hub.sample_sufficient && toNumber(hub.mean_dwell_hours) > cutoff,
  );
}

export function matchesQuery(hub, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (needle === "") return true;
  return [hub.hub_id, hub.hub_name, hub.city, hub.province, hub.island]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(needle));
}

/** Filter prioritas dipakai bersama oleh hub list dan Leaflet map. */
export function applyPriorityFilter(hubs = [], priorityOnly = false) {
  return priorityOnly ? hubs.filter((hub) => hub.is_priority) : [...hubs];
}

/** Search hanya mempersempit hub list, sehingga peta tetap menjadi konteks geografis. */
export function filterHubList(hubs = [], options = {}) {
  const { priorityOnly = false, query = "" } = options;
  return applyPriorityFilter(hubs, priorityOnly).filter((hub) => matchesQuery(hub, query));
}

export function datasetStats(views = []) {
  const global = computeGlobalMean(views);
  return {
    hub_count: views.length,
    completed_visits: global.completed_visits,
    mean_dwell_hours: global.mean_dwell_hours,
    priority_hub_count: views.filter((hub) => hub.is_priority).length,
    mappable_hub_count: views.filter((hub) => hub.has_coordinates).length,
  };
}

export function shareOfVisits(hub, totalVisits) {
  const visits = toNumber(hub?.completed_visits);
  if (Number.isNaN(visits) || !totalVisits) return null;
  return visits / totalVisits;
}
