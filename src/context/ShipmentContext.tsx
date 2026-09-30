import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { useAvatar } from "../hooks/useAvatar";
import { useFetch } from "../hooks/useFetch";
import { useLocationData } from "../hooks/useLocationData";
import { usePostalSearch } from "../hooks/usePostalSearch";
import { useProofPhoto } from "../hooks/useProofPhoto";
import type {
  AsyncResource,
  DeliveryRow,
  PostalResult,
  Province,
  Regency,
} from "../types";
import { useSession } from "./SessionContext";

export const ACTIVE_TRACKING = "ANT-INST-882910394";
export const JAKARTA_PROVINCE_ID = "31";
export const DESTINATION_DISTRICT = "Kebayoran Baru";

interface ShipmentContextValue {
  courierAvatar: AsyncResource<string>;
  proofPhoto: AsyncResource<string>;
  provinces: AsyncResource<Province[]>;
  regencies: AsyncResource<Regency[]>;
  postal: AsyncResource<PostalResult[]>;
  postalQuery: string;
  searchPostal: (query: string) => void;
  shipments: DeliveryRow[];
  shipmentsResource: AsyncResource<{ data: DeliveryRow[] }>;
  getShipmentById: (id: string) => DeliveryRow | undefined;
}

const ShipmentContext = createContext<ShipmentContextValue | null>(null);

export function ShipmentProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [postalQuery, setPostalQuery] = useState(DESTINATION_DISTRICT);

  const courierAvatar = useAvatar(session?.name);
  const proofPhoto = useProofPhoto(ACTIVE_TRACKING);
  const { provinces, regencies } = useLocationData(JAKARTA_PROVINCE_ID);
  const postal = usePostalSearch(postalQuery);

  const shipmentsResource = useFetch<{ data: DeliveryRow[] }>("/api/shipments");
  const shipments = shipmentsResource.data?.data ?? [];

  const searchPostal = useCallback((query: string) => {
    setPostalQuery(query);
  }, []);

  const getShipmentById = useCallback(
    (id: string) => {
      const normalized = id.trim().toLowerCase();
      const row = shipments.find(
        (item) =>
          item.id.toLowerCase() === normalized ||
          item.tracking.toLowerCase() === normalized,
      );
      return row;
    },
    [shipments],
  );

  return (
    <ShipmentContext.Provider
      value={{
        courierAvatar,
        proofPhoto,
        provinces,
        regencies,
        postal,
        postalQuery,
        searchPostal,
        shipments,
        shipmentsResource,
        getShipmentById,
      }}
    >
      {children}
    </ShipmentContext.Provider>
  );
}

export function useShipmentContext(): ShipmentContextValue {
  const context = useContext(ShipmentContext);
  if (!context) {
    throw new Error(
      "useShipmentContext must be used within a ShipmentProvider",
    );
  }
  return context;
}
