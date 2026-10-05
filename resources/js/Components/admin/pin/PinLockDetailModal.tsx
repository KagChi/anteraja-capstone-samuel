import { useEffect, useRef, useState } from "react";
import { useToast } from "../../../Contexts/ToastContext";
import { useAvatar } from "../../../Hooks/useAvatar";
import { useFetch } from "../../../Hooks/useFetch";
import { sendJson } from "../../../lib/api";
import type { PinLockDetail } from "../../../types";
import { Avatar } from "../../Avatar";
import { MaterialIcon } from "../../MaterialIcon";
import { Button } from "../../ui/Button";
import { Spinner } from "../../ui/Spinner";

const RESULT_LABELS: Record<string, string> = {
  verified: "PIN terverifikasi",
  failed: "PIN salah",
  expired: "PIN kedaluwarsa",
  unlocked: "Dibuka Admin",
  override: "Di-override Admin",
};

interface PinLockDetailModalProps {
  id: string;
  onClose: () => void;
  onDecided: (decision: "unlock" | "override") => void;
}

/**
 * FR-03-08 review overlay: clears a locked PIN (the courier gets a fresh
 * set of attempts) or overrides it entirely, with a recorded reason.
 */
export function PinLockDetailModal({
  id,
  onClose,
  onDecided,
}: PinLockDetailModalProps) {
  const toast = useToast();
  const detail = useFetch<{ data: PinLockDetail }>(
    `/api/v1/admin/pin-locks/${encodeURIComponent(id)}`,
  );
  const lock = detail.data?.data;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"unlock" | "override" | null>(null);
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
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="-1"]',
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

  async function decide(decision: "unlock" | "override") {
    if (busy) return;

    if (note.trim().length < 5) {
      toast("Alasan wajib diisi (minimal 5 karakter).", "error");
      return;
    }

    setBusy(decision);

    try {
      await sendJson(
        "POST",
        `/api/v1/admin/pin-locks/${encodeURIComponent(id)}/decision`,
        { decision, note: note.trim() },
      );
      onDecided(decision);
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
        aria-labelledby="judul-modal-pin-lock"
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
              id="judul-modal-pin-lock"
              className="mt-1 text-lg font-bold tracking-tight text-on-surface"
            >
              Buka Blokir PIN
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
            <Spinner /> Memuat detail PIN...
          </p>
        ) : !lock ? (
          <p className="m-0 flex flex-col items-center gap-2 p-10 text-center text-[13px] text-on-surface-variant">
            <MaterialIcon name="search_off" className="text-[32px]" />
            Tantangan PIN tidak ditemukan.
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
                  Penerima: {lock.recipientName ?? "Penerima"}
                </span>
              </span>
            </p>

            <section
              className="rounded-xl border border-border-subtle bg-surface-container-low/60 p-4"
              aria-labelledby="judul-status-pin"
            >
              <h3
                id="judul-status-pin"
                className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                <MaterialIcon name="lock" className="text-[16px]" /> Status
                Tantangan PIN
              </h3>
              <dl className="m-0 grid grid-cols-3 gap-2 text-center">
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Percobaan
                  </span>
                  <strong className="tabular-nums block text-[14px] font-extrabold text-on-surface">
                    {lock.attempts}/{lock.maxAttempts}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Terkunci
                  </span>
                  <strong className="block text-[12px] font-extrabold text-on-surface">
                    {lock.lockedTime ?? "—"}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Berlaku s/d
                  </span>
                  <strong className="block text-[12px] font-extrabold text-on-surface">
                    {lock.expiresAt ?? "—"}
                  </strong>
                </dd>
              </dl>
              {lock.overrideReason ? (
                <p className="m-0 mt-3 text-[11px] text-on-surface-variant">
                  Override sebelumnya: {lock.overrideReason}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="judul-riwayat-pin">
              <h3
                id="judul-riwayat-pin"
                className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Riwayat Percobaan
              </h3>
              <ol
                className="m-0 list-none space-y-1.5 p-0"
                id="pin-lock-events"
              >
                {lock.events.length > 0 ? (
                  lock.events.map((event) => (
                    <li
                      className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-container-low/60 px-3 py-2 text-[12px]"
                      key={`${event.at}-${event.result}-${event.attempt ?? 0}`}
                    >
                      <span className="text-on-surface">
                        <strong className="font-semibold">
                          {RESULT_LABELS[event.result] ?? event.result}
                        </strong>
                        {event.attempt ? ` (percobaan ${event.attempt})` : ""}
                        {event.actor === "admin" ? " • Admin" : ""}
                      </span>
                      <time className="tabular-nums shrink-0 text-on-surface-variant">
                        {event.at}
                      </time>
                    </li>
                  ))
                ) : (
                  <li className="text-[12px] text-on-surface-variant">
                    Belum ada riwayat percobaan.
                  </li>
                )}
              </ol>
            </section>

            <label className="m-0 block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Alasan keputusan (wajib)
              </span>
              <textarea
                className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-surface-container-low p-3 text-sm text-on-surface focus:bg-surface-card focus:outline-none"
                id="pin-lock-note"
                placeholder="Contoh: penerima mengonfirmasi PIN di telepon, beri kesempatan kedua..."
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </section>
        )}

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-border-subtle bg-surface-card p-5">
          <Button
            variant="outline"
            size="md"
            id="btn-override-pin"
            disabled={busy !== null || !lock}
            busy={busy === "override"}
            busyText="Menyimpan..."
            onClick={() => decide("override")}
          >
            <MaterialIcon name="lock_open" className="text-[18px]" /> Override
            (Lewati PIN)
          </Button>
          <Button
            variant="primary"
            size="md"
            id="btn-unlock-pin"
            disabled={busy !== null || !lock}
            busy={busy === "unlock"}
            busyText="Menyimpan..."
            onClick={() => decide("unlock")}
          >
            <MaterialIcon name="lock_reset" className="text-[18px]" /> Buka
            Blokir PIN
          </Button>
        </footer>
      </dialog>
    </section>
  );
}
