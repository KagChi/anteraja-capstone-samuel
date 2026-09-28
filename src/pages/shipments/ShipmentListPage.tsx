import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "../../components/MaterialIcon";
import { ShipmentCard } from "../../components/shipments/ShipmentCard";
import { Button } from "../../components/ui/Button";
import { useShipmentContext } from "../../context/ShipmentContext";
import { useToast } from "../../context/ToastContext";
import { useSeo } from "../../hooks/useSeo";
import type { ServiceSegment } from "../../types";

type ServiceFilter = "all" | ServiceSegment;

const FILTERS: { id: ServiceFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "instant", label: "Instant" },
  { id: "sameday", label: "Same-Day" },
  { id: "regular", label: "Reguler" },
];

export function ShipmentListPage() {
  useSeo("/shipments");
  const { shipments, getShipmentById } = useShipmentContext();
  const toast = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [service, setService] = useState<ServiceFilter>("all");

  const term = query.trim().toLowerCase();
  const rows = shipments.filter((row) => {
    const okService = service === "all" || row.service === service;
    const okSearch =
      !term ||
      `${row.tracking} ${row.courierName} ${row.recipient ?? ""} ${
        row.address ?? ""
      } ${row.regionLabel}`
        .toLowerCase()
        .includes(term);
    return okService && okSearch;
  });

  function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = query.trim();
    if (!code) {
      toast("Masukkan nomor resi terlebih dahulu.", "error");
      return;
    }
    const found = getShipmentById(code);
    if (!found) {
      toast(`Resi tidak ditemukan: ${code}`, "error");
      return;
    }
    navigate(`/shipments/${found.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
          Lacak Resi
        </h1>
        <p className="text-[13px] text-on-surface-variant">
          <span>{rows.length}</span> resi ditemukan &bull; masukkan nomor resi
          untuk membuka detail
        </p>
      </header>

      <form className="flex items-center gap-2" onSubmit={track}>
        <label className="relative block flex-1">
          <span className="sr-only">Cari nomor resi</span>
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
          />
          <input
            className="h-11 w-full rounded-xl border border-border-subtle bg-surface-container-low pl-9 pr-3 text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-brand-magenta focus:outline-none focus:ring-0"
            id="shipment-search"
            type="search"
            placeholder="Cari / lacak nomor resi..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button type="submit" variant="primary" className="h-11 shrink-0">
          <MaterialIcon name="my_location" className="text-[18px]" /> Lacak
        </Button>
      </form>

      <div
        className="flex items-center gap-1 overflow-x-auto rounded-[10px] bg-surface-container-high p-0.5 shadow-inner"
        role="tablist"
        aria-label="Filter layanan"
      >
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            variant="tab"
            active={service === item.id}
            className="flex-1 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[12px]"
            onClick={() => setService(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-subtle bg-surface-card px-4 py-10 text-center text-[13px] text-on-surface-variant">
          <MaterialIcon
            name="inbox"
            className="mb-2 block text-[32px] text-on-surface-variant/40"
          />
          Tidak ada resi yang cocok. Coba kata kunci lain.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0 md:grid md:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id}>
              <ShipmentCard shipment={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
