import { router } from "@inertiajs/react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { PageHeader } from "../../Components/layout/PageHeader";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { ShipmentCard } from "../../Components/shipments/ShipmentCard";
import { Button } from "../../Components/ui/Button";
import { FilterTab, FilterTabs } from "../../Components/ui/FilterBar";
import { Pagination } from "../../Components/ui/Pagination";
import { StatusPanel } from "../../Components/ui/StatusPanel";
import { TextField } from "../../Components/ui/TextField";
import { useToast } from "../../Contexts/ToastContext";
import { PER_PAGE, useCursorPagination } from "../../Hooks/useCursorPagination";
import { useDebouncedValue } from "../../Hooks/useDebouncedValue";
import { useSeo } from "../../Hooks/useSeo";
import { MainLayout } from "../../Layouts/MainLayout";
import type { DeliveryRow, ServiceSegment } from "../../types";

type ServiceFilter = "all" | ServiceSegment;

const FILTERS: { id: ServiceFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "instant", label: "Instant" },
  { id: "sameday", label: "Same-Day" },
  { id: "regular", label: "Reguler" },
];

export function ShipmentListPage() {
  useSeo("/shipments");
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [service, setService] = useState<ServiceFilter>("all");
  const debouncedQuery = useDebouncedValue(query, 300);

  // Search and service filtering run on the server.
  const list = useCursorPagination<DeliveryRow>("/api/v1/shipments", PER_PAGE, {
    search: debouncedQuery.trim() || undefined,
    service: service === "all" ? undefined : service,
  });
  const rows = list.items;

  function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = query.trim();
    if (!code) {
      toast("Masukkan nomor resi terlebih dahulu.", "error");
      return;
    }
    router.visit(`/shipments/${encodeURIComponent(code)}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Lacak Resi"
        description={`${rows.length} resi ditampilkan • masukkan nomor resi untuk membuka detail`}
      />

      <form className="flex items-center gap-2" onSubmit={track}>
        <TextField
          className="flex-1"
          label="Cari nomor resi"
          icon="search"
          id="shipment-search"
          type="search"
          placeholder="Cari / lacak nomor resi..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" variant="primary" className="h-11 shrink-0">
          <MaterialIcon name="my_location" className="text-[18px]" /> Lacak
        </Button>
      </form>

      <FilterTabs id="shipment-tabs" label="Filter layanan" fill>
        {FILTERS.map((item) => (
          <FilterTab
            key={item.id}
            active={service === item.id}
            grow
            onClick={() => setService(item.id)}
          >
            {item.label}
          </FilterTab>
        ))}
      </FilterTabs>

      {list.isLoading ? (
        <StatusPanel spinning>Memuat resi dari server...</StatusPanel>
      ) : list.isError ? (
        <StatusPanel
          tone="error"
          action={
            <Button
              variant="text"
              className="text-[12px]"
              onClick={list.reload}
            >
              Coba lagi
            </Button>
          }
        >
          Gagal memuat resi dari server.
        </StatusPanel>
      ) : rows.length === 0 ? (
        <StatusPanel icon="inbox">
          Tidak ada resi yang cocok. Coba kata kunci lain.
        </StatusPanel>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0 md:grid md:grid-cols-2">
          {rows.map((row) => (
            <li key={row.id}>
              <ShipmentCard shipment={row} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={list.page}
        hasPrev={list.hasPrev}
        hasNext={list.hasNext}
        isLoading={list.isLoading}
        onPrev={list.prev}
        onNext={list.next}
      />
    </div>
  );
}

export default ShipmentListPage;
ShipmentListPage.layout = (page: ReactNode) => <MainLayout>{page}</MainLayout>;
