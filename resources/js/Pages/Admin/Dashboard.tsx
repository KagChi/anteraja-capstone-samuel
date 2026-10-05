import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ShipmentFilters,
  type StatusFilter,
} from "../../Components/admin/dashboard/ShipmentFilters";
import { ShipmentList } from "../../Components/admin/dashboard/ShipmentList";
import { PageHeader } from "../../Components/layout/PageHeader";
import { Button } from "../../Components/ui/Button";
import { StatusPanel } from "../../Components/ui/StatusPanel";
import { PER_PAGE, useCursorPagination } from "../../Hooks/useCursorPagination";
import { useDebouncedValue } from "../../Hooks/useDebouncedValue";
import { useLocationData } from "../../Hooks/useLocationData";
import { useSeo } from "../../Hooks/useSeo";
import { AdminLayout } from "../../Layouts/AdminLayout";
import type { DeliveryRow } from "../../types";

export function DashboardPage() {
  useSeo("/admin/dashboard");

  const [status, setStatus] = useState<StatusFilter>("all");
  const [service, setService] = useState("");
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);

  // Filtering and search run on the server; the client renders the returned
  // page and only drives the cursors.
  const list = useCursorPagination<DeliveryRow>("/api/v1/shipments", PER_PAGE, {
    status: status === "all" ? undefined : status,
    service: service || undefined,
    region: region || undefined,
    search: debouncedSearch.trim() || undefined,
  });
  const rows = list.items;

  // Region options follow the provinces present in the loaded rows, so no
  // region id is configured by hand.
  const provinceId = useMemo(() => {
    const prefixes = new Set(
      rows
        .map((row) => row.regencyId?.slice(0, 2))
        .filter((prefix): prefix is string => Boolean(prefix)),
    );

    return prefixes.size === 1 ? ([...prefixes][0] ?? null) : null;
  }, [rows]);
  const { regencies } = useLocationData(provinceId);

  return (
    <>
      <PageHeader
        title="Daftar Pengiriman"
        description="Pantau status integritas pengiriman kurir Satria hari ini."
      />

      {list.isLoading && rows.length === 0 && (
        <StatusPanel spinning>
          Memuat data pengiriman dari server...
        </StatusPanel>
      )}

      {list.isError && rows.length === 0 && (
        <StatusPanel
          icon="cloud_off"
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
          Gagal memuat data dari server.
        </StatusPanel>
      )}

      {rows.length > 0 || (!list.isLoading && !list.isError) ? (
        <ShipmentList
          shipments={rows}
          isRefreshing={list.isRefreshing}
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
            page: list.page,
            hasPrev: list.hasPrev,
            hasNext: list.hasNext,
            isLoading: list.isLoading,
            onPrev: list.prev,
            onNext: list.next,
          }}
        />
      ) : null}
    </>
  );
}

export default DashboardPage;
DashboardPage.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;
