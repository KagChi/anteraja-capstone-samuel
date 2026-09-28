import { useState } from "react";
import { DashboardHeader } from "../../components/admin/dashboard/DashboardHeader";
import { DashboardStats } from "../../components/admin/dashboard/DashboardStats";
import {
  ShipmentFilters,
  type StatusFilter,
} from "../../components/admin/dashboard/ShipmentFilters";
import { ShipmentList } from "../../components/admin/dashboard/ShipmentList";
import { useSession } from "../../context/SessionContext";
import { useShipmentContext } from "../../context/ShipmentContext";
import { SHIPMENT_ROWS } from "../../data/shipments";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useSeo } from "../../hooks/useSeo";
import { useWelcomeToast } from "../../hooks/useWelcomeToast";

export function DashboardPage() {
  useSeo("/admin/dashboard");
  const { session } = useSession();
  const { regencies } = useShipmentContext();
  const name = session?.name ?? "Hub Admin Ops";
  useWelcomeToast(name);

  const [status, setStatus] = useState<StatusFilter>("review");
  const [service, setService] = useState("");
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);

  const query = debouncedSearch.trim().toLowerCase();
  const rows = SHIPMENT_ROWS.filter((row) => {
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

  const reviewCount = SHIPMENT_ROWS.filter(
    (row) => row.flag === "review",
  ).length;

  return (
    <>
      <main
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-space-lg px-4 py-space-md lg:px-8"
        id="konten-utama"
      >
        <header className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
          <DashboardHeader
            eyebrow="Integritas Operasional"
            shift="Shift Aktif (08:00 - 20:00)"
            title="Daftar Pengiriman"
            description="Pantau status integritas pengiriman kurir Satria hari ini secara real-time."
          />
          <DashboardStats
            total={142}
            reviewCount={reviewCount}
            verifiedCount={138}
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

        <ShipmentList shipments={rows} />
      </main>

      <footer className="border-t border-border-subtle px-4 py-6 text-[11px] text-on-surface-variant/70 lg:px-8">
        Anteraja Instant &bull; Satria Rapid Field Dispatch &bull; Data contoh
        untuk keperluan purwarupa.
      </footer>
    </>
  );
}
