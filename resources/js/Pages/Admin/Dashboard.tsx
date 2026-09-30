import type { ReactNode } from "react";
import { useState } from "react";
import { DashboardHeader } from "../../Components/admin/dashboard/DashboardHeader";
import { DashboardStats } from "../../Components/admin/dashboard/DashboardStats";
import {
  ShipmentFilters,
  type StatusFilter,
} from "../../Components/admin/dashboard/ShipmentFilters";
import { ShipmentList } from "../../Components/admin/dashboard/ShipmentList";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { Spinner } from "../../Components/ui/Spinner";
import { useSession } from "../../Contexts/SessionContext";
import { useShipmentContext } from "../../Contexts/ShipmentContext";
import { useDebouncedValue } from "../../Hooks/useDebouncedValue";
import { useFetch } from "../../Hooks/useFetch";
import { useSeo } from "../../Hooks/useSeo";
import { useWelcomeToast } from "../../Hooks/useWelcomeToast";
import { AdminLayout } from "../../Layouts/AdminLayout";
import type { DashboardSummary } from "../../types";

export function DashboardPage() {
  useSeo("/admin/dashboard");
  const { session } = useSession();
  const { regencies, shipments, shipmentsResource } = useShipmentContext();
  const name = session?.name ?? "Hub Admin Ops";
  useWelcomeToast(name);

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

  const reviewCount = shipments.filter((row) => row.flag === "review").length;

  const summaryResource = useFetch<{ data: DashboardSummary }>(
    "/api/dashboard",
  );
  const summary = summaryResource.data?.data;

  return (
    <>
      <main
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-space-lg px-4 py-space-md lg:px-8"
        id="konten-utama"
      >
        <header className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
          <DashboardHeader
            eyebrow="Integritas Operasional"
            shift={summary?.shift ?? "Shift Aktif (08:00 - 20:00)"}
            title="Daftar Pengiriman"
            description="Pantau status integritas pengiriman kurir Satria hari ini secara real-time."
          />
          <DashboardStats
            total={summary?.total ?? 0}
            reviewCount={summary?.reviewCount ?? reviewCount}
            verifiedCount={summary?.verifiedCount ?? 0}
          />
        </header>

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

        {shipmentsResource.data && <ShipmentList shipments={rows} />}
      </main>

      <footer className="border-t border-border-subtle px-4 py-6 text-[11px] text-on-surface-variant/70 lg:px-8">
        Anteraja Instant &bull; Satria Rapid Field Dispatch &bull; Data contoh
        untuk keperluan purwarupa.
      </footer>
    </>
  );
}

export default DashboardPage;
DashboardPage.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;
