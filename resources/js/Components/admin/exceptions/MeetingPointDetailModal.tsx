import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../../Contexts/ToastContext";
import { useAvatar } from "../../../Hooks/useAvatar";
import { useFetch } from "../../../Hooks/useFetch";
import { sendJson } from "../../../lib/api";
import type { MeetingPointDetail } from "../../../types";
import { Avatar } from "../../Avatar";
import { MeetingPointMap } from "../../courier/MeetingPointMap";
import { MaterialIcon } from "../../MaterialIcon";
import { Button } from "../../ui/Button";
import { Spinner } from "../../ui/Spinner";

const EVENT_LABELS: Record<string, string> = {
  meeting_point_proposed: "Titik temu diusulkan kurir",
  meeting_point_approved: "Titik temu final ditetapkan",
  meeting_point_rejected: "Usulan ditolak Admin",
  meeting_point_expired: "Usulan kedaluwarsa",
};

interface MeetingPointDetailModalProps {
  id: string;
  onClose: () => void;
  onDecided: (decision: "approved" | "rejected") => void;
}

/**
 * FRD-04 approval overlay: reviews the courier's proposal on the map, can
 * set a different final point (FR-04-09), and approves or rejects it.
 */
export function MeetingPointDetailModal({
  id,
  onClose,
  onDecided,
}: MeetingPointDetailModalProps) {
  const toast = useToast();
  const detail = useFetch<{ data: MeetingPointDetail }>(
    `/api/v1/admin/meeting-points/${encodeURIComponent(id)}`,
  );
  const meeting = detail.data?.data;
  const [note, setNote] = useState("");
  const [override, setOverride] = useState(false);
  const [overridePoint, setOverridePoint] = useState<[number, number] | null>(
    null,
  );
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const courierName = meeting?.courierName ?? "Kurir";
  const courierAvatar = useAvatar(courierName);
  const radius = useMemo(
    () => Math.max(meeting?.radiusMeters ?? 50, 30),
    [meeting?.radiusMeters],
  );

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

  async function decide(decision: "approved" | "rejected") {
    if (busy) return;

    if (decision === "rejected" && note.trim().length < 5) {
      toast("Alasan wajib diisi saat menolak usulan.", "error");
      return;
    }

    setBusy(decision);

    try {
      await sendJson(
        "POST",
        `/api/v1/admin/meeting-points/${encodeURIComponent(id)}/decision`,
        {
          decision,
          note: note.trim() || null,
          latitude: decision === "approved" ? overridePoint?.[0] : undefined,
          longitude: decision === "approved" ? overridePoint?.[1] : undefined,
        },
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

  const finalPoint = overridePoint ?? meeting?.point ?? null;

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
        aria-labelledby="judul-modal-titik-temu"
        data-tracking={meeting?.tracking ?? id}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-card p-5">
          <section>
            <p className="m-0 flex items-center gap-2">
              <mark className="rounded-full bg-brand-magenta/10 px-2 py-0.5 text-[11px] font-bold uppercase text-brand-magenta">
                {meeting?.service ?? "Instant"}
              </mark>
              <span className="tabular-nums text-[12px] text-on-surface-variant">
                {meeting?.tracking ?? id}
              </span>
            </p>
            <h2
              id="judul-modal-titik-temu"
              className="mt-1 text-lg font-bold tracking-tight text-on-surface"
            >
              Tinjau Titik Temu
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
            <Spinner /> Memuat detail titik temu...
          </p>
        ) : !meeting ? (
          <p className="m-0 flex flex-col items-center gap-2 p-10 text-center text-[13px] text-on-surface-variant">
            <MaterialIcon name="search_off" className="text-[32px]" />
            Usulan titik temu tidak ditemukan.
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
                    ({meeting.courierCode ?? "—"})
                  </span>
                </span>
                <span className="block text-[12px] text-on-surface-variant">
                  Diusulkan {meeting.requestedAt ?? "—"}
                </span>
              </span>
            </p>

            <section
              className="rounded-xl border border-border-subtle bg-surface-container-low/60 p-4"
              aria-labelledby="judul-ringkasan-titik-temu"
            >
              <h3
                id="judul-ringkasan-titik-temu"
                className="mb-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Ringkasan Usulan
              </h3>
              <dl className="m-0 grid grid-cols-3 gap-2 text-center">
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Ke Tujuan
                  </span>
                  <strong className="tabular-nums block text-[16px] font-extrabold text-on-surface">
                    {meeting.distanceToDestinationM} m
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Tujuan &rarr; Pembeli
                  </span>
                  <strong className="tabular-nums block text-[16px] font-extrabold text-on-surface">
                    {meeting.distanceFromBuyerM != null
                      ? `${meeting.distanceFromBuyerM} m`
                      : "—"}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-card p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Berlaku s/d
                  </span>
                  <strong className="block text-[12px] font-extrabold text-on-surface">
                    {meeting.expiresAt ?? "—"}
                  </strong>
                </dd>
              </dl>
            </section>

            {meeting.target ? (
              <section aria-labelledby="judul-peta-titik-temu">
                <h3
                  id="judul-peta-titik-temu"
                  className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Peta Usulan
                </h3>
                <figure
                  className="relative z-0 isolate m-0 h-52 overflow-hidden rounded-xl border border-border-subtle bg-surface-container"
                  id="meeting-point-admin-map"
                >
                  <MeetingPointMap
                    target={meeting.target}
                    radiusMeters={radius}
                    courier={meeting.courierPoint ?? null}
                    buyer={meeting.buyerPoint ?? null}
                    point={finalPoint}
                    onPick={
                      override
                        ? (latitude, longitude) =>
                            setOverridePoint([latitude, longitude])
                        : undefined
                    }
                  />
                </figure>
                <p className="m-0 mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant={override ? "secondary" : "outline"}
                    size="sm"
                    id="btn-set-meeting-override"
                    onClick={() => {
                      setOverride((current) => !current);
                      setOverridePoint(null);
                    }}
                  >
                    <MaterialIcon
                      name="edit_location"
                      className="text-[16px]"
                    />
                    {override ? "Batal Tetapkan Titik" : "Tetapkan Titik Lain"}
                  </Button>
                  {override ? (
                    <span className="text-[11px] font-medium text-brand-magenta">
                      Ketuk peta untuk memilih titik final pengganti.
                    </span>
                  ) : null}
                </p>
              </section>
            ) : null}

            <section aria-labelledby="judul-riwayat-titik-temu">
              <h3
                id="judul-riwayat-titik-temu"
                className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Riwayat Usulan
              </h3>
              <ol
                className="m-0 list-none space-y-1.5 p-0"
                id="meeting-point-events"
              >
                {meeting.events.length > 0 ? (
                  meeting.events.map((event) => (
                    <li
                      className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-container-low/60 px-3 py-2 text-[12px]"
                      key={`${event.type}-${event.at}`}
                    >
                      <span className="text-on-surface">
                        <strong className="font-semibold">
                          {EVENT_LABELS[event.type] ?? event.type}
                        </strong>
                        {event.note ? ` — ${event.note}` : ""}
                      </span>
                      <time className="tabular-nums shrink-0 text-on-surface-variant">
                        {event.at}
                      </time>
                    </li>
                  ))
                ) : (
                  <li className="text-[12px] text-on-surface-variant">
                    Belum ada riwayat usulan.
                  </li>
                )}
              </ol>
            </section>

            <label className="m-0 block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Catatan keputusan (wajib saat menolak)
              </span>
              <textarea
                className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-surface-container-low p-3 text-sm text-on-surface focus:bg-surface-card focus:outline-none"
                id="meeting-point-note"
                placeholder="Contoh: penerima menunggu di lobi gedung sebelah..."
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
            id="btn-reject-meeting-point"
            disabled={busy !== null || !meeting}
            busy={busy === "rejected"}
            busyText="Menolak..."
            onClick={() => decide("rejected")}
          >
            Tolak
          </Button>
          <Button
            variant="primary"
            size="md"
            id="btn-approve-meeting-point"
            disabled={busy !== null || !meeting || (override && !overridePoint)}
            busy={busy === "approved"}
            busyText="Menyimpan..."
            onClick={() => decide("approved")}
          >
            <MaterialIcon name="handshake" className="text-[18px]" />
            {overridePoint ? "Tetapkan Titik Ini" : "Setujui Titik Usulan"}
          </Button>
        </footer>
      </dialog>
    </section>
  );
}
