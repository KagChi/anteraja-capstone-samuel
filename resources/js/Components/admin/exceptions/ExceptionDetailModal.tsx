import { useEffect, useState } from "react";
import { useToast } from "../../../Contexts/ToastContext";
import { useAvatar } from "../../../Hooks/useAvatar";
import { useFetch } from "../../../Hooks/useFetch";
import { useProofPhoto } from "../../../Hooks/useProofPhoto";
import { sendJson } from "../../../lib/api";
import type { ExceptionDetail } from "../../../types";
import { Avatar } from "../../Avatar";
import { MaterialIcon } from "../../MaterialIcon";
import { Button } from "../../ui/Button";
import { Spinner } from "../../ui/Spinner";

interface ExceptionDetailModalProps {
  id: string;
  onClose: () => void;
  onDecided: (decision: "approved" | "rejected") => void;
}

/**
 * Exception review shown as an overlay on the exception queue (never a separate
 * page). Fetches by tracking number or shipment id, then approves/rejects.
 */
export function ExceptionDetailModal({
  id,
  onClose,
  onDecided,
}: ExceptionDetailModalProps) {
  const toast = useToast();
  const detail = useFetch<{ data: ExceptionDetail }>(
    `/api/v1/admin/exceptions/${encodeURIComponent(id)}`,
  );
  const exception = detail.data?.data;
  const tracking = exception?.tracking ?? id;
  const courierName = exception?.courierName ?? "Kurir";
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const courierAvatar = useAvatar(courierName);
  const proofPhoto = useProofPhoto(tracking);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function decide(choice: "approved" | "rejected") {
    if (busy) return;
    setBusy(choice);

    try {
      await sendJson(
        "POST",
        `/api/v1/admin/exceptions/${encodeURIComponent(id || tracking)}/decision`,
        { decision: choice, note: note || null },
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
        className="relative m-0 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-border-subtle bg-surface-container-lowest p-0 shadow-2xl"
        open
        aria-modal="true"
        aria-labelledby="judul-modal-pengecualian"
        data-tracking={tracking}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-container-lowest p-5">
          <section>
            <p className="m-0 flex items-center gap-2">
              <mark className="rounded-full bg-brand-magenta/10 px-2 py-0.5 text-[11px] font-bold uppercase text-brand-magenta">
                {exception?.service ?? "Instant"}
              </mark>
              <span className="tabular-nums text-[12px] text-on-surface-variant">
                {tracking}
              </span>
            </p>
            <h2
              id="judul-modal-pengecualian"
              className="mt-1 text-lg font-bold tracking-tight text-on-surface"
            >
              Detail Pengecualian Geofence
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
            <Spinner /> Memuat detail pengecualian...
          </p>
        ) : !exception ? (
          <p className="m-0 flex flex-col items-center gap-2 p-10 text-center text-[13px] text-on-surface-variant">
            <MaterialIcon name="search_off" className="text-[32px]" />
            Pengecualian{" "}
            <strong className="tabular-nums text-on-surface">{id}</strong> tidak
            ditemukan.
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
                    ({exception.courierCode ?? "—"})
                  </span>
                </span>
                <span className="block text-[12px] text-on-surface-variant">
                  Tiket dibuat{" "}
                  <time dateTime={exception.ticketIso ?? ""}>
                    {exception.ticketAt ?? "—"}
                  </time>
                </span>
              </span>
            </p>

            <section
              className="rounded-xl border border-border-subtle bg-surface-container-low/60 p-4"
              aria-labelledby="judul-ringkasan-deviasi"
            >
              <h3
                id="judul-ringkasan-deviasi"
                className="mb-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Ringkasan Deviasi
              </h3>
              <dl className="m-0 grid grid-cols-3 gap-3 text-center">
                <dt className="sr-only">Selisih</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Selisih
                  </span>
                  <strong className="block text-[18px] font-extrabold text-amber-600">
                    +{exception.deviation ?? 0} m
                  </strong>
                </dd>
                <dt className="sr-only">Toleransi Hub</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Toleransi
                  </span>
                  <strong className="block text-[18px] font-extrabold text-on-surface">
                    {exception.maxTolerance ?? 0} m
                  </strong>
                </dd>
                <dt className="sr-only">Jarak Aktual</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Jarak Aktual
                  </span>
                  <strong className="block text-[18px] font-extrabold text-on-surface">
                    {exception.actualDistance ?? 0} m
                  </strong>
                </dd>
              </dl>
            </section>

            <section aria-labelledby="judul-alasan-kurir">
              <h3
                id="judul-alasan-kurir"
                className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Alasan Kurir
              </h3>
              <blockquote className="m-0 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4 text-sm leading-relaxed text-on-surface">
                &ldquo;{exception.reason ?? "—"}&rdquo;
              </blockquote>
            </section>

            <section aria-labelledby="judul-bukti-lokasi">
              <h3
                id="judul-bukti-lokasi"
                className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Foto Bukti Lokasi (POD)
              </h3>
              <figure className="relative m-0 grid h-36 w-full place-items-center overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-neutral-700 to-neutral-900">
                {proofPhoto.data &&
                !proofPhoto.isLoading &&
                !proofPhoto.isError ? (
                  <img
                    src={proofPhoto.data}
                    alt="Foto bukti lokasi (POD)"
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : proofPhoto.isLoading ? (
                  <Spinner className="text-white/60" />
                ) : (
                  <MaterialIcon
                    name="photo_camera"
                    className="text-[32px] text-white/25"
                  />
                )}
                <figcaption className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                  <span className="tabular-nums rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">
                    {exception.podPoint ?? "—"}
                  </span>
                  <time
                    className="tabular-nums rounded bg-black/70 px-2 py-0.5 text-[10px] text-white"
                    dateTime={exception.podIso ?? ""}
                  >
                    {exception.podCapturedAt ?? "—"}
                  </time>
                </figcaption>
              </figure>
            </section>

            <label className="m-0 block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Catatan keputusan (opsional)
              </span>
              <textarea
                className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-surface-container-low p-3 text-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none"
                id="exception-note"
                placeholder="Alasan persetujuan atau penolakan..."
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </section>
        )}

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border-subtle bg-surface-container-lowest p-5">
          <Button
            variant="outline"
            size="md"
            disabled={busy !== null || !exception}
            busy={busy === "rejected"}
            busyText="Menolak..."
            onClick={() => decide("rejected")}
          >
            Tolak
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={busy !== null || !exception}
            busy={busy === "approved"}
            busyText="Menyetujui..."
            onClick={() => decide("approved")}
          >
            <MaterialIcon name="verified_user" className="text-[18px]" />{" "}
            Setujui Pengecualian
          </Button>
        </footer>
      </dialog>
    </section>
  );
}
