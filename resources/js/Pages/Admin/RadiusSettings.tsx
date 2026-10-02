import type { ReactNode } from "react";
import { useState } from "react";
import { LoadingButton } from "../../Components/LoadingAction";
import { PageHeader } from "../../Components/layout/PageHeader";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { Spinner } from "../../Components/ui/Spinner";
import { useToast } from "../../Contexts/ToastContext";
import { useFetch } from "../../Hooks/useFetch";
import { useSeo } from "../../Hooks/useSeo";
import { AdminLayout } from "../../Layouts/AdminLayout";
import { sendJson } from "../../lib/api";
import { clamp } from "../../lib/format";
import type { RadiusMeta, RadiusSegment } from "../../types";

const SERVICE_TYPES: Record<string, string> = {
  "radius-instant": "instant",
  "radius-sameday": "same_day",
  "radius-reguler": "regular",
};

const RADIUS_TITLE = "Pengaturan Radius Layanan";

const RADIUS_DESCRIPTION =
  "Tentukan batas toleransi jarak GPS kurir Satria untuk validasi serah terima paket pada tiap segmen layanan.";

function buildValues(segments: RadiusSegment[]): Record<string, number> {
  return Object.fromEntries(
    segments.map((segment) => [
      segment.id,
      clamp(segment.defaultValue, segment.min, segment.max),
    ]),
  );
}

function RadiusPolicy({
  segments,
  meta,
  onApplied,
}: {
  segments: RadiusSegment[];
  meta?: RadiusMeta;
  onApplied?: () => void;
}) {
  const toast = useToast();

  const [values, setValues] = useState<Record<string, number>>(() =>
    buildValues(segments),
  );
  const [baseline, setBaseline] = useState<Record<string, number>>(() =>
    buildValues(segments),
  );

  const dirty = segments.some(
    (segment) => values[segment.id] !== baseline[segment.id],
  );

  function step(id: string, delta: number) {
    const segment = segments.find((item) => item.id === id);
    if (!segment) return;
    const current = values[id] ?? segment.min;
    const next = clamp(current + delta, segment.min, segment.max);
    if (next === current) {
      toast(`Batas ${segment.min}-${segment.max} meter tercapai.`, "error");
      return;
    }
    setValues((prev) => ({ ...prev, [id]: next }));
  }

  function reset() {
    setValues(baseline);
    toast("Perubahan dibatalkan.");
  }

  async function apply() {
    const changed = segments.filter(
      (segment) => values[segment.id] !== baseline[segment.id],
    );

    for (const segment of changed) {
      const serviceType = SERVICE_TYPES[segment.id];
      if (!serviceType) continue;

      await sendJson("PUT", "/api/v1/admin/radius-segments", {
        service_type: serviceType,
        radius_m: values[segment.id],
      });
    }

    setBaseline(values);
    toast("Kebijakan radius berhasil diterapkan.");
    onApplied?.();
  }

  return (
    <>
      <PageHeader title={RADIUS_TITLE} description={RADIUS_DESCRIPTION} />

      <section
        className="flex flex-col gap-3"
        aria-labelledby="judul-radius-segmen"
      >
        <header className="flex items-center justify-between px-1">
          <h2
            id="judul-radius-segmen"
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Batas Radius Geofence Berdasarkan Segmen Layanan
          </h2>
        </header>

        <ul className="m-0 list-none divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-surface-container-lowest shadow-card p-0">
          {segments.map((segment) => {
            const value = values[segment.id];
            return (
              <li
                key={segment.id}
                className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center"
              >
                <section className="flex min-w-0 items-start gap-4">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${segment.accent.iconBg} ${segment.accent.iconText}`}
                    aria-hidden="true"
                  >
                    <MaterialIcon name={segment.icon} className="text-[24px]" />
                  </span>
                  <section className="flex min-w-0 flex-col">
                    <p className="m-0 flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-on-surface">
                        {segment.label}
                      </span>
                      <mark
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${segment.accent.slaBg} ${segment.accent.slaText}`}
                      >
                        {segment.sla}
                      </mark>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      {segment.description}
                    </p>
                  </section>
                </section>
                <section className="flex shrink-0 items-center gap-3 self-end md:self-center">
                  <p className="m-0 flex items-center rounded-xl border border-border-subtle bg-surface-container p-1">
                    <Button
                      variant="icon"
                      aria-label={`Kurangi radius ${segment.label}`}
                      data-stepper={segment.id}
                      data-delta={-segment.step}
                      onClick={() => step(segment.id, -segment.step)}
                    >
                      <MaterialIcon name="remove" className="text-[18px]" />
                    </Button>
                    <label className="sr-only" htmlFor={segment.id}>
                      Radius {segment.label} (meter)
                    </label>
                    <input
                      className={`h-8 w-14 shrink-0 border-none bg-transparent p-0 text-center text-base font-bold tabular-nums outline-none focus:ring-0 ${segment.accent.input}`}
                      id={segment.id}
                      type="text"
                      inputMode="numeric"
                      value={value}
                      readOnly
                    />
                    <Button
                      variant="icon"
                      aria-label={`Tambah radius ${segment.label}`}
                      data-stepper={segment.id}
                      data-delta={segment.step}
                      onClick={() => step(segment.id, segment.step)}
                    >
                      <MaterialIcon name="add" className="text-[18px]" />
                    </Button>
                  </p>
                  <span className="w-14 shrink-0 text-xs font-semibold text-on-surface-variant">
                    meter
                  </span>
                </section>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="flex flex-col-reverse items-center justify-between gap-4 border-t border-border-subtle pt-4 sm:flex-row">
        <p className="m-0 flex items-center gap-2 text-xs text-on-surface-variant">
          <MaterialIcon name="history" className="text-[16px] text-outline" />
          <span>
            Terakhir diperbarui oleh{" "}
            <strong className="font-semibold text-on-surface">
              {meta?.updatedBy ?? "Superadmin"}
            </strong>{" "}
            &bull;{" "}
            <time dateTime={meta?.updatedAtIso ?? ""}>
              {meta?.updatedAtLabel ?? "—"}
            </time>
          </span>
        </p>
        <p className="m-0 flex w-full items-center justify-end gap-3 sm:w-auto">
          <Button
            variant="ghost"
            size="md"
            id="btn-reset-radius"
            onClick={reset}
          >
            Batalkan Perubahan
          </Button>
          <LoadingButton
            variant="primary"
            size="md"
            id="btn-save-radius"
            busyText="Menerapkan..."
            disabled={!dirty}
            onAction={apply}
          >
            <MaterialIcon name="check_circle" className="text-[18px]" />{" "}
            Terapkan Kebijakan Radius
          </LoadingButton>
        </p>
      </footer>
    </>
  );
}

export function RadiusSettingsPage() {
  useSeo("/admin/pengaturan-radius");
  const resource = useFetch<{ data: RadiusSegment[]; meta: RadiusMeta }>(
    "/api/v1/admin/radius-segments",
  );
  const segments = resource.data?.data ?? [];

  if (resource.isLoading) {
    return (
      <>
        <PageHeader title={RADIUS_TITLE} description={RADIUS_DESCRIPTION} />
        <p className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-on-surface-variant">
          <Spinner /> Memuat kebijakan radius dari server...
        </p>
      </>
    );
  }

  if (resource.isError || segments.length === 0) {
    return (
      <>
        <PageHeader title={RADIUS_TITLE} description={RADIUS_DESCRIPTION} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-sm text-on-surface-variant">
          <MaterialIcon name="cloud_off" className="text-[28px]" />
          Gagal memuat kebijakan radius dari server.
          <Button
            variant="text"
            className="text-[12px]"
            onClick={resource.reload}
          >
            Coba lagi
          </Button>
        </div>
      </>
    );
  }

  return (
    <RadiusPolicy
      segments={segments}
      meta={resource.data?.meta}
      onApplied={resource.reload}
    />
  );
}

export default RadiusSettingsPage;
RadiusSettingsPage.layout = (page: ReactNode) => (
  <AdminLayout>{page}</AdminLayout>
);
