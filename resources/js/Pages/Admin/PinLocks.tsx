import { Link } from "@inertiajs/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { PinLockDetailModal } from "../../Components/admin/pin/PinLockDetailModal";
import { ServiceTag } from "../../Components/Badges";
import { PageHeader } from "../../Components/layout/PageHeader";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { DataTable } from "../../Components/ui/DataTable";
import {
  FilterBar,
  FilterTab,
  FilterTabs,
} from "../../Components/ui/FilterBar";
import { PER_PAGE, useCursorPagination } from "../../Hooks/useCursorPagination";
import { useSeo } from "../../Hooks/useSeo";
import { AdminLayout } from "../../Layouts/AdminLayout";
import type { PinLockRow } from "../../types";

type StatusTab = "locked" | "expired" | "all";

const TABS: { id: StatusTab; label: string }[] = [
  { id: "locked", label: "Terkunci" },
  { id: "expired", label: "Kedaluwarsa" },
  { id: "all", label: "Semua" },
];

const STATUS_LABELS: Record<string, string> = {
  locked: "Terkunci",
  expired: "Kedaluwarsa",
  pending: "Menunggu verifikasi",
  override: "Override Admin",
  verified: "Terverifikasi",
};

/**
 * FR-03-08 dashboard: PIN challenges that need an admin decision so a
 * blocked courier can continue (clear the lock or override the PIN).
 */
export function PinLocksPage() {
  useSeo("/admin/pin-terkunci");
  const [status, setStatus] = useState<StatusTab>("locked");
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    visible: boolean;
  } | null>(null);

  const locks = useCursorPagination<PinLockRow>(
    "/api/v1/admin/pin-locks",
    PER_PAGE,
    {
      status: status === "all" ? undefined : status,
    },
  );
  const rows = locks.items;

  function showToast(text: string) {
    setToast({ text, visible: true });
    window.setTimeout(
      () =>
        setToast((current) =>
          current ? { ...current, visible: false } : current,
        ),
      3600,
    );
  }

  function handleDecided(decision: "unlock" | "override") {
    setSelected(null);
    showToast(
      decision === "unlock"
        ? "Blokir PIN dibuka. Kurir dapat mencoba PIN kembali."
        : "PIN di-override. Kurir dapat melanjutkan tanpa PIN.",
    );
    locks.reload();
  }

  return (
    <>
      <PageHeader
        title="PIN Terkunci"
        description="Buka blokir atau override PIN penerima agar kurir dapat melanjutkan pengiriman."
      />

      <DataTable
        title="Tantangan PIN Butuh Keputusan"
        toolbar={
          <FilterBar>
            <FilterTabs id="pin-lock-tabs" label="Filter status PIN">
              {TABS.map((tab) => (
                <FilterTab
                  key={tab.id}
                  active={status === tab.id}
                  data-status={tab.id}
                  onClick={() => setStatus(tab.id)}
                >
                  {tab.label}
                </FilterTab>
              ))}
            </FilterTabs>
          </FilterBar>
        }
        pagination={{
          page: locks.page,
          hasPrev: locks.hasPrev,
          hasNext: locks.hasNext,
          isLoading: locks.isLoading,
          onPrev: locks.prev,
          onNext: locks.next,
        }}
      >
        <caption className="sr-only">
          Tantangan PIN penerima yang menunggu keputusan admin
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
              Percobaan
            </th>
            <th
              className="whitespace-nowrap px-4 py-3.5 text-label-sm font-bold uppercase tracking-wider"
              scope="col"
            >
              Status
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
          id="pin-lock-table-body"
        >
          {locks.isLoading ? (
            <tr>
              <td
                className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                colSpan={6}
              >
                Memuat data PIN dari server...
              </td>
            </tr>
          ) : locks.isError ? (
            <tr>
              <td
                className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
                colSpan={6}
              >
                Gagal memuat data PIN.{" "}
                <Button
                  variant="text"
                  className="text-[12px]"
                  onClick={locks.reload}
                >
                  Coba lagi
                </Button>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="pin-lock-row transition-colors hover:bg-surface-container-low/40"
                data-tracking={row.tracking ?? ""}
                data-status={row.status}
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
                  {row.attempts}/{row.maxAttempts}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-middle">
                  <mark
                    className={
                      "rounded-full px-2 py-0.5 text-[11px] font-bold " +
                      (row.status === "locked"
                        ? "bg-red-50 text-red-700"
                        : row.status === "override"
                          ? "bg-sky-50 text-sky-700"
                          : row.status === "expired"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-surface-container text-on-surface-variant")
                    }
                  >
                    {STATUS_LABELS[row.status] ?? row.status}
                  </mark>
                  {row.lockedTime ? (
                    <span className="tabular-nums ml-2 text-[11px] text-on-surface-variant">
                      {row.lockedTime}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right align-middle">
                  <Button
                    variant="icon"
                    aria-label="Tinjau PIN terkunci"
                    title="Tinjau PIN terkunci"
                    onClick={() => setSelected(row.id)}
                  >
                    <MaterialIcon name="lock_reset" className="text-[18px]" />
                  </Button>
                </td>
              </tr>
            ))
          )}
          <tr id="pin-lock-empty" hidden={rows.length !== 0}>
            <td
              className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
              colSpan={6}
            >
              Tidak ada tantangan PIN yang menunggu keputusan pada filter ini.
            </td>
          </tr>
        </tbody>
      </DataTable>

      <output
        className={
          "pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-surface-container-highest px-4 py-3 text-on-surface shadow-xl transition-all duration-300 " +
          (toast?.visible ? "" : "translate-y-24 opacity-0")
        }
        id="pin-decision-toast"
        aria-live="polite"
      >
        <MaterialIcon name="lock_open" className="text-[24px] text-tertiary" />
        <span className="text-body-md font-semibold">
          {toast?.text ?? "Keputusan PIN tersimpan."}
        </span>
      </output>

      {selected ? (
        <PinLockDetailModal
          id={selected}
          onClose={() => setSelected(null)}
          onDecided={handleDecided}
        />
      ) : null}
    </>
  );
}

export default PinLocksPage;
PinLocksPage.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;
