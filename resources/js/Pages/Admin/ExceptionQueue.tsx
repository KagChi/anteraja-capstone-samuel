import { Link } from "@inertiajs/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ExceptionDetailModal } from "../../Components/admin/exceptions/ExceptionDetailModal";
import { GpsLockDetailModal } from "../../Components/admin/exceptions/GpsLockDetailModal";
import { MeetingPointDetailModal } from "../../Components/admin/exceptions/MeetingPointDetailModal";
import { ServiceTag } from "../../Components/Badges";
import { PageHeader } from "../../Components/layout/PageHeader";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { DataTable } from "../../Components/ui/DataTable";
import {
  FilterBar,
  FilterSearch,
  FilterTab,
  FilterTabs,
  SearchField,
} from "../../Components/ui/FilterBar";
import { PER_PAGE, useCursorPagination } from "../../Hooks/useCursorPagination";
import { useDebouncedValue } from "../../Hooks/useDebouncedValue";
import { useSeo } from "../../Hooks/useSeo";
import { AdminLayout } from "../../Layouts/AdminLayout";
import type {
  ExceptionRow,
  GpsLockRow,
  MeetingPointRow,
  ServiceSegment,
} from "../../types";

type ServiceFilter = "all" | ServiceSegment;

const TABS: { id: ServiceFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "instant", label: "Instant" },
  { id: "sameday", label: "Sameday" },
  { id: "regular", label: "Reguler" },
];

export function ExceptionQueuePage() {
  useSeo("/admin/antrian-pengecualian");

  const [mode, setMode] = useState<"radius" | "gps" | "meeting">("radius");
  const exceptionsResource = useCursorPagination<ExceptionRow>(
    "/api/v1/admin/exceptions?status=pending",
    PER_PAGE,
  );
  const gpsLocks = useCursorPagination<GpsLockRow>(
    "/api/v1/admin/gps-locks?status=pending",
    PER_PAGE,
  );
  const meetingPoints = useCursorPagination<MeetingPointRow>(
    "/api/v1/admin/meeting-points?status=proposed",
    PER_PAGE,
  );
  const rows = exceptionsResource.items;

  const [service, setService] = useState<ServiceFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const [selected, setSelected] = useState<string | null>(null);
  const [gpsSelected, setGpsSelected] = useState<string | null>(null);
  const [meetingSelected, setMeetingSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    approve: boolean;
    visible: boolean;
  } | null>(null);

  const handled = useRef(false);

  function showDecisionToast(approve: boolean) {
    const subject =
      mode === "gps"
        ? "Blokir GPS"
        : mode === "meeting"
          ? "Titik temu"
          : "Pengecualian";

    setToast({
      approve,
      text: approve
        ? `${subject} disetujui dan tercatat pada jejak audit.`
        : mode === "gps"
          ? "Blokir GPS ditolak. Kurir diminta mengulang dengan GPS asli."
          : mode === "meeting"
            ? "Usulan titik temu ditolak. Kurir dapat mengajukan titik baru."
            : "Pengecualian ditolak. Kurir diminta mengulang verifikasi.",
      visible: true,
    });
    window.setTimeout(
      () =>
        setToast((current) =>
          current ? { ...current, visible: false } : current,
        ),
      3600,
    );
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount for deep-link params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const decision = params.get("decision");
    const open = params.get("open");

    if (open) setSelected(open);

    if (decision && !handled.current) {
      handled.current = true;
      showDecisionToast(decision === "approve");
    }

    if (decision || open) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function handleDecided(decision: "approved" | "rejected") {
    setSelected(null);
    showDecisionToast(decision === "approved");
    exceptionsResource.reload();
  }

  function handleGpsDecided(decision: "approved" | "rejected") {
    setGpsSelected(null);
    gpsLocks.reload();
    showDecisionToast(decision === "approved");
  }

  function handleMeetingDecided(decision: "approved" | "rejected") {
    setMeetingSelected(null);
    meetingPoints.reload();
    showDecisionToast(decision === "approved");
  }

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

  return (
    <>
      <PageHeader
        title="Antrian Pengecualian"
        description="Persetujuan dispensasi lokasi kurir di luar radius resmi."
      />

      <div className="mb-4">
        <FilterTabs id="queue-mode-tabs" label="Jenis persetujuan">
          <FilterTab
            active={mode === "radius"}
            data-mode="radius"
            onClick={() => setMode("radius")}
          >
            Pengecualian Radius
          </FilterTab>
          <FilterTab
            active={mode === "gps"}
            data-mode="gps"
            onClick={() => setMode("gps")}
          >
            Blokir GPS
          </FilterTab>
          <FilterTab
            active={mode === "meeting"}
            data-mode="meeting"
            onClick={() => setMode("meeting")}
          >
            Titik Temu
          </FilterTab>
        </FilterTabs>
      </div>

      {mode === "radius" ? (
        <DataTable
          title="Daftar Pengajuan"
          toolbar={
            <FilterBar>
              <FilterTabs id="exception-tabs" label="Filter layanan">
                {TABS.map((tab) => (
                  <FilterTab
                    key={tab.id}
                    active={service === tab.id}
                    data-service={tab.id}
                    onClick={() => setService(tab.id)}
                  >
                    {tab.label}
                  </FilterTab>
                ))}
              </FilterTabs>
              <FilterSearch>
                <SearchField
                  id="exception-search"
                  label="Cari kurir, resi, deviasi"
                  placeholder="Cari kurir, resi, deviasi..."
                  value={search}
                  onChange={setSearch}
                />
              </FilterSearch>
            </FilterBar>
          }
          pagination={{
            page: exceptionsResource.page,
            hasPrev: exceptionsResource.hasPrev,
            hasNext: exceptionsResource.hasNext,
            isLoading: exceptionsResource.isLoading,
            onPrev: exceptionsResource.prev,
            onNext: exceptionsResource.next,
          }}
        >
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
            {exceptionsResource.isLoading ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Memuat pengajuan dari server...
                </td>
              </tr>
            ) : exceptionsResource.isError ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Gagal memuat pengajuan.{" "}
                  <Button
                    variant="text"
                    className="text-[12px]"
                    onClick={exceptionsResource.reload}
                  >
                    Coba lagi
                  </Button>
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
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
                      href={`/admin/audit-trail/${row.tracking}`}
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
                    <Button
                      variant="icon"
                      aria-label="Tinjau pengecualian"
                      title="Tinjau pengecualian"
                      onClick={() => setSelected(row.tracking)}
                    >
                      <MaterialIcon name="approval" className="text-[18px]" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
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
        </DataTable>
      ) : mode === "gps" ? (
        <DataTable
          title="Blokir GPS Menunggu Keputusan"
          toolbar={
            <FilterBar>
              <p className="m-0 text-[12px] text-on-surface-variant">
                Permintaan peninjauan lokasi tidak wajar (FRD-06). Persetujuan
                membuka blokir POD dan penyelesaian untuk pengiriman ini.
              </p>
            </FilterBar>
          }
          pagination={{
            page: gpsLocks.page,
            hasPrev: gpsLocks.hasPrev,
            hasNext: gpsLocks.hasNext,
            isLoading: gpsLocks.isLoading,
            onPrev: gpsLocks.prev,
            onNext: gpsLocks.next,
          }}
        >
          <caption className="sr-only">
            Permintaan peninjauan blokir GPS yang menunggu keputusan admin
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
                Indikasi
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
            id="gps-lock-table-body"
          >
            {gpsLocks.isLoading ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Memuat permintaan dari server...
                </td>
              </tr>
            ) : gpsLocks.isError ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Gagal memuat permintaan.{" "}
                  <Button
                    variant="text"
                    className="text-[12px]"
                    onClick={gpsLocks.reload}
                  >
                    Coba lagi
                  </Button>
                </td>
              </tr>
            ) : (
              gpsLocks.items.map((row) => (
                <tr
                  key={row.id}
                  className="gps-lock-row transition-colors hover:bg-surface-container-low/40"
                  data-tracking={row.tracking ?? ""}
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
                      href={`/admin/audit-trail/${row.tracking}`}
                    >
                      {row.tracking}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <ServiceTag service={row.service} />
                  </td>
                  <td className="max-w-[18rem] px-4 py-3 align-middle text-[12px] text-on-surface-variant">
                    {row.reasonLabels.length > 0
                      ? row.reasonLabels.join(" • ")
                      : "Indikasi GPS palsu"}
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-3 align-middle text-[12px] text-on-surface-variant">
                    {row.reason}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right align-middle">
                    <Button
                      variant="icon"
                      aria-label="Tinjau blokir GPS"
                      title="Tinjau blokir GPS"
                      onClick={() => setGpsSelected(row.id)}
                    >
                      <MaterialIcon
                        name="location_off"
                        className="text-[18px]"
                      />
                    </Button>
                  </td>
                </tr>
              ))
            )}
            <tr id="gps-lock-empty" hidden={gpsLocks.items.length !== 0}>
              <td
                className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                colSpan={6}
              >
                Tidak ada permintaan peninjauan blokir GPS yang menunggu.
              </td>
            </tr>
          </tbody>
        </DataTable>
      ) : (
        <DataTable
          title="Titik Temu Menunggu Keputusan"
          toolbar={
            <FilterBar>
              <p className="m-0 text-[12px] text-on-surface-variant">
                Usulan titik serah terima kurir untuk pengiriman yang titik
                tujuannya bergeser (FRD-04). Persetujuan memindahkan pusat
                radius penyelesaian ke titik temu.
              </p>
            </FilterBar>
          }
          pagination={{
            page: meetingPoints.page,
            hasPrev: meetingPoints.hasPrev,
            hasNext: meetingPoints.hasNext,
            isLoading: meetingPoints.isLoading,
            onPrev: meetingPoints.prev,
            onNext: meetingPoints.next,
          }}
        >
          <caption className="sr-only">
            Usulan titik temu yang menunggu keputusan admin
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
                Jarak ke Tujuan
              </th>
              <th
                className="whitespace-nowrap px-4 py-3.5 text-label-sm font-bold uppercase tracking-wider"
                scope="col"
              >
                Tujuan &rarr; Pembeli
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
            id="meeting-point-table-body"
          >
            {meetingPoints.isLoading ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Memuat usulan dari server...
                </td>
              </tr>
            ) : meetingPoints.isError ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                  colSpan={6}
                >
                  Gagal memuat usulan.{" "}
                  <Button
                    variant="text"
                    className="text-[12px]"
                    onClick={meetingPoints.reload}
                  >
                    Coba lagi
                  </Button>
                </td>
              </tr>
            ) : (
              meetingPoints.items.map((row) => (
                <tr
                  key={row.id}
                  className="meeting-point-row transition-colors hover:bg-surface-container-low/40"
                  data-tracking={row.tracking ?? ""}
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
                      href={`/admin/audit-trail/${row.tracking}`}
                    >
                      {row.tracking}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <ServiceTag service={row.service} />
                  </td>
                  <td className="tabular-nums whitespace-nowrap px-4 py-3 align-middle text-[12px] font-semibold text-on-surface">
                    {row.distanceToDestinationM} m
                  </td>
                  <td className="tabular-nums whitespace-nowrap px-4 py-3 align-middle text-[12px] text-on-surface-variant">
                    {row.distanceFromBuyerM != null
                      ? `${row.distanceFromBuyerM} m`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right align-middle">
                    <Button
                      variant="icon"
                      aria-label="Tinjau titik temu"
                      title="Tinjau titik temu"
                      onClick={() => setMeetingSelected(row.id)}
                    >
                      <MaterialIcon name="handshake" className="text-[18px]" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
            <tr
              id="meeting-point-empty"
              hidden={meetingPoints.items.length !== 0}
            >
              <td
                className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                colSpan={6}
              >
                Tidak ada usulan titik temu yang menunggu keputusan.
              </td>
            </tr>
          </tbody>
        </DataTable>
      )}

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

      {mode === "radius" && selected ? (
        <ExceptionDetailModal
          id={selected}
          onClose={() => setSelected(null)}
          onDecided={handleDecided}
        />
      ) : null}

      {mode === "gps" && gpsSelected ? (
        <GpsLockDetailModal
          id={gpsSelected}
          onClose={() => setGpsSelected(null)}
          onDecided={handleGpsDecided}
        />
      ) : null}

      {mode === "meeting" && meetingSelected ? (
        <MeetingPointDetailModal
          id={meetingSelected}
          onClose={() => setMeetingSelected(null)}
          onDecided={handleMeetingDecided}
        />
      ) : null}
    </>
  );
}

export default ExceptionQueuePage;
ExceptionQueuePage.layout = (page: ReactNode) => (
  <AdminLayout>{page}</AdminLayout>
);
