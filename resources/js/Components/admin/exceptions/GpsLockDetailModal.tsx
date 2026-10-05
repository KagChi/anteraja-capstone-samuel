import { useEffect, useRef, useState } from "react";
import { useToast } from "../../../Contexts/ToastContext";
import { useAvatar } from "../../../Hooks/useAvatar";
import { useFetch } from "../../../Hooks/useFetch";
import { sendJson } from "../../../lib/api";
import type { GpsLockDetail } from "../../../types";
import { Avatar } from "../../Avatar";
import { MaterialIcon } from "../../MaterialIcon";
import { Button } from "../../ui/Button";
import { Spinner } from "../../ui/Spinner";

interface GpsLockDetailModalProps {
  id: string;
  onClose: () => void;
  onDecided: (decision: "approved" | "rejected") => void;
}

function formatSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";

  const minutes = Math.round(seconds / 60);

  return minutes >= 1 ? `${minutes} mnt` : `${Math.round(seconds)} dtk`;
}

/**
 * FRD-06 review overlay on the approval queue: shows the detector evidence
 * behind a fake-GPS block and lets the admin unlock (or refuse) the delivery.
 */
export function GpsLockDetailModal({
  id,
  onClose,
  onDecided,
}: GpsLockDetailModalProps) {
  const toast = useToast();
  const detail = useFetch<{ data: GpsLockDetail }>(
    `/api/v1/admin/gps-locks/${encodeURIComponent(id)}`,
  );
  const lock = detail.data?.data;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const courierName = lock?.courierName ?? "Kurir";
  const courierAvatar = useAvatar(courierName);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = dialogRef.current;
    node?.focus();

    function focusables() {
      if (!node) return [];
      return Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  async function decide(choice: "approved" | "rejected") {
    if (busy) return;

    if (choice === "rejected" && note.trim() === "") {
      toast("Alasan wajib diisi saat menolak permintaan.", "error");
      return;
    }

    setBusy(choice);

    try {
      await sendJson(
        "POST",
        `/api/v1/admin/gps-locks/${encodeURIComponent(id)}/decision`,
        { decision: choice, note: note.trim() || null },
      );
      onDecided(choice);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Keputusan gagal disimpan.",
        "error",
      );
      setBusy(null);
    }
  }

  return (
    <section className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup dialog"
        onClick={onClose}
      />
      <dialog
        ref={dialogRef}
        tabIndex={-1}
        className="relative m-0 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-border-subtle bg-surface-card p-0 shadow-2xl focus:outline-none"
        open
        aria-modal="true"
        aria-labelledby="judul-modal-blokir-gps"
        data-tracking={lock?.tracking ?? id}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-card p-5">
          <section>
            <p className="m-0 flex items-center gap-2">
              <mark className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase text-red-700">
                {lock?.service ?? "Instant"}
              </mark>
              <span className="tabular-nums text-[12px] text-on-surface-variant">
                {lock?.tracking ?? id}
              </span>
            </p>
            <h2
              id="judul-modal-blokir-gps"
              className="mt-1 text-lg font-bold tracking-tight text-on-surface"
            >
              Detail Blokir GPS
            </h2>
          </section>
          <Button
            variant="icon"
            className="shrink-0"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </Button>
        </header>

        {detail.isLoading ? (
          <p className="m-0 flex items-center justify-center gap-2 p-10 text-[13px] text-on-surface-variant">
            <Spinner /> Memuat detail blokir GPS...
          </p>
        ) : !lock ? (
          <p className="m-0 flex flex-col items-center gap-2 p-10 text-center text-[13px] text-on-surface-variant">
            <MaterialIcon name="search_off" className="text-[32px]" />
            Permintaan peninjauan tidak ditemukan.
          </p>
        ) : (
          <section className="space-y-5 p-5">
            <p className="flex items-center gap-3">
              <Avatar
                name={courierName}
                resource={courierAvatar}
                className="size-10 text-[14px]"
              />
              <span className="block leading-tight">
                <span className="block text-sm font-semibold text-on-surface">
                  {courierName}{" "}
                  <span className="text-[12px] font-normal text-on-surface-variant">
                    ({lock.courierCode ?? "—"})
                  </span>
                </span>
                <span className="block text-[12px] text-on-surface-variant">
                  Diajukan {lock.requestedAt ?? "—"}
                </span>
              </span>
            </p>

            <section
              className="rounded-xl border border-border-subtle bg-surface-container-low/60 p-4"
              aria-labelledby="judul-bukti-gps"
            >
              <h3
                id="judul-bukti-gps"
                className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                <MaterialIcon name="location_off" className="text-[16px]" />{" "}
                Bukti Deteksi (FRD-06)
              </h3>
              <ul className="m-0 mb-3 list-none space-y-1.5 p-0">
                {lock.reasons.length > 0 ? (
                  lock.reasons.map((reason) => (
                    <li
                      className="text-[12px] text-on-surface-variant"
                      key={reason.code}
                    >
                      <strong className="font-semibold text-on-surface">
                        {reason.label}.
                      </strong>{" "}
                      {reason.detail}
                    </li>
                  ))
                ) : (
                  <li className="text-[12px] text-on-surface-variant">
                    Tidak ada rincian sinyal tersimpan.
                  </li>
                )}
              </ul>
              <dl className="m-0 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Akurasi
                  </span>
                  <strong className="tabular-nums block text-[14px] font-extrabold text-on-surface">
                    {lock.accuracyM !== null && lock.accuracyM !== undefined
                      ? `± ${lock.accuracyM} m`
                      : "—"}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Kecepatan
                  </span>
                  <strong className="tabular-nums block text-[14px] font-extrabold text-on-surface">
                    {lock.impliedSpeedKmh !== null &&
                    lock.impliedSpeedKmh !== undefined
                      ? `${Math.round(lock.impliedSpeedKmh)} km/j`
                      : "—"}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Jendela Fix
                  </span>
                  <strong className="tabular-nums block text-[14px] font-extrabold text-on-surface">
                    {lock.fixWindow ? `${lock.fixWindow.count} titik` : "—"}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Selisih Jam
                  </span>
                  <strong className="tabular-nums block text-[14px] font-extrabold text-on-surface">
                    {formatSeconds(lock.clockSkewSeconds)}
                  </strong>
                </dd>
              </dl>
              <p className="tabular-nums m-0 mt-3 text-[11px] text-on-surface-variant">
                Titik dilaporkan: {lock.pointLabel}
              </p>
            </section>

            <section aria-labelledby="judul-alasan-kurir-gps">
              <h3
                id="judul-alasan-kurir-gps"
                className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Alasan Kurir
              </h3>
              <blockquote className="m-0 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4 text-sm leading-relaxed text-on-surface">
                &ldquo;{lock.reason ?? "—"}&rdquo;
              </blockquote>
            </section>

            <label className="m-0 block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Catatan keputusan (wajib saat menolak)
              </span>
              <textarea
                className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-surface-container-low p-3 text-sm text-on-surface focus:bg-surface-card focus:outline-none"
                id="gps-lock-note"
                placeholder="Alasan persetujuan atau penolakan..."
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </section>
        )}

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border-subtle bg-surface-card p-5">
          <Button
            variant="outline"
            size="md"
            id="btn-reject-gps-lock"
            disabled={busy !== null || !lock}
            busy={busy === "rejected"}
            busyText="Menolak..."
            onClick={() => decide("rejected")}
          >
            Tolak
          </Button>
          <Button
            variant="primary"
            size="md"
            id="btn-approve-gps-lock"
            disabled={busy !== null || !lock}
            busy={busy === "approved"}
            busyText="Menyetujui..."
            onClick={() => decide("approved")}
          >
            <MaterialIcon name="lock_open" className="text-[18px]" /> Buka
            Blokir GPS
          </Button>
        </footer>
      </dialog>
    </section>
  );
}
