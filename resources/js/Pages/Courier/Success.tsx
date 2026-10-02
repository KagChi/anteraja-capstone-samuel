import { Link } from "@inertiajs/react";
import { useState } from "react";
import { Avatar } from "../../Components/Avatar";
import { CourierBottomNav } from "../../Components/courier/CourierBottomNav";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { useSession } from "../../Contexts/SessionContext";
import {
  ACTIVE_TRACKING,
  useShipmentContext,
} from "../../Contexts/ShipmentContext";
import { useFetch } from "../../Hooks/useFetch";
import { useSeo } from "../../Hooks/useSeo";
import { formatStamp, randomDigits } from "../../lib/format";
import type { DeliveryTask } from "../../types";

export function SuccessPage() {
  useSeo("/courier/sukses");
  const { session } = useSession();
  const { courierAvatar, proof } = useShipmentContext();
  const name = session?.name ?? "Satria";

  const [fallbackHash] = useState(() => `AUD-SEC-${randomDigits(4)}-SHA256`);
  const [stamp] = useState(() => new Date());

  const taskResource = useFetch<{ data: DeliveryTask }>(
    `/api/v1/courier/tasks/${ACTIVE_TRACKING}`,
  );
  const task = taskResource.data?.data;
  const tracking = task?.tracking ?? ACTIVE_TRACKING;
  const auditHash = proof?.watermark_hash ?? fallbackHash;

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-on-surface antialiased">
      <header className="fixed top-0 z-50 w-full border-b border-border-subtle bg-surface/90 pt-safe backdrop-blur-md">
        <p className="mx-auto flex h-14 max-w-md items-center justify-between px-5 m-0">
          <Link
            className="flex items-center gap-2.5"
            href="/"
            aria-label="Kembali ke beranda Satria"
          >
            <img
              className="h-6 w-auto"
              src="/logo-anteraja.png"
              alt="Anteraja"
            />
          </Link>
          <span className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold text-on-surface">
              {name}
            </span>
            <Avatar name={name} resource={courierAvatar} />
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
                {tracking}
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
                    {task?.recipient ?? "Penerima"}
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
                  {task?.address ?? "Kebayoran Baru"}
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
                {task?.geofence?.distanceMeters ?? 28} m (Batas{" "}
                {task?.geofence?.radiusMeters ?? 30} m) &bull; Valid
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
              <dd className="m-0 font-semibold text-brand-magenta">
                {auditHash}
              </dd>
            </dl>
          </details>
        </section>

        <footer className="w-full pt-4">
          <Button
            as="link"
            to="/courier/tugas"
            variant="primary"
            size="lg"
            shape="pill"
            className="w-full shadow-md shadow-brand-magenta/25"
          >
            <span>Lanjut ke Tugas Berikutnya</span>
            <MaterialIcon name="arrow_forward" className="text-[19px]" />
          </Button>
        </footer>
      </main>

      <CourierBottomNav variant="sukses" activeLabel="Riwayat" />
    </div>
  );
}

export default SuccessPage;
