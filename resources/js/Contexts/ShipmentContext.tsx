import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { useAvatar } from "../Hooks/useAvatar";
import type {
  AsyncResource,
  DeliveryCompletionResult,
  DeliveryProofResult,
} from "../types";
import { useSession } from "./SessionContext";

interface ShipmentContextValue {
  courierAvatar: AsyncResource<string>;
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

export function ShipmentProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();

  const courierAvatar = useAvatar(session?.name);

  const [relation, setRelation] = useState("langsung");
  const [pinVerified, setPinVerified] = useState(false);
  const [proof, setProof] = useState<DeliveryProofResult | null>(null);
  const [completion, setCompletion] = useState<DeliveryCompletionResult | null>(
    null,
  );

  return (
    <ShipmentContext.Provider
      value={{
        courierAvatar,
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
