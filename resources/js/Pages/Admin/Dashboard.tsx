import type { ReactNode } from "react";
import { useState } from "react";
import {
  ShipmentFilters,
  type StatusFilter,
} from "../../Components/admin/dashboard/ShipmentFilters";
import { ShipmentList } from "../../Components/admin/dashboard/ShipmentList";
import { PageHeader } from "../../Components/layout/PageHeader";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { Spinner } from "../../Components/ui/Spinner";
import { useShipmentContext } from "../../Contexts/ShipmentContext";
import { useDebouncedValue } from "../../Hooks/useDebouncedValue";
import { useSeo } from "../../Hooks/useSeo";
import { AdminLayout } from "../../Layouts/AdminLayout";

export function DashboardPage() {
  useSeo("/admin/dashboard");
  const { regencies, shipments, shipmentsResource, shipmentsPagination } =
    useShipmentContext();

  const [status, setStatus] = useState<StatusFilter>("review");
  const [service, setService] = useState("");
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);

  const query = debouncedSearch.trim().toLowerCase();
  const rows = shipments.filter((row) => {
    const okStatus = status === "all" || row.flag === status;
    const okService = !service || row.service === service;
    const okRegion = !region || row.regencyId === region;
    const okSearch =
      !query ||
      `${row.courierName} ${row.courierCode} ${row.tracking} ${row.statusLabel}`
        .toLowerCase()
        .includes(query);
    return okStatus && okService && okRegion && okSearch;
  });

  return (
    <>
      <PageHeader
        title="Daftar Pengiriman"
        description="Pantau status integritas pengiriman kurir Satria hari ini."
      />

      {shipmentsResource.isLoading && (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-container-lowest px-4 py-10 text-body-sm text-on-surface-variant">
          <Spinner /> Memuat data pengiriman dari server...
        </p>
      )}

      {shipmentsResource.isError && (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-surface-container-lowest px-4 py-10 text-body-sm text-on-surface-variant">
          <MaterialIcon name="cloud_off" className="text-[18px]" />
          Gagal memuat data dari server.
          <Button
            variant="text"
            className="text-[12px]"
            onClick={shipmentsResource.reload}
          >
            Coba lagi
          </Button>
        </p>
      )}

      {shipmentsResource.data && (
        <ShipmentList
          shipments={rows}
          toolbar={
            <ShipmentFilters
              status={status}
              service={service}
              region={region}
              search={search}
              regions={regencies.data ?? []}
              regionsLoading={regencies.isLoading}
              onStatusChange={setStatus}
              onServiceChange={setService}
              onRegionChange={setRegion}
              onSearchChange={setSearch}
            />
          }
          pagination={{
            page: shipmentsPagination.page,
            hasPrev: shipmentsPagination.hasPrev,
            hasNext: shipmentsPagination.hasNext,
            isLoading: shipmentsPagination.isLoading,
            onPrev: shipmentsPagination.prev,
            onNext: shipmentsPagination.next,
          }}
        />
      )}
    </>
  );
}

export default DashboardPage;
DashboardPage.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;
