import type { DeliveryFlag } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";

export type StatusFilter = "all" | DeliveryFlag;

const TABS: { id: StatusFilter; label: string; dot?: boolean }[] = [
  { id: "all", label: "Semua" },
  { id: "review", label: "Perlu Tinjauan", dot: true },
  { id: "delivered", label: "Terkirim" },
  { id: "exception", label: "Pengecualian" },
];

interface ShipmentFiltersProps {
  status: StatusFilter;
  service: string;
  region: string;
  search: string;
  onStatusChange: (status: StatusFilter) => void;
  onServiceChange: (service: string) => void;
  onRegionChange: (region: string) => void;
  onSearchChange: (search: string) => void;
}

export function ShipmentFilters({
  status,
  service,
  region,
  search,
  onStatusChange,
  onServiceChange,
  onRegionChange,
  onSearchChange,
}: ShipmentFiltersProps) {
  return (
    <section
      className="flex flex-col items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm shadow-sm md:flex-row"
      aria-label="Filter dan pencarian"
    >
      <div
        className="flex w-full items-center rounded-lg bg-surface-container p-1 md:w-auto"
        id="filter-tabs"
        role="tablist"
        aria-label="Filter status"
      >
        {TABS.map((tab) => {
          const isActive = status === tab.id;
          return (
            <button
              key={tab.id}
              className={`filter-tab flex items-center gap-1.5 rounded px-space-md py-1 text-label-md transition-all ${
                isActive
                  ? "bg-surface-container-lowest text-brand-magenta shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              data-status={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onStatusChange(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.dot ? (
                <span
                  className="size-1.5 rounded-full bg-brand-magenta"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <search className="flex w-full items-center justify-end gap-space-sm md:w-auto">
        <label className="relative block flex-1 md:w-64">
          <span className="sr-only">Cari resi, kurir, penerima</span>
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
          />
          <input
            className="w-full rounded-lg bg-surface-container-low py-1.5 pl-9 pr-space-md text-body-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:outline-none"
            id="search-input"
            placeholder="Cari resi, kurir, penerima..."
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <p className="m-0 flex items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1.5">
          <label className="sr-only" htmlFor="filter-service">
            Layanan
          </label>
          <MaterialIcon name="tune" className="text-[16px] text-outline" />
          <select
            className="cursor-pointer bg-transparent pr-1 text-label-md text-on-surface focus:outline-none"
            id="filter-service"
            value={service}
            onChange={(event) => onServiceChange(event.target.value)}
          >
            <option value="">Layanan: Semua</option>
            <option value="instant">Instant (2 Jam)</option>
            <option value="sameday">Same-Day</option>
            <option value="regular">Reguler</option>
          </select>
        </p>
        <p className="m-0 hidden items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1.5 lg:flex">
          <label className="sr-only" htmlFor="filter-region">
            Wilayah
          </label>
          <MaterialIcon
            name="location_on"
            className="text-[16px] text-outline"
          />
          <select
            className="cursor-pointer bg-transparent pr-1 text-label-md text-on-surface focus:outline-none"
            id="filter-region"
            value={region}
            onChange={(event) => onRegionChange(event.target.value)}
          >
            <option value="">Wilayah: Semua</option>
            <option value="jaksel">Jak-Sel</option>
            <option value="jakpus">Jak-Pus</option>
          </select>
        </p>
      </search>
    </section>
  );
}
