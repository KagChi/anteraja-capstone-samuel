import { Link } from "@inertiajs/react";
import { initialOf } from "../../lib/format";
import type { DeliveryRow } from "../../types";
import { ServiceTag, StatusPill } from "../Badges";
import { MaterialIcon } from "../MaterialIcon";

interface ShipmentCardProps {
  shipment: DeliveryRow;
}

export function ShipmentCard({ shipment }: ShipmentCardProps) {
  return (
    <Link
      href={`/shipments/${shipment.id}`}
      className="group flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-card p-4 shadow-card transition-all hover:border-brand-magenta/30 hover:shadow-active"
      data-flag={shipment.flag}
      data-tracking={shipment.tracking}
    >
      <header className="flex items-center justify-between gap-2">
        <ServiceTag service={shipment.service} />
        <StatusPill label={shipment.statusLabel} tone={shipment.statusTone} />
      </header>
      <section className="min-w-0">
        <h2 className="tabular-nums truncate text-barcode-tracking text-on-surface group-hover:text-brand-magenta">
          {shipment.tracking}
        </h2>
        <p className="mt-1 truncate text-[14px] font-semibold text-on-surface">
          {shipment.recipient ?? "Penerima"}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-on-surface-variant">
          {shipment.address ?? shipment.regionLabel}
        </p>
      </section>
      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-black/[0.05] pt-3">
        <span className="flex min-w-0 items-center gap-2 text-[12px] text-on-surface-variant/80">
          <span
            className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-magenta/10 text-[10px] font-bold text-brand-magenta"
            aria-hidden="true"
          >
            {initialOf(shipment.courierName, "?")}
          </span>
          <span className="truncate">
            {shipment.courierName}
            <span className="text-on-surface-variant/60">
              {" "}
              &bull; {shipment.regionLabel}
            </span>
          </span>
        </span>
        <MaterialIcon
          name="arrow_forward"
          className="text-[18px] text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-brand-magenta"
        />
      </footer>
    </Link>
  );
}
