import type { DeliveryRow } from "../../../types";
import { ShipmentEmptyState } from "./ShipmentEmptyState";
import { ShipmentItem } from "./ShipmentItem";

interface ShipmentListProps {
  shipments: DeliveryRow[];
}

export function ShipmentList({ shipments }: ShipmentListProps) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface-container-lowest shadow-sm"
      aria-label="Tabel pengiriman"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-container-low/40 px-5 py-3">
        <p className="m-0 text-[12px] text-on-surface-variant">
          Menampilkan{" "}
          <strong className="text-on-surface" id="visible-count">
            {shipments.length}
          </strong>{" "}
          pengiriman
        </p>
        <p className="m-0 hidden text-[12px] text-on-surface-variant sm:block">
          Klik <strong className="text-on-surface">Tinjau</strong> untuk membuka
          audit trail
        </p>
      </header>
      <table className="w-full border-collapse text-left">
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
      </table>
    </section>
  );
}
