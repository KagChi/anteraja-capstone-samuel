import { Link } from "react-router-dom";
import { initialOf } from "../../../lib/format";
import type { DeliveryRow } from "../../../types";
import { ServiceTag, StatusPill } from "../../Badges";
import { MaterialIcon } from "../../MaterialIcon";

interface ShipmentItemProps {
  shipment: DeliveryRow;
}

export function ShipmentItem({ shipment }: ShipmentItemProps) {
  return (
    <tr
      className={`delivery-row group transition-colors hover:bg-surface-container-low/40 ${
        shipment.highlight ? "bg-primary-fixed/10" : ""
      }`}
      data-flag={shipment.flag}
      data-service={shipment.service}
      data-region={shipment.region}
    >
      <th
        className="whitespace-nowrap px-5 py-3 align-middle font-normal"
        scope="row"
      >
        <p className="m-0 flex items-center gap-3">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-magenta/10 text-[11px] font-bold text-brand-magenta"
            aria-hidden="true"
          >
            {initialOf(shipment.courierName, "?")}
          </span>
          <span className="text-title-md font-semibold text-on-surface">
            {shipment.courierName}{" "}
            <span className="text-body-sm font-normal text-on-surface-variant/70">
              ({shipment.courierCode})
            </span>
          </span>
        </p>
      </th>
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <Link
          className="tabular-nums text-barcode-tracking font-bold text-on-surface hover:text-brand-magenta"
          to={shipment.href}
        >
          {shipment.tracking}
        </Link>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <ServiceTag service={shipment.service} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <StatusPill label={shipment.statusLabel} tone={shipment.statusTone} />
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 align-middle text-body-sm text-on-surface-variant lg:table-cell">
        {shipment.regionLabel}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right align-middle">
        <Link
          className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
            shipment.flag === "delivered"
              ? "text-on-surface-variant hover:text-on-surface"
              : "text-brand-magenta hover:opacity-80"
          }`}
          to={shipment.href}
        >
          {shipment.flag === "delivered" ? "Detail" : "Tinjau"}{" "}
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </td>
    </tr>
  );
}
