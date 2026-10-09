import L from "leaflet";
import { SEVERITY_META, formatHours, severityFor } from "./metrics.js";

/** Marker berbentuk pil berisi angka dwell, mengikuti pola desain Stitch (Kritis/Waspada/Normal). */
export function createHubIcon(hub) {
  const severity = hub.severity ?? severityFor(hub);
  const meta = SEVERITY_META[severity];

  if (severity === "low-sample") {
    return L.divIcon({
      className: "hub-marker-wrapper",
      html: '<span class="hub-pill hub-pill--dot hub-pill--low-sample" title="' + meta.label + '"></span>',
      iconSize: null,
      iconAnchor: null,
    });
  }

  return L.divIcon({
    className: "hub-marker-wrapper",
    html:
      '<span class="hub-pill hub-pill--' +
      severity +
      '">' +
      formatHours(hub.mean_dwell_hours, { decimals: 1 }) +
      "</span>",
    iconSize: null,
    iconAnchor: null,
  });
}

export const MAP_LEGEND = [
  { severity: "critical", label: "Kritis — mean ≥ 10 jam" },
  { severity: "high", label: "Tinggi — mean 8–10 jam" },
  { severity: "watch", label: "Waspada — mean 6–8 jam" },
  { severity: "normal", label: "Normal — mean < 6 jam" },
  { severity: "low-sample", label: "Sampel < 100 kunjungan" },
];

