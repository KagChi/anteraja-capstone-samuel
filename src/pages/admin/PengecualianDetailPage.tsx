import { useState } from "react";
import { Link } from "react-router-dom";
import { LoadingLink } from "../../components/LoadingAction";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useSeo } from "../../hooks/useSeo";
import { setDecision } from "../../lib/storage";

const TRACKING = "ANT-INST-99201";

export function PengecualianDetailPage() {
  useSeo("/admin/pengecualian-detail");
  const [note, setNote] = useState("");

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
          data-tracking={TRACKING}
        >
          <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-container-lowest p-5">
            <section>
              <p className="m-0 flex items-center gap-2">
                <mark className="rounded-full bg-brand-magenta/10 px-2 py-0.5 text-[11px] font-bold uppercase text-brand-magenta">
                  Instant
                </mark>
                <span className="tabular-nums text-[12px] text-on-surface-variant">
                  #ANT-99201
                </span>
              </p>
              <h1
                id="judul-modal-pengecualian"
                className="mt-1 text-lg font-bold tracking-tight text-on-surface"
              >
                Detail Pengecualian Geofence
              </h1>
            </section>
            <Link
              className="grid size-8 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container"
              to="/admin/antrian-pengecualian"
              id="btn-close-modal"
              aria-label="Tutup dialog"
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </Link>
          </header>

          <section className="space-y-5 p-5">
            <p className="m-0 flex items-center gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-magenta/10 text-[14px] font-bold text-brand-magenta"
                aria-hidden="true"
              >
                B
              </span>
              <span className="block leading-tight">
                <span className="block text-sm font-semibold text-on-surface">
                  Budi Pratama{" "}
                  <span className="text-[12px] font-normal text-on-surface-variant">
                    (SAT-8821)
                  </span>
                </span>
                <span className="block text-[12px] text-on-surface-variant">
                  Tiket dibuat{" "}
                  <time dateTime="2024-09-22T14:41:00+07:00">
                    22 Sep 2024 &bull; 14:41 WIB
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
                    +64 m
                  </strong>
                </dd>
                <dt className="sr-only">Toleransi Hub</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Toleransi Hub
                  </span>{" "}
                  <strong className="block text-[18px] font-extrabold text-on-surface">
                    30 m
                  </strong>
                </dd>
                <dt className="sr-only">Jarak Aktual</dt>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-lowest p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Jarak Aktual
                  </span>{" "}
                  <strong className="block text-[18px] font-extrabold text-on-surface">
                    94 m
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
                &ldquo;Gate cluster ditutup untuk kendaraan. Akses hanya lewat
                pos satpam yang berada sekitar 90 meter dari titik tujuan.
                Penerima mengonfirmasi via telepon agar paket dititipkan di
                pos.&rdquo;
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
                <MaterialIcon
                  name="photo_camera"
                  className="text-[32px] text-white/25"
                />
                <figcaption className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                  <span className="tabular-nums rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">
                    -6.2418, 106.8086
                  </span>
                  <time
                    className="tabular-nums rounded bg-black/70 px-2 py-0.5 text-[10px] text-white"
                    dateTime="2024-09-22T14:40:00+07:00"
                  >
                    22 Sep 2024 &bull; 14:40 WIB
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
              className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
              id="btn-reject-exception"
              to="/admin/antrian-pengecualian?decision=reject"
              delay={850}
              busyText="Menolak..."
              onAction={() => setDecision(TRACKING, "reject", note)}
            >
              Tolak
            </LoadingLink>
            <LoadingLink
              className="btn-primary inline-flex items-center gap-2 rounded-xl bg-brand-magenta px-5 py-2.5 text-sm font-bold text-on-primary shadow-sm transition-all hover:bg-primary"
              id="btn-approve-exception"
              to="/admin/antrian-pengecualian?decision=approve"
              delay={850}
              busyText="Menyetujui..."
              onAction={() => setDecision(TRACKING, "approve", note)}
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
