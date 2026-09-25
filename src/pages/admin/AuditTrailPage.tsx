import { useState } from "react";
import { Link } from "react-router-dom";
import { LoadingButton } from "../../components/LoadingAction";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useToast } from "../../context/ToastContext";
import { useSeo } from "../../hooks/useSeo";
import { setDecision as saveDecision } from "../../lib/storage";

const TRACKING = "ANT-INST-8829104";

const MILESTONES = [
  {
    time: "14:10 WIB",
    datetime: "14:10",
    text: "Paket diambil dari Hub Jak-Sel oleh Satria #4821",
    accent: false,
  },
  {
    time: "14:26 WIB",
    datetime: "14:26",
    text: "Kurir tiba di Jl. Senopati No. 42 (28 m dari titik tujuan)",
    accent: false,
  },
  {
    time: "14:30 WIB",
    datetime: "14:30",
    text: "PIN 8391 terverifikasi oleh penerima langsung",
    accent: "tertiary" as const,
  },
  {
    time: "14:32 WIB",
    datetime: "14:32",
    text: "Pengiriman dituntaskan dengan toleransi jarak (+12 m)",
    accent: "magenta" as const,
  },
];

export function AuditTrailPage() {
  useSeo("/admin/audit-trail");
  const toast = useToast();

  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState(false);
  const [saved, setSaved] = useState(false);

  function save() {
    const rejected = decision === "reject";
    if (rejected && !notes.trim()) {
      toast("Catatan wajib diisi saat menolak / investigasi.", "error");
      setNotesError(true);
      return;
    }
    saveDecision(TRACKING, rejected ? "reject" : "approve", notes);
    setSaved(true);
    toast(
      rejected
        ? "Kasus ditandai untuk investigasi."
        : "Kasus disahkan dan ditutup.",
    );
  }

  return (
    <>
      <main
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8"
        id="konten-utama"
      >
        <nav
          className="mb-6 flex items-center justify-between gap-3 pb-4"
          aria-label="Aksi audit"
        >
          <Link
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            to="/admin/dashboard"
          >
            <MaterialIcon
              name="arrow_back"
              className="text-[18px] transition-transform group-hover:-translate-x-0.5"
            />{" "}
            Kembali ke Daftar Pengiriman
          </Link>
          <LoadingButton
            className="btn-export inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2 text-[13px] font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container-high"
            id="btn-export-audit"
            busyText="Menyiapkan PDF..."
            onAction={() => {
              toast("Menyiapkan berkas audit untuk diunduh.");
              window.print();
            }}
          >
            <MaterialIcon
              name="picture_as_pdf"
              className="text-[18px] text-on-surface-variant"
            />{" "}
            Ekspor Audit (PDF)
          </LoadingButton>
        </nav>

        <article className="mb-6 rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card">
          <header className="flex flex-col justify-between gap-4 border-b border-border-subtle pb-5 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="tabular-nums text-xl font-bold tracking-tight text-on-surface">
                {TRACKING}
              </h1>
              <mark className="rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-on-secondary-container">
                Instant Delivery
              </mark>
              <mark className="flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                <span
                  className="size-1.5 rounded-full bg-alert-amber"
                  aria-hidden="true"
                />{" "}
                +12 m Geofence
              </mark>
            </div>
            <p className="m-0 inline-flex w-fit items-center gap-2 rounded-full border border-border-subtle bg-surface-container-low px-3 py-1.5 text-[11px] font-semibold text-tertiary">
              <span
                className="size-2 rounded-full bg-tertiary"
                aria-hidden="true"
              />{" "}
              Selesai 14:32 WIB
            </p>
          </header>
          <section className="flex flex-col justify-between gap-4 pt-5 sm:flex-row sm:items-center">
            <p className="m-0 flex items-center gap-3.5">
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-magenta/10 text-[15px] font-bold text-brand-magenta"
                aria-hidden="true"
              >
                A
              </span>
              <span className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span className="text-base font-bold text-on-surface">
                    Satria #4821
                  </span>{" "}
                  <span className="text-sm text-on-surface-variant">
                    (Ahmad Satria)
                  </span>
                </span>
                <span className="mt-0.5 text-xs text-on-surface-variant">
                  Layanan Instant 2 Jam &bull; Hub Jakarta Selatan
                </span>
              </span>
            </p>
            <address className="m-0 flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-container-low px-3.5 py-2 text-xs font-medium not-italic text-on-surface-variant">
              <MaterialIcon name="route" className="text-[16px]" /> Hub Jak-Sel
              &rarr; Jl. Senopati No. 42
            </address>
          </section>
        </article>

        <section className="flex flex-col space-y-6" aria-label="Detail audit">
          <article
            className="space-y-5 rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card"
            aria-labelledby="sec-geofence"
          >
            <header className="flex items-center justify-between border-b border-border-subtle pb-4">
              <h2
                id="sec-geofence"
                className="flex items-center gap-2.5 text-base font-bold text-on-surface"
              >
                <MaterialIcon
                  name="location_on"
                  className="text-[22px] text-brand-magenta"
                />{" "}
                1. Validasi Geofence
              </h2>
              <mark className="flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                <span
                  className="size-1.5 rounded-full bg-alert-amber"
                  aria-hidden="true"
                />{" "}
                +12 m (Dalam Toleransi)
              </mark>
            </header>
            <section className="grid grid-cols-1 items-center gap-5 md:grid-cols-3">
              <figure
                className="relative m-0 h-44 overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low shadow-sm md:col-span-2"
                aria-label="Visual peta titik tujuan dan posisi kurir"
              >
                <span className="absolute inset-0 grid place-items-center">
                  <span className="relative block size-40">
                    <span className="absolute inset-0 rounded-full border-2 border-dashed border-brand-magenta/40 bg-brand-magenta/10" />
                    <span className="absolute inset-6 rounded-full border border-brand-magenta/30 bg-brand-magenta/10" />
                  </span>
                </span>
                <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                  <span className="grid size-7 place-items-center rounded-full border-2 border-white bg-primary text-white shadow-lg">
                    <MaterialIcon name="flag" className="text-[16px]" />
                  </span>
                  <span className="mt-0.5 whitespace-nowrap rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Titik Tujuan
                  </span>
                </span>
                <span className="absolute left-[70%] top-[38%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                  <span className="grid size-7 place-items-center rounded-full border-2 border-white bg-alert-amber text-on-secondary-fixed shadow-lg">
                    <MaterialIcon name="two_wheeler" className="text-[16px]" />
                  </span>
                  <span className="mt-0.5 whitespace-nowrap rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Kurir +12 m
                  </span>
                </span>
                <figcaption className="sr-only">
                  Kurir berada 12 meter dari titik tujuan, di dalam toleransi
                  radius 30 meter.
                </figcaption>
              </figure>
              <dl className="m-0 h-full space-y-3 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4">
                <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Titik Selesai
                </dt>
                <dd className="ml-0 mt-0 text-sm font-semibold text-on-surface">
                  Lobi Gedung Office Park
                </dd>
                <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Analisis Jarak
                </dt>
                <dd className="ml-0 mt-0 text-xs leading-relaxed text-on-surface-variant">
                  Deviasi +12 m dinilai wajar untuk area drop-off / parkir lobi
                  perkantoran.
                </dd>
              </dl>
            </section>
          </article>

          <article
            className="space-y-5 rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card"
            aria-labelledby="sec-pod"
          >
            <header className="flex items-center justify-between border-b border-border-subtle pb-4">
              <h2
                id="sec-pod"
                className="flex items-center gap-2.5 text-base font-bold text-on-surface"
              >
                <MaterialIcon
                  name="verified"
                  className="text-[22px] text-tertiary"
                />{" "}
                2. Autentikasi POD &amp; Foto Serah Terima
              </h2>
              <mark className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-container-low px-3 py-1 text-xs font-bold text-tertiary">
                <MaterialIcon name="check_circle" className="text-[16px]" />{" "}
                Terverifikasi
              </mark>
            </header>
            <section className="flex flex-col items-start gap-5 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4 sm:flex-row sm:items-center">
              <figure className="relative m-0 grid h-28 w-40 shrink-0 place-items-center overflow-hidden rounded-lg border border-border-subtle bg-gradient-to-br from-neutral-700 to-neutral-900">
                <MaterialIcon
                  name="photo_camera"
                  className="text-[28px] text-white/25"
                />
                <figcaption className="tabular-nums absolute bottom-1.5 right-1.5 rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">
                  14:31 WIB
                </figcaption>
              </figure>
              <section className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="m-0 flex items-center gap-2">
                  <span className="text-base font-bold text-on-surface">
                    Bpk. Bambang
                  </span>{" "}
                  <mark className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                    Penerima Langsung
                  </mark>
                </p>
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  PIN cocok pada percobaan pertama. Geotag foto serah terima
                  sinkron dengan koordinat titik lobi tujuan. Watermark:{" "}
                  <code className="tabular-nums">
                    -6.2401, 106.8093 &bull; 22 Sep 2024 15:14 WIB
                  </code>
                  .
                </p>
                <mark className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-tertiary shadow-sm">
                  <MaterialIcon name="lock_open" className="text-[15px]" /> PIN:
                  8391 Terverifikasi
                </mark>
              </section>
            </section>
          </article>

          <article
            className="space-y-5 rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card"
            aria-labelledby="sec-kronologi"
          >
            <header className="flex items-center justify-between border-b border-border-subtle pb-4">
              <h2
                id="sec-kronologi"
                className="flex items-center gap-2.5 text-base font-bold text-on-surface"
              >
                <MaterialIcon
                  name="schedule"
                  className="text-[22px] text-on-surface-variant"
                />{" "}
                3. Ringkasan Kronologis
              </h2>
              <span className="text-xs font-medium text-on-surface-variant">
                4 Milestone
              </span>
            </header>
            <ol className="relative m-0 list-none space-y-4 pl-3 text-sm">
              {MILESTONES.map((milestone) => {
                const timeClass =
                  milestone.accent === "tertiary"
                    ? "text-tertiary font-bold"
                    : milestone.accent === "magenta"
                      ? "text-brand-magenta font-bold"
                      : "text-on-surface-variant font-medium";
                const dotClass =
                  milestone.accent === "tertiary"
                    ? "bg-tertiary"
                    : milestone.accent === "magenta"
                      ? "bg-brand-magenta"
                      : "bg-border-subtle";
                const textClass = milestone.accent
                  ? "text-on-surface font-semibold text-xs sm:text-sm"
                  : "text-on-surface-variant text-xs sm:text-sm";
                return (
                  <li
                    key={milestone.datetime}
                    className="flex items-start gap-4"
                  >
                    <time
                      className={`w-20 shrink-0 pt-0.5 text-xs ${timeClass}`}
                      dateTime={milestone.datetime}
                    >
                      {milestone.time}
                    </time>
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${dotClass}`}
                      aria-hidden="true"
                    />
                    <span className={textClass}>{milestone.text}</span>
                  </li>
                );
              })}
            </ol>
          </article>

          <article
            className="space-y-5 rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card"
            aria-labelledby="sec-putusan"
          >
            <header className="flex items-center justify-between border-b border-border-subtle pb-4">
              <h2
                id="sec-putusan"
                className="flex items-center gap-2.5 text-base font-bold text-on-surface"
              >
                <MaterialIcon
                  name="gavel"
                  className="text-[22px] text-brand-magenta"
                />{" "}
                4. Putusan &amp; Resolusi Admin
              </h2>
              <span className="text-xs font-medium text-on-surface-variant">
                Aksi Akhir
              </span>
            </header>
            <form
              className="space-y-4"
              id="audit-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <fieldset className="m-0 flex items-center gap-6 border-0 p-0">
                  <legend className="sr-only">Putusan admin</legend>
                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-on-surface">
                    <input
                      className="size-4 cursor-pointer text-tertiary focus:ring-0"
                      id="audit-decision-approve"
                      name="decision"
                      type="radio"
                      value="approve"
                      checked={decision === "approve"}
                      onChange={() => setDecision("approve")}
                    />{" "}
                    <span>Sahkan Pengiriman</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-on-surface-variant">
                    <input
                      className="size-4 cursor-pointer text-error focus:ring-0"
                      id="audit-decision-reject"
                      name="decision"
                      type="radio"
                      value="reject"
                      checked={decision === "reject"}
                      onChange={() => setDecision("reject")}
                    />{" "}
                    <span>Tolak / Investigasi</span>
                  </label>
                </fieldset>
                <p className="m-0 flex items-center gap-3">
                  <output
                    className={`items-center gap-1.5 text-xs font-bold text-tertiary ${
                      saved ? "flex" : "hidden"
                    }`}
                    id="save-status"
                  >
                    <MaterialIcon name="check" className="text-[16px]" />{" "}
                    Tersimpan
                  </output>
                  <LoadingButton
                    className="whitespace-nowrap rounded-xl bg-brand-magenta px-5 py-2.5 text-sm font-bold text-on-primary shadow-sm transition-all hover:bg-primary active:scale-95"
                    id="btn-save-case"
                    type="submit"
                    busyText="Menyimpan..."
                    onAction={save}
                  >
                    Simpan &amp; Tutup Kasus
                  </LoadingButton>
                </p>
              </section>
              <p className="m-0">
                <label className="sr-only" htmlFor="audit-notes">
                  Catatan putusan admin
                </label>
                <textarea
                  className={`w-full resize-none rounded-xl border border-border-subtle bg-surface-container-low p-3.5 text-xs text-on-surface transition-colors focus:bg-surface-container-lowest focus:outline-none sm:text-sm ${
                    notesError ? "is-error" : ""
                  }`}
                  id="audit-notes"
                  placeholder="Catatan putusan admin (opsional, contoh: Deviasi wajar di area drop-off lobi kantor)..."
                  rows={2}
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setNotesError(false);
                  }}
                />
              </p>
            </form>
          </article>
        </section>
      </main>

      <footer className="border-t border-border-subtle px-4 py-6 text-[11px] text-on-surface-variant/70 lg:px-8">
        Audit trail bersifat read-only &bull; Setiap akses dicatat (FR-05-09)
        &bull; Data contoh untuk keperluan purwarupa.
      </footer>
    </>
  );
}
