import { useState } from "react";
import { LoadingButton } from "../../components/LoadingAction";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useToast } from "../../context/ToastContext";
import { RADIUS_SEGMENTS } from "../../data/shipments";
import { useSeo } from "../../hooks/useSeo";
import { clamp } from "../../lib/format";
import { getRadii, setRadii } from "../../lib/storage";

function initialValues(): Record<string, number> {
  const saved = getRadii();
  return Object.fromEntries(
    RADIUS_SEGMENTS.map((segment) => [
      segment.id,
      clamp(
        saved[segment.id] ?? segment.defaultValue,
        segment.min,
        segment.max,
      ),
    ]),
  );
}

export function PengaturanRadiusPage() {
  useSeo("/admin/pengaturan-radius");
  const toast = useToast();

  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [baseline, setBaseline] =
    useState<Record<string, number>>(initialValues);

  const dirty = RADIUS_SEGMENTS.some(
    (segment) => values[segment.id] !== baseline[segment.id],
  );

  function step(id: string, delta: number) {
    const segment = RADIUS_SEGMENTS.find((item) => item.id === id);
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

  function apply() {
    setRadii(values);
    setBaseline(values);
    toast("Kebijakan radius berhasil diterapkan.");
  }

  return (
    <>
      <main
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8"
        id="konten-utama"
      >
        <header className="flex flex-col gap-1.5">
          <p className="m-0 flex items-center gap-2">
            <mark className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Kebijakan Geofence Sistem
            </mark>
            <span
              className="size-1.5 rounded-full bg-outline-variant"
              aria-hidden="true"
            />
            <span className="text-xs text-on-surface-variant">
              Fleet Safety Protocol v4.2
            </span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            Pengaturan Radius Layanan
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Tentukan batas toleransi jarak GPS kurir Satria untuk validasi serah
            terima paket pada tiap segmen layanan.
          </p>
        </header>

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
            <p className="m-0 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <MaterialIcon name="verified" className="text-[16px]" /> Standar
              Operasional Aktif
            </p>
          </header>

          <ul className="m-0 list-none divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-surface-container-lowest shadow-card p-0">
            {RADIUS_SEGMENTS.map((segment) => {
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
                      <MaterialIcon
                        name={segment.icon}
                        className="text-[24px]"
                      />
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
                      <button
                        className="stepper-btn grid size-8 place-items-center rounded-lg text-on-surface transition-all hover:bg-surface-container-lowest hover:shadow-sm"
                        aria-label={`Kurangi radius ${segment.label}`}
                        data-stepper={segment.id}
                        data-delta={-segment.step}
                        type="button"
                        onClick={() => step(segment.id, -segment.step)}
                      >
                        <MaterialIcon name="remove" className="text-[18px]" />
                      </button>
                      <label className="sr-only" htmlFor={segment.id}>
                        Radius {segment.label} (meter)
                      </label>
                      <input
                        className={`w-12 border-none bg-transparent text-center text-base font-bold outline-none focus:ring-0 ${segment.accent.input}`}
                        id={segment.id}
                        type="text"
                        inputMode="numeric"
                        value={value}
                        readOnly
                      />
                      <button
                        className="stepper-btn grid size-8 place-items-center rounded-lg text-on-surface transition-all hover:bg-surface-container-lowest hover:shadow-sm"
                        aria-label={`Tambah radius ${segment.label}`}
                        data-stepper={segment.id}
                        data-delta={segment.step}
                        type="button"
                        onClick={() => step(segment.id, segment.step)}
                      >
                        <MaterialIcon name="add" className="text-[18px]" />
                      </button>
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
                Superadmin (Dimas P.)
              </strong>{" "}
              &bull;{" "}
              <time dateTime="2024-09-12T09:15:00+07:00">
                12 Sep 2024, 09:15 WIB
              </time>
            </span>
          </p>
          <p className="m-0 flex w-full items-center justify-end gap-3 sm:w-auto">
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
              id="btn-reset-radius"
              type="button"
              onClick={reset}
            >
              Batalkan Perubahan
            </button>
            <LoadingButton
              className={`inline-flex items-center gap-2 rounded-xl bg-brand-magenta px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary ${
                dirty ? "" : "pointer-events-none opacity-50"
              }`}
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
      </main>

      <footer className="border-t border-border-subtle px-4 py-6 text-[11px] text-on-surface-variant/70 lg:px-8">
        Perubahan radius hanya berlaku untuk keputusan server berikutnya &bull;
        Data contoh untuk keperluan purwarupa.
      </footer>
    </>
  );
}
