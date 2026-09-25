import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingLink } from "../../components/LoadingAction";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useToast } from "../../context/ToastContext";
import { useSeo } from "../../hooks/useSeo";
import { formatClock } from "../../lib/format";

export function BuktiFotoPage() {
  useSeo("/courier/bukti-foto");
  const toast = useToast();
  const [clock, setClock] = useState(() => formatClock());
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function triggerFlash() {
    setFlash(false);
    window.setTimeout(() => setFlash(true), 0);
    window.setTimeout(() => setFlash(false), 460);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black font-sans text-white antialiased">
      <header className="z-30 w-full shrink-0 px-4 pt-safe">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between">
          <Link
            className="grid size-9 place-items-center rounded-full bg-white/10 text-white/90 backdrop-blur-md transition-all hover:bg-white/20"
            to="/courier/verifikasi"
            aria-label="Kembali ke verifikasi"
          >
            <MaterialIcon name="arrow_back_ios_new" className="text-[20px]" />
          </Link>
          <h1 className="text-[16px] font-semibold tracking-tight text-white">
            Bukti Foto
          </h1>
          <span className="size-9" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between overflow-hidden px-4 pt-2 pb-safe">
        <figure
          className={`pod-viewfinder relative grid min-h-[360px] flex-1 place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 shadow-2xl m-0 ${
            flash ? "animate-viewfinder" : ""
          }`}
          id="pod-viewfinder"
          onClick={triggerFlash}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") triggerFlash();
          }}
        >
          <MaterialIcon
            name="photo_camera"
            className="text-[64px] text-white/15"
          />
          <mark className="absolute left-3 top-3 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md">
            Kamera dalam aplikasi
          </mark>
          <span
            className="pointer-events-none absolute inset-x-4 top-1/2 h-24 -translate-y-1/2 rounded-2xl border border-dashed border-brand-magenta/50"
            aria-hidden="true"
          />
          <figcaption className="absolute inset-x-3 bottom-3">
            <span
              className={`mx-auto flex w-fit items-center rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium tracking-wide text-white/85 backdrop-blur-md ${
                flash ? "animate-viewfinder" : ""
              }`}
              id="pod-watermark"
            >
              {clock} WIB &bull; Senopati, Jaksel
            </span>
          </figcaption>
        </figure>

        <section
          className="shrink-0 space-y-4 pt-4 pb-2"
          aria-labelledby="judul-penerima-pod"
        >
          <header className="space-y-1 py-1 text-center">
            <h2
              id="judul-penerima-pod"
              className="text-[14px] font-semibold tracking-tight text-white"
            >
              Bpk. Bambang Wijaya
            </h2>
            <p className="text-[12px] text-white/50">
              Penerima Langsung &bull; Paket Sesuai
            </p>
          </header>
          <p className="m-0 flex flex-col items-center gap-3 pt-2">
            <LoadingLink
              className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-magenta text-[15px] font-bold text-white transition-all hover:bg-brand-magenta/90 active:scale-[0.98]"
              id="btn-confirm-pod"
              to="/courier/sukses"
              delay={1000}
              busyText="Mengunggah bukti..."
            >
              <MaterialIcon name="check_circle" className="text-[20px]" />{" "}
              Konfirmasi &amp; Selesaikan
            </LoadingLink>
            <button
              className="inline-flex items-center gap-1.5 py-1 text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
              id="btn-retake-photo"
              type="button"
              onClick={() => {
                triggerFlash();
                toast("Foto diambil ulang. Arahkan kamera kembali.");
              }}
            >
              <MaterialIcon name="replay" className="text-[18px]" /> Ambil Ulang
              Foto
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
