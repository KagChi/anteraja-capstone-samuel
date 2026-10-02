import { Link } from "@inertiajs/react";
import type { DeliveryFlag, DeliveryRow } from "../../../types";
import { ServiceTag, StatusPill } from "../../Badges";
import { MaterialIcon } from "../../MaterialIcon";
import { Button } from "../../ui/Button";

const ACTION_ICON: Record<DeliveryFlag, string> = {
  exception: "approval",
  review: "visibility",
  delivered: "visibility",
};

const ACTION_LABEL: Record<DeliveryFlag, string> = {
  exception: "Tinjau pengecualian",
  review: "Tinjau audit trail",
  delivered: "Lihat detail audit trail",
};

interface ShipmentItemProps {
  shipment: DeliveryRow;
}

export function ShipmentItem({ shipment }: ShipmentItemProps) {
  const detailHref =
    shipment.flag === "exception"
      ? `/admin/antrian-pengecualian?open=${encodeURIComponent(shipment.tracking)}`
      : `/admin/audit-trail/${encodeURIComponent(shipment.id)}`;

  return (
    <tr
      className={`delivery-row transition-colors hover:bg-surface-container-low/40 ${
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
        <p className="m-0 text-title-md font-semibold text-on-surface">
          {shipment.courierName}{" "}
          <span className="text-body-sm font-normal text-on-surface-variant/70">
            ({shipment.courierCode})
          </span>
        </p>
      </th>
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <Link
          className="tabular-nums text-barcode-tracking font-bold text-on-surface hover:text-brand-magenta"
          href={detailHref}
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
        <Button
          as="link"
          to={detailHref}
          variant="icon"
          aria-label={ACTION_LABEL[shipment.flag]}
          title={ACTION_LABEL[shipment.flag]}
        >
          <MaterialIcon
            name={ACTION_ICON[shipment.flag]}
            className="text-[18px]"
          />
        </Button>
      </td>
    </tr>
  );
}
