import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { SHIPMENT_ROWS } from "../data/shipments";
import { TASKS } from "../data/tasks";
import { useAvatar } from "../hooks/useAvatar";
import { useLocationData } from "../hooks/useLocationData";
import { usePostalSearch } from "../hooks/usePostalSearch";
import { useProofPhoto } from "../hooks/useProofPhoto";
import type {
  AsyncResource,
  DeliveryRow,
  DeliveryTask,
  PostalResult,
  Province,
  Regency,
  ServiceSegment,
} from "../types";
import { useSession } from "./SessionContext";

export const ACTIVE_TRACKING = "ANT-INST-882910394";
export const JAKARTA_PROVINCE_ID = "31";
export const DESTINATION_DISTRICT = "Kebayoran Baru";

function taskToRow(task: DeliveryTask): DeliveryRow {
  const service: ServiceSegment =
    task.category === "instant" ? "instant" : "sameday";
  return {
    id: task.tracking,
    courierName: "Ahmad Satria",
    courierCode: "#STR-4821",
    tracking: task.tracking,
    service,
    flag: "review",
    statusLabel: `Dalam perjalanan \u2022 ${task.eta}`,
    statusTone: "amber",
    region: "jaksel",
    regionLabel: "Jak-Sel",
    regencyId: "3171",
    recipient: task.recipient,
    address: task.address,
    href: `/shipments/${task.tracking}`,
  };
}

interface ShipmentContextValue {
  courierAvatar: AsyncResource<string>;
  proofPhoto: AsyncResource<string>;
  provinces: AsyncResource<Province[]>;
  regencies: AsyncResource<Regency[]>;
  postal: AsyncResource<PostalResult[]>;
  postalQuery: string;
  searchPostal: (query: string) => void;
  shipments: DeliveryRow[];
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

  const searchPostal = useCallback((query: string) => {
    setPostalQuery(query);
  }, []);

  const getShipmentById = useCallback((id: string) => {
    const normalized = id.trim().toLowerCase();
    const row = SHIPMENT_ROWS.find(
      (item) =>
        item.id.toLowerCase() === normalized ||
        item.tracking.toLowerCase() === normalized,
    );
    if (row) return row;
    const task = TASKS.find(
      (item) => item.tracking.toLowerCase() === normalized,
    );
    return task ? taskToRow(task) : undefined;
  }, []);

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
        shipments: SHIPMENT_ROWS,
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
