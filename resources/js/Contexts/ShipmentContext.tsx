import { router } from "@inertiajs/react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAvatar } from "../Hooks/useAvatar";
import { PER_PAGE, useCursorPagination } from "../Hooks/useCursorPagination";
import { useLocationData } from "../Hooks/useLocationData";
import { usePostalSearch } from "../Hooks/usePostalSearch";
import type {
  AsyncResource,
  DeliveryCompletionResult,
  DeliveryProofResult,
  DeliveryRow,
  PostalResult,
  Province,
  Regency,
} from "../types";
import { useSession } from "./SessionContext";

export const ACTIVE_TRACKING = "AJ2509001001";
export const JAKARTA_PROVINCE_ID = "31";
export const DESTINATION_DISTRICT = "Kuningan Jakarta Selatan";

interface ShipmentContextValue {
  courierAvatar: AsyncResource<string>;
  provinces: AsyncResource<Province[]>;
  regencies: AsyncResource<Regency[]>;
  postal: AsyncResource<PostalResult[]>;
  postalQuery: string;
  searchPostal: (query: string) => void;
  shipments: DeliveryRow[];
  shipmentsResource: AsyncResource<{ data: DeliveryRow[] }>;
  shipmentsPagination: {
    page: number;
    hasPrev: boolean;
    hasNext: boolean;
    isLoading: boolean;
    prev: () => void;
    next: () => void;
  };
  getShipmentById: (id: string) => DeliveryRow | undefined;
  relation: string;
  setRelation: (relation: string) => void;
  pinVerified: boolean;
  setPinVerified: (value: boolean) => void;
  proof: DeliveryProofResult | null;
  setProof: (proof: DeliveryProofResult) => void;
  completion: DeliveryCompletionResult | null;
  setCompletion: (completion: DeliveryCompletionResult) => void;
}

const ShipmentContext = createContext<ShipmentContextValue | null>(null);

export function ShipmentProvider({
  children,
  initialPathname = "/",
}: {
  children: ReactNode;
  initialPathname?: string;
}) {
  const { session } = useSession();
  const [postalQuery, setPostalQuery] = useState(DESTINATION_DISTRICT);
  const [pathname, setPathname] = useState(initialPathname);

  useEffect(() => {
    return router.on("navigate", (event) => {
      setPathname(event.detail.page.url.split("?")[0]);
    });
  }, []);

  const needsRegencies = pathname.startsWith("/admin");
  const needsPostal =
    pathname.startsWith("/courier/verifikasi") ||
    pathname.startsWith("/admin/audit-trail");

  const courierAvatar = useAvatar(session?.name);
  const { provinces, regencies } = useLocationData(
    needsRegencies ? JAKARTA_PROVINCE_ID : null,
    needsRegencies,
  );
  const postal = usePostalSearch(needsPostal ? postalQuery : "");

  const shipmentsList = useCursorPagination<DeliveryRow>(
    "/api/v1/shipments",
    PER_PAGE,
  );
  const shipments = shipmentsList.items;
  const shipmentsResource: AsyncResource<{ data: DeliveryRow[] }> = {
    data:
      shipmentsList.isLoading || shipmentsList.isError
        ? null
        : { data: shipments },
    isLoading: shipmentsList.isLoading,
    isError: shipmentsList.isError,
    error: shipmentsList.isError ? new Error("Gagal memuat pengiriman.") : null,
    reload: shipmentsList.reload,
  };

  const [relation, setRelation] = useState("langsung");
  const [pinVerified, setPinVerified] = useState(false);
  const [proof, setProof] = useState<DeliveryProofResult | null>(null);
  const [completion, setCompletion] = useState<DeliveryCompletionResult | null>(
    null,
  );

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
        provinces,
        regencies,
        postal,
        postalQuery,
        searchPostal,
        shipments,
        shipmentsResource,
        shipmentsPagination: {
          page: shipmentsList.page,
          hasPrev: shipmentsList.hasPrev,
          hasNext: shipmentsList.hasNext,
          isLoading: shipmentsList.isLoading,
          prev: shipmentsList.prev,
          next: shipmentsList.next,
        },
        getShipmentById,
        relation,
        setRelation,
        pinVerified,
        setPinVerified,
        proof,
        setProof,
        completion,
        setCompletion,
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
