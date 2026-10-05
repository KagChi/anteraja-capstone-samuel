import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { createMapPin } from "./mapPins";

interface MeetingPointMapProps {
  target: [number, number];
  radiusMeters: number;
  courier?: [number, number] | null;
  buyer?: [number, number] | null;
  point?: [number, number] | null;
  /** When provided, tapping the map reports the coordinates for the point. */
  onPick?: (latitude: number, longitude: number) => void;
}

function ClickHandler({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function FitPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map(([lat, lng]) => `${lat},${lng}`).join("|");

  // biome-ignore lint/correctness/useExhaustiveDependencies: the serialised key captures the points
  useEffect(() => {
    if (points.length === 0) return;

    const bounds = L.latLngBounds(
      points.map(([lat, lng]) => L.latLng(lat, lng)),
    );

    map.fitBounds(bounds.pad(0.35), { padding: [26, 26], maxZoom: 19 });
  }, [map, key]);

  return null;
}

/**
 * FRD-04 map: destination + radius, the courier's live fix, the buyer's
 * reported position and the proposed meeting point. Interactive when the
 * caller passes `onPick` (courier picker and the admin override).
 */
export function MeetingPointMap({
  target,
  radiusMeters,
  courier = null,
  buyer = null,
  point = null,
  onPick,
}: MeetingPointMapProps) {
  const targetIcon = useMemo(
    () => createMapPin("target", "flag", "Titik tujuan"),
    [],
  );
  const courierIcon = useMemo(
    () => createMapPin("courier", "two_wheeler", "Posisi Anda"),
    [],
  );
  const buyerIcon = useMemo(
    () => createMapPin("buyer", "person", "Posisi pembeli"),
    [],
  );
  const pointIcon = useMemo(
    () => createMapPin("point", "handshake", "Titik temu"),
    [],
  );

  const points: [number, number][] = [
    target,
    ...(courier ? [courier] : []),
    ...(buyer ? [buyer] : []),
    ...(point ? [point] : []),
  ];

  return (
    <MapContainer
      center={target}
      zoom={17}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
      style={{
        background: "transparent",
        cursor: onPick ? "crosshair" : "grab",
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
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
      <Marker position={target} icon={targetIcon} />
      {courier ? <Marker position={courier} icon={courierIcon} /> : null}
      {buyer ? <Marker position={buyer} icon={buyerIcon} /> : null}
      {point ? <Marker position={point} icon={pointIcon} /> : null}
      {onPick ? <ClickHandler onPick={onPick} /> : null}
      <FitPoints points={points} />
    </MapContainer>
  );
}
