import { titleCase } from "../../../lib/format";
import type { DeliveryFlag, Regency } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import {
  FilterBar,
  FilterSearch,
  FilterTab,
  FilterTabs,
  SearchField,
} from "../../ui/FilterBar";

export type StatusFilter = "all" | DeliveryFlag;

const TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "review", label: "Perlu Tinjauan" },
  { id: "delivered", label: "Terkirim" },
  { id: "exception", label: "Pengecualian" },
];

interface ShipmentFiltersProps {
  status: StatusFilter;
  service: string;
  region: string;
  search: string;
  regions: Regency[];
  regionsLoading: boolean;
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
  regions,
  regionsLoading,
  onStatusChange,
  onServiceChange,
  onRegionChange,
  onSearchChange,
}: ShipmentFiltersProps) {
  return (
    <FilterBar>
      <FilterTabs id="filter-tabs" label="Filter status">
        {TABS.map((tab) => (
          <FilterTab
            key={tab.id}
            active={status === tab.id}
            data-status={tab.id}
            onClick={() => onStatusChange(tab.id)}
          >
            <span>{tab.label}</span>
          </FilterTab>
        ))}
      </FilterTabs>
      <FilterSearch>
        <SearchField
          id="search-input"
          label="Cari resi, kurir, penerima"
          placeholder="Cari resi, kurir, penerima..."
          value={search}
          onChange={onSearchChange}
        />
        <p className="m-0 flex min-w-0 items-center gap-1 rounded-lg bg-surface-container-low px-3 py-1">
          <label className="sr-only" htmlFor="filter-service">
            Layanan
          </label>
          <MaterialIcon name="tune" className="text-[16px] text-outline" />
          <select
            className="min-w-0 max-w-[11rem] cursor-pointer truncate border-0 bg-transparent pr-1 text-label-md text-on-surface focus:outline-none"
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
        <p className="m-0 hidden min-w-0 items-center gap-1 rounded-lg bg-surface-container-low px-3 py-1 lg:flex">
          <label className="sr-only" htmlFor="filter-region">
            Wilayah
          </label>
          <MaterialIcon
            name="location_on"
            className="text-[16px] text-outline"
          />
          <select
            className="min-w-0 max-w-[13rem] cursor-pointer truncate border-0 bg-transparent pr-1 text-label-md text-on-surface focus:outline-none disabled:cursor-wait disabled:opacity-60"
            id="filter-region"
            value={region}
            disabled={regionsLoading}
            onChange={(event) => onRegionChange(event.target.value)}
          >
            <option value="">
              {regionsLoading ? "Memuat wilayah..." : "Wilayah: Semua"}
            </option>
            {regions.map((regency) => (
              <option key={regency.id} value={regency.id}>
                {titleCase(regency.name)}
              </option>
            ))}
          </select>
        </p>
      </FilterSearch>
    </FilterBar>
  );
}
