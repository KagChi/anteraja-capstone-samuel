import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ServiceTag } from "../../components/Badges";
import { MaterialIcon } from "../../components/MaterialIcon";
import { EXCEPTION_ROWS } from "../../data/shipments";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useSeo } from "../../hooks/useSeo";
import { getDecisions } from "../../lib/storage";
import type { ServiceSegment } from "../../types";

type ServiceFilter = "all" | ServiceSegment;

const TABS: { id: ServiceFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "instant", label: "Instant" },
  { id: "sameday", label: "Sameday" },
  { id: "regular", label: "Reguler" },
];

export function AntrianPengecualianPage() {
  useSeo("/admin/antrian-pengecualian");
  const [searchParams, setSearchParams] = useSearchParams();

  const [decided] = useState(() => Object.keys(getDecisions()));
  const rows = EXCEPTION_ROWS.filter((row) => !decided.includes(row.id));

  const [service, setService] = useState<ServiceFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const [toast, setToast] = useState<{
    text: string;
    approve: boolean;
    visible: boolean;
  } | null>(null);

  const handled = useRef(false);

  useEffect(() => {
    const decision = searchParams.get("decision");
    if (!decision || handled.current) return;
    handled.current = true;
    setToast({
      approve: decision === "approve",
      text:
        decision === "approve"
          ? "Pengecualian disetujui dan tercatat pada jejak audit."
          : "Pengecualian ditolak. Kurir diminta mengulang verifikasi.",
      visible: true,
    });
    setSearchParams({}, { replace: true });
    window.setTimeout(
      () =>
        setToast((current) =>
          current ? { ...current, visible: false } : current,
        ),
      3600,
    );
  }, [searchParams, setSearchParams]);

  const query = debouncedSearch.trim().toLowerCase();
  const visibleRows = rows.filter((row) => {
    const okService = service === "all" || row.service === service;
    const okSearch =
      !query ||
      `${row.courierName} ${row.courierCode} ${row.tracking} ${row.reason}`
        .toLowerCase()
        .includes(query);
    return okService && okSearch;
  });

  function tabLabel(tab: ServiceFilter): string {
    const count = rows.filter(
      (row) => tab === "all" || row.service === tab,
    ).length;
    const label = TABS.find((item) => item.id === tab)?.label ?? "";
    return `${label} (${count})`;
  }

  return (
    <>
      <main
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-space-lg px-4 py-space-md lg:px-8"
        id="konten-utama"
      >
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <section>
            <h1 className="text-headline-xl tracking-tight text-on-surface">
              Antrian Pengecualian
            </h1>
            <p className="max-w-2xl text-body-md text-on-surface-variant">
              Persetujuan dispensasi lokasi kurir di luar radius resmi.
            </p>
          </section>
          <p className="m-0 flex items-center gap-3 self-start rounded-lg border border-border-subtle bg-surface-container-low px-3 py-1.5 md:self-auto">
            <span
              className="size-2 shrink-0 rounded-full bg-alert-amber"
              aria-hidden="true"
            />
            <span className="text-label-md text-on-surface" id="pending-count">
              {rows.length} Menunggu
            </span>
          </p>
        </header>

        <section
          className="overflow-hidden rounded-xl border border-border-subtle bg-surface-container-lowest shadow-sm"
          aria-labelledby="judul-daftar-pengajuan"
        >
          <header className="flex flex-col gap-4 border-b border-border-subtle p-4 md:p-6">
            <section className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <h2
                id="judul-daftar-pengajuan"
                className="flex items-center gap-3 text-title-md font-semibold text-on-surface"
              >
                Daftar Pengajuan{" "}
                <mark
                  className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"
                  id="exception-count"
                >
                  {rows.length} pengajuan
                </mark>
              </h2>
              <p className="m-0 flex items-center gap-2 text-body-sm text-on-surface-variant">
                <span
                  className="size-2 animate-pulse rounded-full bg-tertiary-container"
                  aria-hidden="true"
                />
                <span className="font-medium">Auto-sync aktif</span>
              </p>
            </section>
            <section className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-container-low/70 p-1"
                id="exception-tabs"
                role="tablist"
                aria-label="Filter layanan"
              >
                {TABS.map((tab) => {
                  const isActive = service === tab.id;
                  return (
                    <button
                      key={tab.id}
                      className={`filter-tab rounded-md px-3 py-1 text-label-sm transition-all ${
                        isActive
                          ? "bg-surface-container-lowest font-bold text-brand-magenta shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                      data-service={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setService(tab.id)}
                    >
                      {tabLabel(tab.id)}
                    </button>
                  );
                })}
              </div>
              <search className="ml-auto flex max-w-sm flex-1 items-center gap-2.5">
                <label className="flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-surface-container-low/50 px-3 py-1.5">
                  <span className="sr-only">Cari kurir, resi, deviasi</span>
                  <MaterialIcon
                    name="search"
                    className="shrink-0 text-[18px] text-on-surface-variant"
                  />
                  <input
                    className="w-full border-none bg-transparent p-0 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                    id="exception-search"
                    placeholder="Cari kurir, resi, deviasi..."
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </search>
            </section>
          </header>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Pengajuan pengecualian geofence yang menunggu keputusan admin
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
                  Deviasi
                </th>
                <th
                  className="whitespace-nowrap px-4 py-3.5 text-label-sm font-bold uppercase tracking-wider"
                  scope="col"
                >
                  Alasan Kurir
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
              id="exception-table-body"
            >
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="exception-row transition-colors hover:bg-surface-container-low/40"
                  data-service={row.service}
                >
                  <th
                    className="whitespace-nowrap px-5 py-3 align-middle font-normal"
                    scope="row"
                  >
                    <p className="m-0 text-title-md font-semibold text-on-surface">
                      {row.courierName}{" "}
                      <span className="text-[12px] font-normal text-on-surface-variant/70">
                        ({row.courierCode})
                      </span>
                    </p>
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <Link
                      className="tabular-nums text-barcode-tracking font-bold text-on-surface hover:text-brand-magenta"
                      to="/admin/audit-trail"
                    >
                      {row.tracking}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <ServiceTag service={row.service} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <span className="text-[12px] font-semibold text-amber-700">
                      +{row.deviation} m{" "}
                      <span className="font-normal text-on-surface-variant">
                        / maks {row.maxTolerance} m
                      </span>
                    </span>
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-3 align-middle text-[12px] text-on-surface-variant">
                    {row.reason}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right align-middle">
                    <Link
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-magenta hover:opacity-80"
                      to="/admin/pengecualian-detail"
                    >
                      Tinjau{" "}
                      <MaterialIcon
                        name="arrow_forward"
                        className="text-[16px]"
                      />
                    </Link>
                  </td>
                </tr>
              ))}
              <tr id="exception-empty" hidden={visibleRows.length !== 0}>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Tidak ada pengajuan pengecualian yang cocok dengan filter atau
                  pencarian.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>

      <footer className="border-t border-border-subtle px-4 py-6 text-[11px] text-on-surface-variant/70 lg:px-8">
        Keputusan dispensasi tercatat sebagai bagian jejak audit &bull; Data
        contoh untuk keperluan purwarupa.
      </footer>

      <output
        className={`pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-surface-container-highest px-4 py-3 text-on-surface shadow-xl transition-all duration-300 ${
          toast?.visible ? "" : "translate-y-24 opacity-0"
        }`}
        id="decision-toast"
        aria-live="polite"
      >
        <MaterialIcon
          name={toast?.approve ? "check_circle" : "block"}
          className={`text-[24px] ${
            toast?.approve ? "text-tertiary" : "text-error"
          }`}
        />
        <span className="text-body-md font-semibold">
          {toast?.text ?? "Keputusan berhasil diterapkan ke sistem."}
        </span>
      </output>
    </>
  );
}
