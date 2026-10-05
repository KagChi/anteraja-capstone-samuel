import type { ReactNode } from "react";
import { useState } from "react";
import { Avatar } from "../../Components/Avatar";
import { AuditTrailMap } from "../../Components/admin/audit/AuditTrailMap";
import { LoadingButton } from "../../Components/LoadingAction";
import { PageHeader } from "../../Components/layout/PageHeader";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { Spinner } from "../../Components/ui/Spinner";
import { useToast } from "../../Contexts/ToastContext";
import { useAvatar } from "../../Hooks/useAvatar";
import { useFetch } from "../../Hooks/useFetch";
import { usePostalSearch } from "../../Hooks/usePostalSearch";
import { useSeo } from "../../Hooks/useSeo";
import { AdminLayout } from "../../Layouts/AdminLayout";
import { sendJson } from "../../lib/api";
import { districtFromAddress } from "../../lib/postal";
import type { DeliveryRow, ShipmentDetail } from "../../types";

export function AuditTrailPage({ id = "" }: { id?: string }) {
  useSeo("/admin/audit-trail");
  const toast = useToast();
  const detail = useFetch<{
    data: { shipment: DeliveryRow; detail: ShipmentDetail | null };
  }>(id ? `/api/v1/shipments/${encodeURIComponent(id)}` : null);
  const shipment = detail.data?.data?.shipment;
  const postal = usePostalSearch(districtFromAddress(shipment?.address));
  const audit = detail.data?.data?.detail;
  const geofence = audit?.geofence;
  const milestones = audit?.milestones ?? [];
  const tracking = shipment?.tracking ?? id;
  const courierName = shipment?.courierName ?? "Belum ditugaskan";
  const courierAvatar = useAvatar(courierName);

  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [podNote, setPodNote] = useState("");
  const [podBusy, setPodBusy] = useState<"invalid" | "valid" | null>(null);

  const podStatus = audit?.pod.reviewStatus ?? null;
  const podStatusLabel =
    podStatus === "valid"
      ? "POD Valid"
      : podStatus === "needs_review"
        ? "Perlu Tinjauan"
        : podStatus === "invalid"
          ? "Tidak Valid"
          : "Belum Ada POD";

  async function reviewPod(decision: "invalid" | "valid") {
    const proofId = audit?.pod.id;

    if (!proofId) return;

    if (decision === "invalid" && !podNote.trim()) {
      toast("Alasan wajib diisi saat menandai POD tidak valid.", "error");
      return;
    }

    setPodBusy(decision);

    try {
      await sendJson(
        "POST",
        `/api/v1/admin/proofs/${encodeURIComponent(proofId)}/review`,
        { decision, note: podNote.trim() || null },
      );
      setPodNote("");
      toast(
        decision === "invalid"
          ? "POD ditandai tidak valid (FR-02-09)."
          : "POD dikembalikan menjadi valid.",
      );
      detail.reload();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan tinjauan POD.",
        "error",
      );
    } finally {
      setPodBusy(null);
    }
  }

  async function save() {
    const rejected = decision === "reject";
    if (rejected && !notes.trim()) {
      toast("Catatan wajib diisi saat menolak / investigasi.", "error");
      setNotesError(true);
      return;
    }

    try {
      await sendJson(
        "POST",
        `/api/v1/admin/shipments/${encodeURIComponent(tracking)}/close-case`,
        { decision: rejected ? "rejected" : "approved", note: notes || null },
      );
      setSaved(true);
      toast(
        rejected
          ? "Kasus ditandai untuk investigasi."
          : "Kasus disahkan dan ditutup.",
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Gagal menyimpan putusan.",
        "error",
      );
    }
  }

  if (detail.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-[13px] text-on-surface-variant">
        <Spinner /> Memuat detail audit dari server...
      </div>
    );
  }

  if (id && !shipment) {
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
      <PageHeader
        title="Detail Audit Trail"
        description="Jejak bukti integritas pengiriman dan keputusan admin."
      />

      <nav
        className="flex items-center justify-between gap-3"
        aria-label="Aksi audit"
      >
        <Button
          as="link"
          to="/admin/dashboard"
          variant="textNeutral"
          className="group text-[13px]"
        >
          <MaterialIcon
            name="arrow_back"
            className="text-[18px] transition-transform group-hover:-translate-x-0.5"
          />{" "}
          Kembali ke Daftar Pengiriman
        </Button>
        <LoadingButton
          variant="secondary"
          size="sm"
          className="px-4"
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

      <article className="mb-6 rounded-md border border-border-subtle bg-surface-card p-6 shadow-card">
        <header className="flex flex-col justify-between gap-4 border-b border-border-subtle pb-5 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="tabular-nums text-xl font-bold tracking-tight text-on-surface">
              {tracking}
            </h2>
            <mark className="rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-on-secondary-container">
              Instant Delivery
            </mark>
          </div>
          <p className="m-0 inline-flex w-fit items-center gap-2 rounded-full border border-border-subtle bg-surface-container-low px-3 py-1.5 text-[11px] font-semibold text-tertiary">
            <span
              className="size-2 rounded-full bg-tertiary"
              aria-hidden="true"
            />{" "}
            {audit?.completedLabel ?? "—"}
          </p>
        </header>
        <section className="flex flex-col justify-between gap-4 pt-5 sm:flex-row sm:items-center">
          <p className="m-0 flex items-center gap-3.5">
            <Avatar
              name={courierName}
              resource={courierAvatar}
              className="size-11 text-[15px]"
            />
            <span className="flex flex-col">
              <span className="flex items-center gap-2">
                <span className="text-base font-bold text-on-surface">
                  {shipment?.courierCode ?? "—"}
                </span>{" "}
                <span className="text-sm text-on-surface-variant">
                  ({courierName})
                </span>
              </span>
              <span className="mt-0.5 text-xs text-on-surface-variant">
                {shipment?.service ?? "—"} &bull; {shipment?.regionLabel ?? "—"}
              </span>
            </span>
          </p>
          <address className="m-0 flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface-container-low px-3.5 py-2 text-xs font-medium not-italic text-on-surface-variant">
            <MaterialIcon name="route" className="text-[16px]" />{" "}
            {shipment?.regionLabel ?? "—"} &rarr; {shipment?.address ?? "—"}
            <span className="ml-1 flex items-center gap-1.5 border-l border-border-subtle pl-2">
              <MaterialIcon
                name="markunread_mailbox"
                className="text-[15px] text-brand-magenta"
              />
              {postal.isLoading ? (
                <span className="inline-flex items-center gap-1 text-on-surface-variant/70">
                  <Spinner /> Mencari kode pos...
                </span>
              ) : postal.isError ? (
                <Button
                  variant="text"
                  className="text-[11px]"
                  onClick={postal.reload}
                >
                  Kode pos gagal dimuat &bull; Coba lagi
                </Button>
              ) : postal.data?.[0] ? (
                <span className="tabular-nums font-semibold text-on-surface">
                  Kode pos {postal.data[0].code}
                </span>
              ) : (
                <span className="text-on-surface-variant/70">
                  Kode pos tidak ditemukan
                </span>
              )}
            </span>
          </address>
        </section>
      </article>

      <section className="flex flex-col space-y-6" aria-label="Detail audit">
        <article
          className="space-y-5 rounded-md border border-border-subtle bg-surface-card p-6 shadow-card"
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
          </header>
          <section className="grid grid-cols-1 items-center gap-5 md:grid-cols-3">
            {geofence ? (
              <figure
                className="relative z-0 m-0 h-44 overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low shadow-sm md:col-span-2"
                aria-label="Visual peta titik tujuan dan posisi kurir"
              >
                <AuditTrailMap
                  target={geofence.target}
                  courier={geofence.courier}
                  radiusMeters={geofence.radiusMeters}
                  deviationMeters={geofence.deviationMeters}
                />
                <figcaption className="sr-only">
                  Kurir berada {geofence.deviationMeters} meter dari titik
                  tujuan, di dalam toleransi radius {geofence.radiusMeters}{" "}
                  meter.
                </figcaption>
              </figure>
            ) : null}
            <dl className="m-0 h-full space-y-3 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4">
              <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Titik Selesai
              </dt>
              <dd className="ml-0 mt-0 text-sm font-semibold text-on-surface">
                {geofence?.pointLabel ?? "—"}
              </dd>
              <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Analisis Jarak
              </dt>
              <dd className="ml-0 mt-0 text-xs leading-relaxed text-on-surface-variant">
                {geofence?.analysis ?? "—"}
              </dd>
            </dl>
          </section>
        </article>

        <article
          className="space-y-5 rounded-md border border-border-subtle bg-surface-card p-6 shadow-card"
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
          </header>
          <section className="flex flex-col items-start gap-5 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4 sm:flex-row sm:items-center">
            <figure className="relative m-0 grid h-28 w-40 shrink-0 place-items-center overflow-hidden rounded-lg border border-border-subtle bg-gradient-to-br from-neutral-700 to-neutral-900">
              {audit?.pod.photoUrl ? (
                <img
                  src={audit.pod.photoUrl}
                  alt="Foto bukti serah terima ber-watermark"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <MaterialIcon
                  name="photo_camera"
                  className="text-[28px] text-white/25"
                />
              )}
              <figcaption className="tabular-nums absolute bottom-1.5 right-1.5 rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">
                {audit?.pod.capturedTime ?? "—"}
              </figcaption>
            </figure>
            <section className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="m-0 flex items-center gap-2">
                <span className="text-base font-bold text-on-surface">
                  {shipment?.recipient ??
                    audit?.pod.recipientName ??
                    "Penerima"}
                </span>{" "}
                {audit?.pod.relation ? (
                  <mark className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                    {audit.pod.relation}
                  </mark>
                ) : null}
              </p>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                PIN cocok pada percobaan pertama. Geotag foto serah terima
                sinkron dengan koordinat titik lobi tujuan. Watermark:{" "}
                <code className="tabular-nums">
                  {audit?.pod.watermark ?? "—"}
                </code>
                .
              </p>
              <mark className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-tertiary shadow-sm">
                <MaterialIcon name="lock_open" className="text-[15px]" /> PIN:{" "}
                {audit?.pod.pin ?? "—"} Terverifikasi
              </mark>
            </section>
          </section>

          {audit?.pod.id ? (
            <section
              className="space-y-3 rounded-xl border border-border-subtle bg-surface-container-low/60 p-4"
              aria-labelledby="judul-review-pod"
            >
              <header className="flex flex-wrap items-center justify-between gap-2">
                <h3
                  id="judul-review-pod"
                  className="m-0 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Peninjauan POD
                </h3>
                <mark
                  className={
                    "rounded-full px-2.5 py-0.5 text-[11px] font-bold " +
                    (podStatus === "invalid"
                      ? "bg-red-50 text-red-700"
                      : podStatus === "needs_review"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700")
                  }
                >
                  {podStatusLabel}
                </mark>
              </header>
              {audit.pod.reviewNote ? (
                <p className="m-0 text-xs text-on-surface-variant">
                  Catatan terakhir: {audit.pod.reviewNote}
                </p>
              ) : null}
              <label className="m-0 block">
                <span className="sr-only">Alasan tinjauan POD</span>
                <textarea
                  className="w-full resize-none rounded-xl border border-border-subtle bg-surface-container-lowest p-3 text-sm text-on-surface focus:bg-surface-card focus:outline-none"
                  id="pod-review-note"
                  placeholder="Alasan bila menandai POD tidak valid..."
                  rows={2}
                  value={podNote}
                  onChange={(event) => setPodNote(event.target.value)}
                />
              </label>
              <p className="m-0 flex flex-wrap items-center gap-2">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  className="border-error/30 px-4 text-error"
                  id="btn-invalidate-pod"
                  delay={150}
                  busyText="Menyimpan..."
                  disabled={podBusy !== null}
                  onAction={() => reviewPod("invalid")}
                >
                  Tandai Tidak Valid
                </LoadingButton>
                {podStatus === "invalid" ? (
                  <LoadingButton
                    variant="secondary"
                    size="sm"
                    className="px-4"
                    id="btn-restore-pod"
                    delay={150}
                    busyText="Memulihkan..."
                    disabled={podBusy !== null}
                    onAction={() => reviewPod("valid")}
                  >
                    Kembalikan Valid
                  </LoadingButton>
                ) : null}
              </p>
            </section>
          ) : null}
        </article>

        <article
          className="space-y-5 rounded-md border border-border-subtle bg-surface-card p-6 shadow-card"
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
              {milestones.length} Milestone
            </span>
          </header>
          <ol className="relative m-0 list-none space-y-4 pl-3 text-sm">
            {milestones.map((milestone) => {
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
                <li key={milestone.datetime} className="flex items-start gap-4">
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
          className="space-y-5 rounded-md border border-border-subtle bg-surface-card p-6 shadow-card"
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
                  variant="primary"
                  size="md"
                  className="whitespace-nowrap"
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
    </>
  );
}

export default AuditTrailPage;
AuditTrailPage.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;
