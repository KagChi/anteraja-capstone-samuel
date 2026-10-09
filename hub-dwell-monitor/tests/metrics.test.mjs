import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PRIORITY_RULES,
  SEVERITY_META,
  applyPriorityFilter,
  buildHubViews,
  computeGlobalMean,
  datasetStats,
  excludedLowSampleHubs,
  filterHubList,
  formatHours,
  isPriorityHub,
  rankHubsByMean,
  severityCounts,
  severityFor,
  topHubsByMean,
} from "../src/lib/metrics.js";

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (relativePath) =>
  JSON.parse(readFileSync(resolve(here, "..", relativePath), "utf8"));

const metrics = readJson("public/data/metrics.json");
const locations = readJson("public/data/locations.json");
const views = buildHubViews(metrics, locations);

describe("dataset metrics.json + locations.json", () => {
  it("memuat 12 hub dengan completed visit sesuai hasil pipeline Day 18", () => {
    expect(metrics.global.hub_count).toBe(12);
    expect(metrics.global.completed_visits).toBe(21036);
    expect(metrics.quality.package_hub_pairs).toBe(22991);
    expect(metrics.quality.excluded_pairs).toBe(1955);
  });

  it("menjaga hub_id konsisten di metrics, locations, dan view gabungan", () => {
    const metricIds = metrics.hubs.map((hub) => hub.hub_id).sort();
    const locationIds = locations.hubs.map((hub) => hub.hub_id).sort();
    expect(locationIds).toEqual(metricIds);
    expect(views.map((hub) => hub.hub_id).sort()).toEqual(metricIds);
    expect(views.every((hub) => hub.has_coordinates)).toBe(true);
  });

  it("menyediakan minimal 6 hub untuk ditampilkan aplikasi", () => {
    expect(views.length).toBeGreaterThanOrEqual(6);
  });
});

describe("ranking dan agregasi", () => {
  it("meranking dari nilai numerik mentah, bukan string terformat", () => {
    const hubs = [
      { hub_id: "A", mean_dwell_hours: 9.5, completed_visits: 200 },
      { hub_id: "B", mean_dwell_hours: 10.2, completed_visits: 200 },
    ];
    const ranked = rankHubsByMean(hubs);
    // sort string akan menaruh "10.2" sebelum "9.5" hanya jika dibandingkan sebagai teks
    expect(ranked[0].hub_id).toBe("B");
    expect(ranked[1].mean_rank).toBe(2);
  });

  it("menghitung global mean dari completed visits (weighted, bukan rata-rata rata-rata)", () => {
    const hubs = [
      { hub_id: "A", mean_dwell_hours: 10, completed_visits: 300 },
      { hub_id: "B", mean_dwell_hours: 2, completed_visits: 100 },
    ];
    expect(computeGlobalMean(hubs).mean_dwell_hours).toBe(8);
    const plainAverage = (10 + 2) / 2;
    expect(computeGlobalMean(hubs).mean_dwell_hours).not.toBe(plainAverage);
  });

  it("tidak memasukkan open visit (tanpa DEPARTURE) ke completed mean", () => {
    const hubs = [
      { hub_id: "A", mean_dwell_hours: 10, completed_visits: 100 },
      { hub_id: "B", mean_dwell_hours: 2, completed_visits: 100 },
    ];
    const before = computeGlobalMean(hubs);
    const withOpenVisits = computeGlobalMean([
      ...hubs,
      { hub_id: "OPEN", mean_dwell_hours: null, completed_visits: 0 },
    ]);
    expect(withOpenVisits).toEqual(before);
    expect(metrics.global.open_visits).toBe(848);
  });

  it("menghasilkan global mean 7,10 jam pada data produksi", () => {
    expect(computeGlobalMean(views).mean_dwell_hours).toBeCloseTo(7.0967, 3);
  });
});

describe("aturan prioritas", () => {
  it("menandai hub prioritas hanya jika mean >= 6 jam dan >= 100 kunjungan", () => {
    expect(PRIORITY_RULES.minMeanDwellHours).toBe(6);
    expect(
      isPriorityHub({ mean_dwell_hours: 6.5, completed_visits: 120 }),
    ).toBe(true);
    expect(isPriorityHub({ mean_dwell_hours: 5.9, completed_visits: 500 })).toBe(false);
    expect(isPriorityHub({ mean_dwell_hours: 12.3, completed_visits: 36 })).toBe(false);
  });

  it("menghasilkan 9 hub prioritas dan mengecualikan HUB_AMB yang bersampel kecil", () => {
    const priority = views.filter((hub) => hub.is_priority);
    expect(priority).toHaveLength(9);
    expect(priority.map((hub) => hub.hub_id)).not.toContain("HUB_AMB");
    expect(views.find((hub) => hub.hub_id === "HUB_AMB").sample_sufficient).toBe(false);
  });

  it("Top 3 memakai hub bersampel cukup: MKS, DPS, MDN", () => {
    expect(topHubsByMean(views, 3).map((hub) => hub.hub_id)).toEqual([
      "HUB_MKS",
      "HUB_DPS",
      "HUB_MDN",
    ]);
    expect(excludedLowSampleHubs(views, 3).map((hub) => hub.hub_id)).toEqual(["HUB_AMB"]);
  });
});

describe("filter bersama dan pencarian", () => {
  it("filter prioritas dipakai untuk peta maupun list", () => {
    expect(applyPriorityFilter(views, true)).toHaveLength(9);
    expect(filterHubList(views, { priorityOnly: true })).toHaveLength(9);
    expect(filterHubList(views, { priorityOnly: false })).toHaveLength(12);
  });

  it("pencarian tidak menghidupkan lagi hub yang tersaring filter prioritas", () => {
    const priorityOnlyAmbon = filterHubList(views, { priorityOnly: true, query: "ambon" });
    expect(priorityOnlyAmbon).toHaveLength(0);
    expect(filterHubList(views, { priorityOnly: false, query: "ambon" })).toHaveLength(1);
  });

  it("pencarian bekerja untuk kode hub, kota, dan provinsi", () => {
    expect(filterHubList(views, { query: "HUB_MKS" })).toHaveLength(1);
    expect(filterHubList(views, { query: "makassar" })).toHaveLength(1);
    expect(filterHubList(views, { query: "jawa" }).length).toBeGreaterThanOrEqual(4);
  });

  it("mengembalikan list kosong untuk kata kunci yang tidak ada", () => {
    expect(filterHubList(views, { query: "hub-antariks" })).toHaveLength(0);
  });
});

describe("tingkat keparahan (adaptasi pola desain Stitch)", () => {
  it("membagi hub ke Kritis/Tinggi/Waspada/Normal/Sampel kecil sesuai ambang data", () => {
    const counts = severityCounts(views);
    expect(counts.critical).toBe(1);
    expect(counts.high).toBe(3);
    expect(counts.watch).toBe(5);
    expect(counts.normal).toBe(2);
    expect(counts["low-sample"]).toBe(1);
    expect(
      counts.critical + counts.high + counts.watch + counts.normal + counts["low-sample"],
    ).toBe(views.length);
  });

  it("hub bersampel kecil selalu berstatus sampel kecil, apa pun mean-nya", () => {
    expect(severityFor({ mean_dwell_hours: 99, completed_visits: 36 })).toBe("low-sample");
    expect(SEVERITY_META["low-sample"].label).toBe("Sampel kecil");
  });

  it("status hub mengikuti mean mentah dan konsisten dengan prioritas", () => {
    const kritis = views.filter((hub) => hub.severity === "critical");
    const normal = views.filter((hub) => hub.severity === "normal");
    expect(kritis.map((hub) => hub.hub_id)).toEqual(["HUB_MKS"]);
    expect(kritis.every((hub) => hub.is_priority)).toBe(true);
    expect(normal.map((hub) => hub.hub_id)).toEqual(["HUB_BDG", "HUB_CGK"]);
    expect(normal.every((hub) => hub.is_priority === false)).toBe(true);
  });

  it("menampilkan angka dwell satu desimal untuk marker peta", () => {
    expect(formatHours(10.7002, { decimals: 1 })).toBe("10,7 jam");
    expect(formatHours(6.0054, { decimals: 1 })).toBe("6,0 jam");
  });
});

describe("format tampilan dan statistik", () => {
  it("menampilkan satuan jam dengan format Indonesia", () => {
    expect(formatHours(10.7)).toBe("10,70 jam");
    expect(formatHours(null)).toBe("—");
  });

  it("meringkas KPI dari data gabungan", () => {
    const stats = datasetStats(views);
    expect(stats.hub_count).toBe(12);
    expect(stats.completed_visits).toBe(21036);
    expect(stats.priority_hub_count).toBe(9);
    expect(stats.mappable_hub_count).toBe(12);
  });

  it("tetap aman ketika lokasi hub tidak lengkap", () => {
    const withoutCoordinates = buildHubViews(
      { hubs: [{ hub_id: "HUB_XXX", mean_dwell_hours: 7, completed_visits: 120 }] },
      { hubs: [] },
    );
    expect(withoutCoordinates[0].hub_name).toBe("HUB_XXX");
    expect(withoutCoordinates[0].has_coordinates).toBe(false);
    expect(withoutCoordinates[0].is_priority).toBe(true);
  });
});
