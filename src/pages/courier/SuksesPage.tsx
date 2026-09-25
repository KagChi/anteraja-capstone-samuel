import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CourierBottomNav } from "../../components/courier/CourierBottomNav";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useSession } from "../../context/SessionContext";
import { useSeo } from "../../hooks/useSeo";
import { formatStamp, initialOf, randomDigits } from "../../lib/format";
import { markCompleted } from "../../lib/storage";

const TRACKING = "ANT-INST-882910394";

export function SuksesPage() {
  useSeo("/courier/sukses");
  const { session } = useSession();
  const name = session?.name ?? "Satria";

  const [done, setDone] = useState(8);
  const [hash] = useState(() => `AUD-SEC-${randomDigits(4)}-SHA256`);
  const [stamp] = useState(() => new Date());

  useEffect(() => {
    const completed = markCompleted(TRACKING);
    setDone(8 + completed.length);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-on-surface antialiased">
      <header className="fixed top-0 z-50 w-full border-b border-border-subtle bg-surface/90 pt-safe backdrop-blur-md">
        <p className="mx-auto flex h-14 max-w-md items-center justify-between px-5 m-0">
          <Link
            className="flex items-center gap-2.5"
            to="/"
            aria-label="Kembali ke beranda Satria"
          >
            <img
              className="h-6 w-auto"
              src="/logo-anteraja.png"
              alt="Anteraja"
            />
          </Link>
          <span className="flex items-center gap-2.5">
            <span className="flex flex-col items-end leading-tight">
              <span className="text-[13px] font-semibold text-on-surface">
                {name}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                #4821 &bull; Jak-Sel
              </span>
            </span>
            <span
              className="grid size-8 place-items-center rounded-full bg-brand-magenta/10 text-[13px] font-bold text-brand-magenta ring-1 ring-border-subtle"
              aria-hidden="true"
            >
              {initialOf(name, "S")}
            </span>
          </span>
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-5 pt-20 pb-28">
        <section
          className="my-auto flex w-full flex-col items-center"
          aria-labelledby="judul-sukses"
        >
          <p className="relative my-6 flex items-center justify-center m-0">
            <span
              className="pointer-events-none absolute size-24 animate-ping rounded-full bg-brand-magenta/10 opacity-60"
              aria-hidden="true"
            />
            <span
              className="grid size-20 place-items-center rounded-full bg-brand-magenta text-white shadow-lg shadow-brand-magenta/20"
              aria-hidden="true"
            >
              <MaterialIcon name="check" className="text-[42px]" fill />
            </span>
          </p>
          <header className="space-y-1 text-center">
            <h1
              id="judul-sukses"
              className="text-[24px] font-bold tracking-tight text-on-surface"
            >
              Pengiriman Berhasil
            </h1>
            <p className="text-[13px] font-medium tracking-wide text-on-surface-variant">
              Tercatat resmi dalam sistem audit kriptografis
            </p>
          </header>

          <article className="mt-7 w-full space-y-3.5 rounded-2xl border border-border-subtle bg-surface-card p-4 text-left shadow-card">
            <header className="flex items-center justify-between border-b border-border-subtle pb-3">
              <p className="m-0 flex items-center gap-1.5 text-on-surface-variant">
                <MaterialIcon name="inventory_2" className="text-[17px]" />
                <span className="text-[12px] font-medium tracking-wide">
                  Nomor Resi
                </span>
              </p>
              <p className="tabular-nums m-0 rounded-md bg-surface-container-low px-2 py-0.5 text-[13px] font-bold tracking-tight text-on-surface">
                {TRACKING}
              </p>
            </header>
            <section className="flex items-start gap-3 pt-0.5">
              <span
                className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface-container text-brand-magenta"
                aria-hidden="true"
              >
                <MaterialIcon
                  name="person_pin_circle"
                  className="text-[18px]"
                />
              </span>
              <section className="min-w-0 flex-1">
                <header className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-[14px] font-semibold text-on-surface">
                    Bpk. Bambang Wijaya
                  </h2>
                  <p className="m-0 flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-tertiary">
                    <MaterialIcon
                      name="check_circle"
                      className="text-[13px]"
                      fill
                    />{" "}
                    Diterima
                  </p>
                </header>
                <p className="mt-0.5 text-[12px] leading-relaxed text-on-surface-variant">
                  Jl. Senopati No. 42, Kebayoran Baru
                </p>
              </section>
            </section>
          </article>

          <details
            className="group mt-3 w-full overflow-hidden rounded-xl border border-border-subtle/70 bg-surface-card/70 text-left"
            id="audit-details"
          >
            <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-2.5 text-[12px] font-medium text-on-surface-variant hover:text-on-surface">
              <span className="flex items-center gap-1.5">
                <MaterialIcon
                  name="verified_user"
                  className="text-[16px] text-brand-magenta"
                />{" "}
                Lihat Detail Integritas
              </span>
              <MaterialIcon
                name="expand_more"
                className="text-[18px] transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <dl className="m-0 space-y-2 border-t border-border-subtle/60 bg-surface-container-lowest/50 px-4 pb-3 pt-1 tabular-nums text-[11px]">
              <dt className="text-on-surface-variant">Radius Geofence</dt>
              <dd className="m-0 font-bold text-tertiary">
                28 m (Batas 30 m) &bull; Valid
              </dd>
              <dt className="text-on-surface-variant">Verifikasi PIN</dt>
              <dd className="m-0 font-semibold text-on-surface">
                Tervalidasi Penerima
              </dd>
              <dt className="text-on-surface-variant">Stempel Waktu NTP</dt>
              <dd className="m-0 font-semibold text-on-surface">
                <time dateTime={stamp.toISOString()}>{formatStamp(stamp)}</time>
              </dd>
              <dt className="text-on-surface-variant">Kode Hash Audit</dt>
              <dd className="m-0 font-semibold text-brand-magenta">{hash}</dd>
            </dl>
          </details>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-[12px] text-on-surface-variant">
            <MaterialIcon
              name="task_alt"
              className="text-[15px] text-tertiary"
            />
            <span>
              <strong className="font-semibold text-on-surface">
                <span>{done}</span> dari <span>12</span>
              </strong>{" "}
              tugas selesai hari ini{" "}
              <span className="mx-1 text-on-surface-variant/40">&bull;</span>{" "}
              <span className="font-semibold text-tertiary">
                100% tepat waktu
              </span>
            </span>
          </p>
        </section>

        <footer className="w-full pt-4">
          <Link
            className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-magenta text-[15px] font-semibold text-white shadow-md shadow-brand-magenta/25 transition-all hover:bg-brand-magenta/90 active:scale-[0.98]"
            to="/courier/tugas"
          >
            <span>Lanjut ke Tugas Berikutnya</span>
            <MaterialIcon name="arrow_forward" className="text-[19px]" />
          </Link>
        </footer>
      </main>

      <CourierBottomNav variant="sukses" activeLabel="Riwayat" />
    </div>
  );
}
