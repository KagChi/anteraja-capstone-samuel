import * as L from "leaflet";

export type MapPinKind = "target" | "courier" | "buyer" | "point";

const TONES: Record<MapPinKind, string> = {
  target: "bg-brand-magenta text-white",
  courier: "bg-sky-600 text-white",
  buyer: "bg-amber-500 text-white",
  point: "bg-emerald-600 text-white",
};

/**
 * Leaflet div-icon pin shared by the courier maps (geofence and matchmaking)
 * so every marker keeps the same shape and label treatment.
 */
export function createMapPin(kind: MapPinKind, icon: string, label: string) {
  const html = `
    <div class="relative">
      <span class="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white ${TONES[kind]} shadow-lg">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">${icon}</span>
      </span>
      <span class="absolute left-1/2 top-1/2 mt-4 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">${label}</span>
    </div>`;

  return L.divIcon({ className: "", iconSize: [0, 0], html });
}
