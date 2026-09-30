import { useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import { LoadingLink } from "../../components/LoadingAction";
import { MaterialIcon } from "../../components/MaterialIcon";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useAvatar } from "../../hooks/useAvatar";
import { useFetch } from "../../hooks/useFetch";
import { useProofPhoto } from "../../hooks/useProofPhoto";
import { useSeo } from "../../hooks/useSeo";
import { setDecision } from "../../lib/storage";
import type { ExceptionDetail } from "../../types";

export function PengecualianDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  useSeo("/admin/pengecualian-detail");
  const detail = useFetch<{ data: ExceptionDetail }>(
    id ? `/api/exceptions/${encodeURIComponent(id)}` : null,
  );
  const exception = detail.data?.data;
  const tracking = exception?.tracking ?? id;
  const courierName = exception?.courierName ?? "Kurir";
  const [note, setNote] = useState("");
  const courierAvatar = useAvatar(courierName);
  const proofPhoto = useProofPhoto(tracking);

  if (detail.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-[13px] text-on-surface-variant">
        <Spinner /> Memuat detail pengecualian dari server...
      </div>
    );
  }

  if (id && !exception) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-[13px] text-on-surface-variant">
        <MaterialIcon name="search_off" className="mb-1 text-[32px]" />
        Resi <strong className="tabular-nums text-on-surface">{id}</strong>{" "}
        tidak ditemukan.
      </div>
    );
  }

  return (
    <>
      <main
        className="pointer-events-none mx-auto w-full max-w-7xl flex-1 select-none px-4 py-6 opacity-40 lg:px-8"
        aria-hidden="true"
      >
        <h1 className="mb-4 text-headline-xl font-bold tracking-tight">
          Antrian Pengecualian
        </h1>
        <p className="m-0 h-40 rounded-xl border border-border-subtle bg-surface-container-lowest" />
      </main>

      <section
        className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        id="exception-modal-overlay"
        aria-label="Tiruan latar antrian pengecualian"
      >
        <dialog
          className="m-0 block max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-subtle bg-surface-container-lowest p-0 shadow-2xl static"
          id="modal-exception"
          open
          aria-modal="true"
          aria-labelledby="judul-modal-pengecualian"
          data-tracking={tracking}
        >
          <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-container-lowest p-5">
            <section>
              <p className="m-0 flex items-center gap-2">
                <mark className="rounded-full bg-brand-magenta/10 px-2 py-0.5 text-[11px] font-bold uppercase text-brand-magenta">
                  {exception?.service ?? "Instant"}
                </mark>
                <span className="tabular-nums text-[12px] text-on-surface-variant">
                  {tracking}
                </span>
              </p>
              <h1
                id="judul-modal-pengecualian"
                className="mt-1 text-lg font-bold tracking-tight text-on-surface"
              >
                Detail Pengecualian Geofence
              </h1>
            </section>
            <Button
              as="link"
              to="/admin/antrian-pengecualian"
              variant="icon"
              className="shrink-0"
              id="btn-close-modal"
              aria-label="Tutup dialog"
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </Button>
          </header>

          <section className="space-y-5 p-5">
            <p className="m-0 flex items-center gap-3">
              <Avatar
                name={courierName}
                resource={courierAvatar}
                className="size-10 text-[14px]"
              />
              <span className="block leading-tight">
                <span className="block text-sm font-semibold text-on-surface">
                  {courierName}{" "}
                  <span className="text-[12px] font-normal text-on-surface-variant">
                    ({exception?.courierCode ?? "—"})
                  </span>
                </span>
                <span className="block text-[12px] text-on-surface-variant">
                  Tiket dibuat{" "}
                  <time dateTime={exception?.ticketIso ?? ""}>
                    {exception?.ticketAt ?? "—"}
                  </time>
                </span>
              </span>
              <mark className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                GPS Valid
              </mark>
            </p>

            <section
              className="rounded-xl border border-border-subtle bg-surface-container-low/60 p-4"
              aria-labelledby="judul-ringkasan-deviasi"
            >
              <h2
                id="judul-ringkasan-deviasi"
                className="mb-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Ringkasan Deviasi
              </h2>
              <dl className="m-0 grid grid-cols-3 gap-3 text-center">
                <dt className="sr-only">Selisih</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Selisih
                  </span>{" "}
                  <strong className="block text-[18px] font-extrabold text-amber-600">
                    +{exception?.deviation ?? 0} m
                  </strong>
                </dd>
                <dt className="sr-only">Toleransi Hub</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Toleransi Hub
                  </span>{" "}
                  <strong className="block text-[18px] font-extrabold text-on-surface">
                    {exception?.maxTolerance ?? 0} m
                  </strong>
                </dd>
                <dt className="sr-only">Jarak Aktual</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Jarak Aktual
                  </span>{" "}
                  <strong className="block text-[18px] font-extrabold text-on-surface">
                    {exception?.actualDistance ?? 0} m
                  </strong>
                </dd>
              </dl>
            </section>

            <section aria-labelledby="judul-alasan-kurir">
              <h2
                id="judul-alasan-kurir"
                className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Alasan Kurir
              </h2>
              <blockquote className="m-0 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4 text-sm leading-relaxed text-on-surface">
                &ldquo;{exception?.reason ?? "—"}&rdquo;
              </blockquote>
            </section>

            <section aria-labelledby="judul-bukti-lokasi">
              <h2
                id="judul-bukti-lokasi"
                className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Foto Bukti Lokasi (POD)
              </h2>
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
                    {exception?.podPoint ?? "—"}
                  </span>
                  <time
                    className="tabular-nums rounded bg-black/70 px-2 py-0.5 text-[10px] text-white"
                    dateTime={exception?.podIso ?? ""}
                  >
                    {exception?.podCapturedAt ?? "—"}
                  </time>
                </figcaption>
              </figure>
            </section>

            <p className="m-0">
              <label className="block">
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
            </p>
          </section>

          <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border-subtle bg-surface-container-lowest p-5">
            <LoadingLink
              variant="outline"
              size="md"
              id="btn-reject-exception"
              to="/admin/antrian-pengecualian?decision=reject"
              delay={850}
              busyText="Menolak..."
              onAction={() => setDecision(tracking, "reject", note)}
            >
              Tolak
            </LoadingLink>
            <LoadingLink
              variant="primary"
              size="md"
              id="btn-approve-exception"
              to="/admin/antrian-pengecualian?decision=approve"
              delay={850}
              busyText="Menyetujui..."
              onAction={() => setDecision(tracking, "approve", note)}
            >
              <MaterialIcon name="verified_user" className="text-[18px]" />{" "}
              Setujui Pengecualian
            </LoadingLink>
          </footer>
        </dialog>
      </section>
    </>
  );
}
