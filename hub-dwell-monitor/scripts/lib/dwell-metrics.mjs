/**
 * dwell-metrics.mjs - logika murni turunan dwell time (dipakai script data & unit test).
 *
 * Aturan mengikuti analisis PySpark Day 18:
 *   parse timestamp -> drop duplikat -> pairing ARRIVAL/DEPARTURE per hub x paket
 *   -> buang pasangan tidak lengkap dan DEPARTURE <= ARRIVAL -> dwell time dalam jam.
 *
 * Kunjungan yang belum selesai (open visits: ARRIVAL tanpa DEPARTURE) TIDAK dihitung
 * sebagai completed visit dan TIDAK masuk ke perhitungan mean dwell time.
 */

/** Ambang simulasi latihan Day 19 - bukan SLA resmi Anteraja. */
export const PRIORITY_RULES = {
  min_mean_dwell_hours: 6,
  min_completed_visits: 100,
  disclaimer: "Ambang 6 jam hanya aturan simulasi latihan Day 19, bukan SLA resmi Anteraja.",
};

const round = (value, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((column) => column.trim());
  return lines
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const cells = line.split(",");
      const row = {};
      header.forEach((column, index) => {
        row[column] = (cells[index] ?? "").trim();
      });
      return row;
    });
}

export function parseTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match.map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59 || ss > 59) return null;
  const utc = Date.UTC(y, m - 1, d, hh, mm, ss);
  const date = new Date(utc);
  // tolak tanggal yang meluber, contoh 2026-02-30 -> 2026-03-02
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return utc;
}

export function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function deriveMetrics(csvText) {
  const rawRows = parseCsv(csvText);
  const quality = {
    raw_events: rawRows.length,
    invalid_timestamp: 0,
    duplicate_scans: 0,
    package_hub_pairs: 0,
    missing_arrival: 0,
    missing_departure: 0,
    departure_not_after_arrival: 0,
    excluded_pairs: 0,
    completed_visits: 0,
  };

  const seen = new Set();
  const events = [];
  for (const row of rawRows) {
    const timestamp = parseTimestamp(row.timestamp);
    if (timestamp === null) {
      quality.invalid_timestamp += 1;
      continue;
    }
    const dedupeKey = [row.hub_id, row.package_id, row.event_type, row.timestamp].join("|");
    if (seen.has(dedupeKey)) {
      quality.duplicate_scans += 1;
      continue;
    }
    seen.add(dedupeKey);
    events.push({
      hub_id: row.hub_id,
      package_id: row.package_id,
      event_type: row.event_type,
      timestamp,
    });
  }

  const pairs = new Map();
  for (const event of events) {
    const key = event.hub_id + "|" + event.package_id;
    const pair = pairs.get(key) ?? {
      hub_id: event.hub_id,
      package_id: event.package_id,
      arrivals: 0,
      departures: 0,
      firstArrival: null,
      lastDeparture: null,
    };
    if (event.event_type === "ARRIVAL") {
      pair.arrivals += 1;
      if (pair.firstArrival === null || event.timestamp < pair.firstArrival) {
        pair.firstArrival = event.timestamp;
      }
    } else if (event.event_type === "DEPARTURE") {
      pair.departures += 1;
      if (pair.lastDeparture === null || event.timestamp > pair.lastDeparture) {
        pair.lastDeparture = event.timestamp;
      }
    }
    pairs.set(key, pair);
  }
  quality.package_hub_pairs = pairs.size;

  const dwellByHub = new Map();
  for (const pair of pairs.values()) {
    if (pair.arrivals === 0) {
      quality.missing_arrival += 1;
      continue;
    }
    if (pair.departures === 0) {
      quality.missing_departure += 1;
      continue;
    }
    const dwellHours = (pair.lastDeparture - pair.firstArrival) / 3600000;
    if (dwellHours <= 0) {
      quality.departure_not_after_arrival += 1;
      continue;
    }
    const bucket = dwellByHub.get(pair.hub_id) ?? [];
    bucket.push(dwellHours);
    dwellByHub.set(pair.hub_id, bucket);
  }

  quality.completed_visits = [...dwellByHub.values()].reduce((total, bucket) => total + bucket.length, 0);
  quality.excluded_pairs =
    quality.missing_arrival + quality.missing_departure + quality.departure_not_after_arrival;

  const hubs = [...dwellByHub.entries()]
    .map(([hub_id, values]) => ({
      hub_id,
      completed_visits: values.length,
      mean_dwell_hours: round(values.reduce((total, value) => total + value, 0) / values.length),
      median_dwell_hours: round(median(values)),
      min_dwell_hours: round(Math.min(...values)),
      max_dwell_hours: round(Math.max(...values)),
      p90_dwell_hours: round(percentile(values, 0.9)),
    }))
    .sort((a, b) => b.mean_dwell_hours - a.mean_dwell_hours || a.hub_id.localeCompare(b.hub_id));

  const allDwell = [...dwellByHub.values()].flat();
  const completedVisits = allDwell.length;
  const meanDwell = completedVisits > 0 ? allDwell.reduce((total, value) => total + value, 0) / completedVisits : null;

  const enrichedHubs = hubs.map((hub, index) => ({
    ...hub,
    mean_rank: index + 1,
    sample_sufficient: hub.completed_visits >= PRIORITY_RULES.min_completed_visits,
    is_priority:
      hub.mean_dwell_hours >= PRIORITY_RULES.min_mean_dwell_hours &&
      hub.completed_visits >= PRIORITY_RULES.min_completed_visits,
  }));

  return {
    quality,
    global: {
      hub_count: enrichedHubs.length,
      completed_visits: completedVisits,
      open_visits: quality.missing_departure,
      mean_dwell_hours: round(meanDwell),
      median_dwell_hours: round(median(allDwell)),
      priority_hub_count: enrichedHubs.filter((hub) => hub.is_priority).length,
    },
    hubs: enrichedHubs,
  };
}

