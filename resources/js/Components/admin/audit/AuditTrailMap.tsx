import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

interface AuditTrailMapProps {
  target: [number, number];
  courier?: [number, number] | null;
  radiusMeters: number;
  deviationMeters: number;
  courierLabel?: string;
}

function pinHtml(
  kind: "target" | "courier",
  icon: string,
  label: string,
): string {
  const tone =
    kind === "target"
      ? "bg-brand-magenta text-white"
      : "bg-alert-amber text-on-secondary-fixed";
  return `
    <div class="relative">
      <span class="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white ${tone} shadow-lg">
        <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24" aria-hidden="true">${icon}</span>
      </span>
      <span class="absolute left-1/2 top-1/2 mt-4 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">${label}</span>
    </div>`;
}

function createPin(kind: "target" | "courier", icon: string, label: string) {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: pinHtml(kind, icon, label),
  });
}

function FitBounds({
  target,
  courier,
  radiusMeters,
}: {
  target: [number, number];
  courier: [number, number] | null;
  radiusMeters: number;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([target]);
    bounds.extend(L.latLng(target).toBounds(radiusMeters * 2));

    if (courier) {
      bounds.extend(L.latLng(courier));
    }

    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 19 });
  }, [map, target, courier, radiusMeters]);

  return null;
}

export function AuditTrailMap({
  target,
  courier = null,
  radiusMeters,
  deviationMeters,
  courierLabel = "Kurir",
}: AuditTrailMapProps) {
  const targetIcon = useMemo(
    () => createPin("target", "flag", "Titik Tujuan"),
    [],
  );
  const courierIcon = useMemo(
    () =>
      createPin(
        "courier",
        "two_wheeler",
        `${courierLabel} +${deviationMeters} m`,
      ),
    [courierLabel, deviationMeters],
  );

  return (
    <MapContainer
      center={target}
      zoom={18}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "transparent" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={target}
        radius={radiusMeters}
        pathOptions={{
          color: "#e00065",
          weight: 1.5,
          fillColor: "#e00065",
          fillOpacity: 0.12,
        }}
      />
      <Circle
        center={target}
        radius={radiusMeters * 1.6}
        pathOptions={{
          color: "#e00065",
          weight: 1,
          fill: false,
          opacity: 0.5,
          dashArray: "4 6",
        }}
      />
      <Marker position={target} icon={targetIcon} />
      {courier ? <Marker position={courier} icon={courierIcon} /> : null}
      <FitBounds
        target={target}
        courier={courier}
        radiusMeters={radiusMeters}
      />
    </MapContainer>
  );
}
