import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { MAP_LEGEND, createHubIcon } from "../lib/mapIcons.js";
import { SEVERITY_META, formatHours, formatInteger } from "../lib/metrics.js";

const INDONESIA_CENTER = [-2.5489, 118.0149];

/** Pengendali peta: ukuran ulang, fit bounds saat filter berubah, dan fly-to saat hub dipilih. */
function MapController({ hubs, selectedHub }) {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

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
  return (
    <section className="panel map-panel" aria-label="Peta lokasi hub">
      <header className="panel__header">
        <h2 className="panel__title">Leaflet Map — Lokasi Hub</h2>
        <p className="panel__subtitle">
          {formatInteger(hubs.length)} marker tampil sesuai filter prioritas. Klik marker untuk
          membuka detail hub.
        </p>
      </header>

      <div className="map-panel__frame">
        <MapContainer
          center={INDONESIA_CENTER}
          zoom={5}
          minZoom={4}
          maxZoom={18}
          scrollWheelZoom
          className="map"
          data-testid="hub-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          {hubs.map((hub) => (
            <Marker
              key={hub.hub_id}
              position={[hub.lat, hub.lng]}
              icon={createHubIcon(hub)}
              title={hub.hub_name + " · mean " + formatHours(hub.mean_dwell_hours)}
              zIndexOffset={hub.is_priority ? 400 : 0}
              eventHandlers={{ click: () => onSelect(hub.hub_id) }}
              data-testid={"marker-" + hub.hub_id}
            >
              <Popup>
                <strong>{hub.hub_name}</strong>
                <br />
                {hub.hub_id} · {hub.city}
                <br />
                mean {formatHours(hub.mean_dwell_hours)} · {formatInteger(hub.completed_visits)}{" "}
                kunjungan
                <br />
                <span className={"popup-badge is-" + hub.severity}>
                  {SEVERITY_META[hub.severity]?.label ?? "Tanpa status"}
                </span>
                <br />
                <small>Detail lengkap tampil di panel Hub Detail.</small>
              </Popup>
            </Marker>
          ))}

          <MapController hubs={hubs} selectedHub={selectedHub} />
        </MapContainer>

        <ul className="map-legend" aria-label="Legenda peta">
          {MAP_LEGEND.map((item) => (
            <li key={item.severity}>
              <span className={"legend-dot legend-dot--" + item.severity} /> {item.label}
            </li>
          ))}
        </ul>
      </div>

      {hubs.length === 0 ? (
        <p className="empty-inline">Tidak ada marker pada filter ini.</p>
      ) : null}
    </section>
  );
}

