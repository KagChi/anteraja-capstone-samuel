import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { createMapPin } from "./mapPins";

interface GeofenceMapProps {
  target: [number, number];
  courier: [number, number] | null;
  radiusMeters: number;
  distanceMeters: number | null;
}

function FitBounds({
  targetLat,
  targetLng,
  courierLat,
  courierLng,
  radiusMeters,
}: {
  targetLat: number;
  targetLng: number;
  courierLat: number | null;
  courierLng: number | null;
  radiusMeters: number;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLng(targetLat, targetLng).toBounds(radiusMeters * 2.6);

    if (courierLat !== null && courierLng !== null) {
      bounds.extend(L.latLng(courierLat, courierLng));
    }

    map.fitBounds(bounds, { padding: [26, 26], maxZoom: 19 });
  }, [map, targetLat, targetLng, courierLat, courierLng, radiusMeters]);

  return null;
}

/**
 * Live geofence check for the courier: the destination, its radius and the
 * device fix on one map so the courier can confirm the drop-off location
 * before taking the proof photo.
 */
export function GeofenceMap({
  target,
  courier,
  radiusMeters,
  distanceMeters,
}: GeofenceMapProps) {
  const [targetLat, targetLng] = target;
  const courierLat = courier?.[0] ?? null;
  const courierLng = courier?.[1] ?? null;

  const targetIcon = useMemo(
    () => createMapPin("target", "flag", "Titik tujuan"),
    [],
  );
  const courierIcon = useMemo(
    () =>
      createMapPin(
        "courier",
        "two_wheeler",
        distanceMeters !== null ? `Anda +${distanceMeters} m` : "Anda",
      ),
    [distanceMeters],
  );

  return (
    <MapContainer
      center={target}
      zoom={18}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
      style={{ background: "transparent" }}
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
      {courierLat !== null && courierLng !== null ? (
        <Marker position={[courierLat, courierLng]} icon={courierIcon} />
      ) : null}
      <FitBounds
        targetLat={targetLat}
        targetLng={targetLng}
        courierLat={courierLat}
        courierLng={courierLng}
        radiusMeters={radiusMeters}
      />
    </MapContainer>
  );
}
