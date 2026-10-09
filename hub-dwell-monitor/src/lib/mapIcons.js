import L from "leaflet";
import { LABELLED_SEVERITIES, SEVERITY_META, formatHours, severityFor } from "./metrics.js";

/**
 * Marker peta mengikuti pola desain Stitch, dengan dua bentuk supaya peta tidak penuh:
 *   - pil berisi angka dwell untuk hub Kritis/Tinggi (dan hub prioritas lain saat zoom dekat);
 *   - titik berwarna untuk hub Waspada/Normal, kotak untuk sampel kecil.
 */
export function createHubIcon(hub, options = {}) {
  const zoom = options.zoom ?? 5;
  const severity = hub.severity ?? severityFor(hub);
  const meta = SEVERITY_META[severity];
  const showLabel = LABELLED_SEVERITIES.has(severity) || (hub.is_priority && zoom >= 7);

  if (severity === "low-sample" || !showLabel) {
    const size = severity === "low-sample" ? 12 : hub.is_priority ? 16 : 13;
    const shape = severity === "low-sample" ? "square" : "dot";
    return L.divIcon({
      className: "hub-marker-wrapper",
      html:
        '<span class="map-dot map-dot--' +
        severity +
        " map-dot--" +
        shape +
        '" style="width:' +
        size +
        "px;height:" +
        size +
        'px" title="' +
        meta.label +
        " · " +
        formatHours(hub.mean_dwell_hours) +
        '"></span>',
      iconSize: null,
      iconAnchor: null,
    });
  }

  return L.divIcon({
    className: "hub-marker-wrapper",
    html:
      '<span class="map-pill map-pill--' +
      severity +
      '"><i class="map-pill__dot"></i>' +
      formatHours(hub.mean_dwell_hours, { decimals: 1 }) +
      "</span>",
    iconSize: null,
    iconAnchor: null,
  });
}

export const MAP_LEGEND = [
  { severity: "critical", label: "Kritis ≥ 10 jam" },
  { severity: "high", label: "Tinggi 8–10 jam" },
  { severity: "watch", label: "Waspada 6–8 jam" },
  { severity: "normal", label: "Normal < 6 jam" },
  { severity: "low-sample", label: "Sampel < 100" },
];

