import { useState } from "react";
import { Link } from "react-router-dom";
import { ServiceTag, StatusPill } from "../../components/Badges";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useSession } from "../../context/SessionContext";
import { SHIPMENT_ROWS } from "../../data/shipments";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useSeo } from "../../hooks/useSeo";
import { useWelcomeToast } from "../../hooks/useWelcomeToast";
import { initialOf } from "../../lib/format";
import type { DeliveryFlag } from "../../types";

type StatusFilter = "all" | DeliveryFlag;

const TABS: { id: StatusFilter; label: string; dot?: boolean }[] = [
  { id: "all", label: "Semua" },
  { id: "review", label: "Perlu Tinjauan", dot: true },
  { id: "delivered", label: "Terkirim" },
  { id: "exception", label: "Pengecualian" },
];

export function DashboardPage() {
  useSeo("/admin/dashboard");
  const { session } = useSession();
  const name = session?.name ?? "Hub Admin Ops";
  useWelcomeToast(name);

  const [status, setStatus] = useState<StatusFilter>("review");
  const [service, setService] = useState("");
  const [region, setRegion] = useState("jaksel");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);

  const query = debouncedSearch.trim().toLowerCase();
  const rows = SHIPMENT_ROWS.filter((row) => {
    const okStatus = status === "all" || row.flag === status;
    const okService = !service || row.service === service;
    const okRegion = !region || row.region === region;
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
          <section>
            <p className="m-0 mb-1 flex items-center gap-space-xs text-on-surface-variant">
              <span className="text-label-sm font-bold uppercase tracking-wider text-brand-magenta">
                Integritas Operasional
              </span>
              <span className="text-outline-variant" aria-hidden="true">
                &bull;
              </span>
              <span className="text-label-sm font-medium text-on-surface-variant">
                Shift Aktif (08:00 - 20:00)
              </span>
            </p>
            <h1 className="text-headline-lg tracking-tight text-on-surface">
              Daftar Pengiriman
            </h1>
            <p className="mt-0.5 text-body-md text-on-surface-variant">
              Pantau status integritas pengiriman kurir Satria hari ini secara
              real-time.
            </p>
          </section>
          <p className="m-0 flex items-center gap-space-xs self-start rounded-full bg-surface-container px-space-md py-space-xs md:self-auto">
            <span
              className="size-2 animate-ping rounded-full bg-brand-magenta"
              aria-hidden="true"
            />
            <span className="text-body-sm text-on-surface">
              <strong className="text-title-md">142</strong> pengiriman hari ini
              <span className="mx-1.5 text-outline-variant" aria-hidden="true">
                &bull;
              </span>
              <strong
                className="text-title-md text-brand-magenta"
                id="review-count"
              >
                {reviewCount}
              </strong>{" "}
              perlu tinjauan
              <span className="mx-1.5 text-outline-variant" aria-hidden="true">
                &bull;
              </span>
              <span className="text-on-surface-variant">
                138 terverifikasi otomatis
              </span>
            </span>
          </p>
        </header>

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
                  onClick={() => setStatus(tab.id)}
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
                onChange={(event) => setSearch(event.target.value)}
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
                onChange={(event) => setService(event.target.value)}
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
                onChange={(event) => setRegion(event.target.value)}
              >
                <option value="">Wilayah: Semua</option>
                <option value="jaksel">Jak-Sel</option>
                <option value="jakpus">Jak-Pus</option>
              </select>
            </p>
          </search>
        </section>

        <section
          className="overflow-hidden rounded-xl border border-border-subtle bg-surface-container-lowest shadow-sm"
          aria-label="Tabel pengiriman"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-container-low/40 px-5 py-3">
            <p className="m-0 text-[12px] text-on-surface-variant">
              Menampilkan{" "}
              <strong className="text-on-surface" id="visible-count">
                {rows.length}
              </strong>{" "}
              pengiriman
            </p>
            <p className="m-0 hidden text-[12px] text-on-surface-variant sm:block">
              Klik <strong className="text-on-surface">Tinjau</strong> untuk
              membuka audit trail
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
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`delivery-row group transition-colors hover:bg-surface-container-low/40 ${
                    row.highlight ? "bg-primary-fixed/10" : ""
                  }`}
                  data-flag={row.flag}
                  data-service={row.service}
                  data-region={row.region}
                >
                  <th
                    className="whitespace-nowrap px-5 py-3 align-middle font-normal"
                    scope="row"
                  >
                    <p className="m-0 flex items-center gap-3">
                      <span
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-magenta/10 text-[11px] font-bold text-brand-magenta"
                        aria-hidden="true"
                      >
                        {initialOf(row.courierName, "?")}
                      </span>
                      <span className="text-title-md font-semibold text-on-surface">
                        {row.courierName}{" "}
                        <span className="text-body-sm font-normal text-on-surface-variant/70">
                          ({row.courierCode})
                        </span>
                      </span>
                    </p>
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <Link
                      className="tabular-nums text-barcode-tracking font-bold text-on-surface hover:text-brand-magenta"
                      to={row.href}
                    >
                      {row.tracking}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <ServiceTag service={row.service} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <StatusPill label={row.statusLabel} tone={row.statusTone} />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 align-middle text-body-sm text-on-surface-variant lg:table-cell">
                    {row.regionLabel}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right align-middle">
                    <Link
                      className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
                        row.flag === "delivered"
                          ? "text-on-surface-variant hover:text-on-surface"
                          : "text-brand-magenta hover:opacity-80"
                      }`}
                      to={row.href}
                    >
                      {row.flag === "delivered" ? "Detail" : "Tinjau"}{" "}
                      <MaterialIcon
                        name="arrow_forward"
                        className="text-[16px]"
                      />
                    </Link>
                  </td>
                </tr>
              ))}
              <tr id="delivery-empty" hidden={rows.length !== 0}>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Tidak ada pengiriman yang cocok dengan filter atau pencarian.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>

      <footer className="border-t border-border-subtle px-4 py-6 text-[11px] text-on-surface-variant/70 lg:px-8">
        Anteraja Instant &bull; Satria Rapid Field Dispatch &bull; Data contoh
        untuk keperluan purwarupa.
      </footer>
    </>
  );
}
