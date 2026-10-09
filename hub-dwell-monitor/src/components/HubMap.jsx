import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { MAP_LEGEND, createHubIcon } from "../lib/mapIcons.js";
import { SEVERITY_META, formatHours, formatInteger } from "../lib/metrics.js";

const INDONESIA_CENTER = [-2.5489, 118.0149];
// Perkiraan kotak wilayah Indonesia (Sabang sampai Merauke), supaya peta tidak bisa digeser ke luar negeri.
const INDONESIA_BOUNDS = [
  [-11.5, 94.0],
  [6.5, 141.5],
];
const INDONESIA_MIN_ZOOM = 4;

/** Pengendali peta: ukuran ulang, fit bounds saat filter berubah, fly-to, dan pelacak zoom. */
function MapController({ hubs, selectedHub, onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(L.latLngBounds(INDONESIA_BOUNDS));
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    const publishZoom = () => onZoomChange(map.getZoom());
    map.on("zoomend", publishZoom);
    publishZoom();
    return () => {
      observer.disconnect();
      map.off("zoomend", publishZoom);
    };
  }, [map, onZoomChange]);

  useEffect(() => {
    if (hubs.length === 0) return;
    if (hubs.length === 1) {
      map.setView([hubs[0].lat, hubs[0].lng], 7, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(hubs.map((hub) => [hub.lat, hub.lng]));
    map.fitBounds(bounds, { padding: [40, 40], animate: false });
  }, [map, hubs]);

  useEffect(() => {
    if (!selectedHub) return;
    map.flyTo([selectedHub.lat, selectedHub.lng], Math.max(map.getZoom(), 7), { duration: 0.6 });
  }, [map, selectedHub]);

  return null;
}

export default function HubMap({ hubs, selectedHub, onSelect }) {
  const [zoom, setZoom] = useState(5);

  return (
    <section className="panel map-panel" aria-label="Peta lokasi hub">
      <header className="panel__head">
        <h2 className="panel__title">
          <span className="panel__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
          </span>
          Leaflet Map — Lokasi Hub
        </h2>
        <p className="panel__hint">{formatInteger(hubs.length)} marker · klik untuk detail</p>
      </header>

      <ul className="map-legend" aria-label="Legenda status peta">
        {MAP_LEGEND.map((item) => (
          <li key={item.severity}>
            <span className={"legend-chip legend-chip--" + item.severity}>
              <i aria-hidden="true" />
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="map-panel__frame">
        <MapContainer
          center={INDONESIA_CENTER}
          zoom={5}
          minZoom={INDONESIA_MIN_ZOOM}
          maxZoom={18}
          maxBounds={INDONESIA_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom
          zoomControl={false}
          className="map"
          data-testid="hub-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <ZoomControl />

          {hubs.map((hub) => {
            const severity = hub.severity ?? "normal";
            return (
              <Marker
                key={hub.hub_id}
                position={[hub.lat, hub.lng]}
                icon={createHubIcon(hub, { zoom })}
                title={hub.hub_name + " · mean " + formatHours(hub.mean_dwell_hours)}
                zIndexOffset={hub.is_priority ? 400 : 0}
                eventHandlers={{ click: () => onSelect(hub.hub_id) }}
                data-testid={"marker-" + hub.hub_id}
              >
                <Popup>
                  <div className="popup">
                    <span className={"status status--" + severity}>
                      <i aria-hidden="true" />
                      {SEVERITY_META[severity]?.label ?? "Tanpa status"}
                    </span>
                    <strong className="popup__name">{hub.hub_name}</strong>
                    <span className="popup__sub">
                      {hub.hub_id} · {hub.city}
                    </span>
                    <dl className="popup__grid">
                      <div>
                        <dt>Mean</dt>
                        <dd>{formatHours(hub.mean_dwell_hours)}</dd>
                      </div>
                      <div>
                        <dt>Median</dt>
                        <dd>{formatHours(hub.median_dwell_hours)}</dd>
                      </div>
                      <div>
                        <dt>Kunjungan</dt>
                        <dd>{formatInteger(hub.completed_visits)}</dd>
                      </div>
                      <div>
                        <dt>Rentang</dt>
                        <dd>
                          {formatHours(hub.min_dwell_hours, { withUnit: false, decimals: 1 })}–
                          {formatHours(hub.max_dwell_hours, { withUnit: false, decimals: 1 })} jam
                        </dd>
                      </div>
                    </dl>
                    <p className="popup__hint">Detail lengkap tampil di panel Hub Detail.</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <MapController hubs={hubs} selectedHub={selectedHub} onZoomChange={setZoom} />
        </MapContainer>

        {hubs.length === 0 ? (
          <p className="map-panel__empty">Tidak ada marker pada filter ini.</p>
        ) : null}
      </div>
    </section>
  );
}

/** Kontrol zoom dipindah ke kanan atas supaya legenda bawah tetap lega. */
function ZoomControl() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.zoom({ position: "topright" });
    control.addTo(map);
    return () => control.remove();
  }, [map]);
  return null;
}
