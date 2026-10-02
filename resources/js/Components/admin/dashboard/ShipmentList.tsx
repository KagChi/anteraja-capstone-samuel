import type { ReactNode } from "react";
import type { DeliveryRow } from "../../../types";
import { DataTable } from "../../ui/DataTable";
import type { PaginationProps } from "../../ui/Pagination";
import { ShipmentEmptyState } from "./ShipmentEmptyState";
import { ShipmentItem } from "./ShipmentItem";

interface ShipmentListProps {
  shipments: DeliveryRow[];
  toolbar?: ReactNode;
  pagination?: PaginationProps;
}

export function ShipmentList({
  shipments,
  toolbar,
  pagination,
}: ShipmentListProps) {
  return (
    <DataTable
      title="Daftar Pengiriman"
      toolbar={toolbar}
      pagination={pagination}
    >
      <caption className="sr-only">
        Daftar pengiriman hari ini beserta status integritasnya
      </caption>
      <thead>
        <tr className="border-b border-border-subtle bg-surface-container-low/40 text-on-surface-variant/80">
          <th
            className="whitespace-nowrap px-5 py-3.5 text-label-sm font-bold uppercase tracking-wider"
            scope="col"
          >
            Kurir
          </th>
          <th
            className="whitespace-nowrap px-4 py-3.5 text-label-sm font-bold uppercase tracking-wider"
            scope="col"
          >
            Nomor Resi
          </th>
          <th
            className="whitespace-nowrap px-4 py-3.5 text-label-sm font-bold uppercase tracking-wider"
            scope="col"
          >
            Layanan
          </th>
          <th
            className="whitespace-nowrap px-4 py-3.5 text-label-sm font-bold uppercase tracking-wider"
            scope="col"
          >
            Status Integritas
          </th>
          <th
            className="hidden whitespace-nowrap px-4 py-3.5 text-label-sm font-bold uppercase tracking-wider lg:table-cell"
            scope="col"
          >
            Wilayah
          </th>
          <th
            className="whitespace-nowrap px-5 py-3.5 text-right text-label-sm font-bold uppercase tracking-wider"
            scope="col"
          >
            Aksi
          </th>
        </tr>
      </thead>
      <tbody
        className="divide-y divide-border-subtle/70"
        id="delivery-table-body"
      >
        {shipments.map((shipment) => (
          <ShipmentItem key={shipment.id} shipment={shipment} />
        ))}
        {shipments.length === 0 && <ShipmentEmptyState colSpan={6} />}
      </tbody>
    </DataTable>
  );
}
