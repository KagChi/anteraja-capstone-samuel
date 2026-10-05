import { CourierBottomNav } from "../../Components/courier/CourierBottomNav";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { Pagination } from "../../Components/ui/Pagination";
import { StatusPanel } from "../../Components/ui/StatusPanel";
import { useSession } from "../../Contexts/SessionContext";
import { PER_PAGE, useCursorPagination } from "../../Hooks/useCursorPagination";
import { useSeo } from "../../Hooks/useSeo";
import type { CourierHistoryRow } from "../../types";

/**
 * Riwayat: the courier's completed stops with their review outcome, so a

 * flagged handover is visible from the courier side too.
 */
export function CourierHistoryPage() {
  useSeo("/courier/riwayat");
  const { session } = useSession();
  const history = useCursorPagination<CourierHistoryRow>(
    "/api/v1/courier/history",
    PER_PAGE,
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface-container-low font-sans text-on-surface antialiased">
      <header className="fixed inset-x-0 top-0 z-40 bg-surface-container-low/90 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between px-4">
          <h1 className="text-title-lg tracking-tight text-on-surface">
            Riwayat Pengiriman
          </h1>
          <span className="text-[12px] font-semibold text-on-surface-variant">
            {session?.name ?? "Kurir"}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(6rem+env(safe-area-inset-bottom,16px))]">
        {history.isLoading && history.items.length === 0 ? (
          <StatusPanel spinning>Memuat riwayat dari server...</StatusPanel>
        ) : null}

        {history.isError && history.items.length === 0 ? (
          <StatusPanel
            icon="cloud_off"
            tone="error"
            action={
              <Button
                variant="text"
                className="text-[12px]"
                onClick={history.reload}
              >
                Coba lagi
              </Button>
            }
          >
            Gagal memuat riwayat pengiriman.
          </StatusPanel>
        ) : null}

        {!history.isLoading &&
        !history.isError &&
        history.items.length === 0 ? (
          <StatusPanel icon="history">
            Belum ada pengiriman yang selesai pada akun ini.
          </StatusPanel>
        ) : null}

        <ul className="m-0 list-none space-y-3 p-0" id="history-list">
          {history.items.map((row) => (
            <li
              key={row.id}
              className="rounded-md border border-border-subtle bg-surface-card p-4 shadow-card"
              data-tracking={row.tracking}
            >
              <p className="m-0 flex items-center justify-between gap-2">
                <span className="tabular-nums text-barcode-tracking font-bold text-on-surface">
                  {row.tracking}
                </span>
                <mark
                  className={
                    "rounded-full px-2 py-0.5 text-[11px] font-bold " +
                    (row.status === "failed"
                      ? "bg-red-50 text-red-700"
                      : row.statusLabel === "Terverifikasi"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700")
                  }
                >
                  {row.statusLabel}
                </mark>
              </p>
              <p className="m-0 mt-1 text-[12px] text-on-surface-variant">
                {row.recipient} • {row.address}
              </p>
              <p className="m-0 mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant/80">
                <MaterialIcon name="schedule" className="text-[14px]" />
                {row.dateLabel}
                {row.distanceMeters != null ? (
                  <span> • {row.distanceMeters} m dari tujuan</span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-center">
          <Pagination
            page={history.page}
            hasPrev={history.hasPrev}
            hasNext={history.hasNext}
            isLoading={history.isLoading}
            onPrev={history.prev}
            onNext={history.next}
          />
        </div>
      </main>

      <CourierBottomNav activeLabel="Riwayat" />
    </div>
  );
}

export default CourierHistoryPage;
