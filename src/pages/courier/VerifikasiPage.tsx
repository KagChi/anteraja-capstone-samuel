import type { ClipboardEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Spinner } from "../../components/LoadingAction";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useToast } from "../../context/ToastContext";
import { useSeo } from "../../hooks/useSeo";
import { clamp } from "../../lib/format";
import { getRelation, setRelation } from "../../lib/storage";

const DEMO_PIN = "123456";
const PIN_KEYS = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;
const MAX_ATTEMPTS = 3;
const TRACKING = "ANT-INST-882910394";

type PinStatus = "idle" | "error" | "ok";

const RELATIONS = [
  { id: "langsung", label: "Langsung" },
  { id: "keluarga", label: "Keluarga" },
  { id: "satpam", label: "Satpam" },
];

export function VerifikasiPage() {
  useSeo("/courier/verifikasi");
  const toast = useToast();
  const navigate = useNavigate();

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const resetToken = useRef(0);
  const resendTimer = useRef<number | null>(null);

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [statuses, setStatuses] = useState<PinStatus[]>(Array(6).fill("idle"));
  const [attempts, setAttempts] = useState(1);
  const [locked, setLocked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [shake, setShake] = useState(false);
  const [relation, setRelationState] = useState(
    () => getRelation() ?? "langsung",
  );
  const [resendSeconds, setResendSeconds] = useState(0);
  const [nextBusy, setNextBusy] = useState(false);

  const code = digits.join("");
  const ready = code.length === 6 && verified && !locked;

  useEffect(() => {
    return () => {
      if (resendTimer.current) window.clearInterval(resendTimer.current);
    };
  }, []);

  function focusIndex(index: number) {
    inputsRef.current[clamp(index, 0, 5)]?.focus();
  }

  function evaluate(next: string[]) {
    if (locked) return;
    const value = next.join("");
    if (value.length !== 6) {
      setVerified(false);
      setStatuses(Array(6).fill("idle"));
      return;
    }
    if (value === DEMO_PIN) {
      setVerified(true);
      resetToken.current += 1;
      setStatuses(Array(6).fill("ok"));
      toast("PIN terverifikasi.");
      return;
    }
    setVerified(false);
    failPin();
  }

  function failPin() {
    setStatuses(Array(6).fill("error"));
    setShake(false);
    window.setTimeout(() => setShake(true), 0);
    window.setTimeout(() => setShake(false), 360);

    if (attempts >= MAX_ATTEMPTS) {
      setLocked(true);
      toast(
        `PIN salah ${MAX_ATTEMPTS} kali. Hubungi Admin untuk membuka akses.`,
        "error",
      );
      return;
    }
    setAttempts(attempts + 1);
    toast("PIN salah. Coba lagi.", "error");

    resetToken.current += 1;
    const token = resetToken.current;
    window.setTimeout(() => {
      if (token !== resetToken.current || verified) return;
      setStatuses(Array(6).fill("idle"));
      setDigits(Array(6).fill(""));
      focusIndex(0);
    }, 500);
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) focusIndex(index + 1);
    evaluate(next);
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      focusIndex(index - 1);
      evaluate(next);
    } else if (event.key === "ArrowLeft" && index > 0) {
      focusIndex(index - 1);
    } else if (event.key === "ArrowRight" && index < 5) {
      focusIndex(index + 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      goNext();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const text = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!text) return;
    const next = Array(6)
      .fill("")
      .map((_, index) => text[index] ?? "");
    setDigits(next);
    focusIndex(text.length - 1);
    evaluate(next);
  }

  function goNext() {
    if (locked) return;
    if (code.length < 6) {
      toast("Lengkapi 6 digit PIN terlebih dahulu.", "error");
      const empty = digits.findIndex((digit) => !digit);
      focusIndex(empty === -1 ? 0 : empty);
      return;
    }
    if (!verified) {
      toast("PIN belum terverifikasi.", "error");
      return;
    }
    if (nextBusy) return;
    setNextBusy(true);
    window.setTimeout(() => navigate("/courier/bukti-foto"), 900);
  }

  function resendPin() {
    if (resendSeconds > 0) return;
    toast(`PIN baru dikirim ke penerima: ${DEMO_PIN}`);
    let seconds = 30;
    setResendSeconds(seconds);
    resendTimer.current = window.setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        if (resendTimer.current) window.clearInterval(resendTimer.current);
        setResendSeconds(0);
        return;
      }
      setResendSeconds(seconds);
    }, 1000);
  }

  function chooseRelation(id: string) {
    setRelationState(id);
    setRelation(id);
  }

  const nextDisabled = !ready || nextBusy;
  const nextClass = nextDisabled ? "pointer-events-none opacity-50" : "";

  return (
    <div className="flex min-h-screen flex-col bg-surface-container-low font-sans text-on-surface antialiased">
      <header className="fixed inset-x-0 top-0 z-40 bg-surface-container-low/90 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between px-3">
          <Link
            className="-ml-1 grid size-9 place-items-center rounded-full text-on-surface transition-colors hover:bg-black/5"
            to="/courier/tugas"
            aria-label="Kembali ke daftar tugas"
          >
            <MaterialIcon name="arrow_back_ios_new" className="text-[24px]" />
          </Link>
          <h1 className="text-[17px] font-semibold tracking-tight text-on-surface">
            Verifikasi Pengiriman
          </h1>
          <span className="w-9 text-right text-[12px] font-semibold text-on-surface-variant">
            2/3
          </span>
        </div>
        <p
          className="relative m-0 h-[2px] w-full overflow-hidden bg-black/5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={66}
          aria-label="Progres verifikasi"
        >
          <span className="absolute inset-y-0 left-0 w-[66%] rounded-r-full bg-brand-magenta" />
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(8rem+env(safe-area-inset-bottom,16px))]">
        <section
          className="flex flex-col items-center pt-5 pb-6 text-center"
          aria-labelledby="judul-geofence"
        >
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-black/[0.03] px-3 py-1 text-[12px] font-semibold text-on-surface-variant m-0">
            <span className="tabular-nums text-[11px] tracking-wider text-on-surface-variant/70">
              {TRACKING}
            </span>
          </p>
          <h2 id="judul-geofence" className="sr-only">
            Status geofence
          </h2>
          <p className="mb-2 flex items-baseline justify-center font-extrabold leading-none tracking-tight text-on-surface m-0">
            <span className="text-[52px]">28</span>
            <span className="ml-1 text-[26px] font-bold text-on-surface-variant">
              m
            </span>
          </p>
          <p
            className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-semibold text-emerald-700 m-0"
            id="geofence-status"
          >
            <span
              className="size-2 animate-pulse rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            Di dalam radius (Aman)
          </p>
          <p className="mt-2.5 text-[12px] text-on-surface-variant/70">
            Presisi GPS &plusmn;3 m &bull; Sinkronisasi PostGIS terverifikasi
          </p>
        </section>

        <section
          className="mb-4 rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-card"
          aria-labelledby="judul-radius"
        >
          <header className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h3
              id="judul-radius"
              className="text-[14px] font-bold text-on-surface"
            >
              Validasi Radius
            </h3>
            <mark className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Lulus
            </mark>
          </header>
          <dl className="m-0 grid grid-cols-2 gap-3 pt-3 text-[12px]">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Jarak kurir
            </dt>
            <dd className="ml-0 mt-0.5 font-semibold text-on-surface">28 m</dd>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Radius Instant
            </dt>
            <dd className="ml-0 mt-0.5 font-semibold text-on-surface">30 m</dd>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Titik tujuan
            </dt>
            <dd className="ml-0 mt-0.5 font-semibold text-on-surface">
              Jl. Senopati No. 42
            </dd>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Sumber keputusan
            </dt>
            <dd className="ml-0 mt-0.5 font-semibold text-on-surface">
              Server (ST_Distance)
            </dd>
          </dl>
        </section>

        <aside
          className="mb-4 rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-card"
          aria-labelledby="judul-titik-temu"
        >
          <h3
            id="judul-titik-temu"
            className="mb-2 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Konteks Titik Temu
          </h3>
          <ul className="m-0 flex list-none items-center justify-between p-0 text-[12px]">
            <li className="flex items-center gap-1.5 text-on-surface-variant">
              <MaterialIcon
                name="two_wheeler"
                className="text-[16px] text-brand-magenta"
              />{" "}
              Kurir &rarr; Tujuan{" "}
              <strong className="text-on-surface">28 m</strong>
            </li>
            <li className="flex items-center gap-1.5 text-on-surface-variant">
              <MaterialIcon
                name="person_pin_circle"
                className="text-[16px] text-on-surface-variant"
              />{" "}
              Tujuan &rarr; Pembeli{" "}
              <strong className="text-on-surface">12 m</strong>
            </li>
          </ul>
        </aside>

        <form
          id="pin-form"
          className="flex flex-col gap-4"
          autoComplete="off"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            goNext();
          }}
        >
          <fieldset className="rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-card">
            <legend className="sr-only">Otorisasi PIN penerima</legend>
            <header className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[14px] font-bold text-on-surface">
                <MaterialIcon
                  name="password"
                  className="text-[18px] text-brand-magenta"
                />{" "}
                PIN Otorisasi Penerima
              </h3>
              <mark
                className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant"
                id="pin-attempts"
              >
                Percobaan {attempts} dari {MAX_ATTEMPTS}
              </mark>
            </header>
            <p className="mb-3 text-[12px] text-on-surface-variant">
              Masukkan 6 digit PIN yang dikirim ke kontak penerima saat kurir
              tiba.
            </p>
            <fieldset
              className={`m-0 flex items-center justify-between gap-1.5 ${
                shake ? "animate-shake" : ""
              }`}
              id="pin-group"
              aria-label="6 digit PIN"
            >
              {PIN_KEYS.map((pinKey, index) => (
                <input
                  key={pinKey}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  className={`pin-digit h-12 w-11 rounded-xl border-[1.5px] border-border-subtle bg-surface-container-lowest text-center text-[20px] font-bold text-on-surface focus:border-brand-magenta focus:ring-0 ${
                    statuses[index] === "error"
                      ? "is-error"
                      : statuses[index] === "ok"
                        ? "is-ok"
                        : ""
                  }`}
                  id={`pin-${index + 1}`}
                  name="pin[]"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  autoComplete="one-time-code"
                  aria-label={`Digit PIN ${index + 1}`}
                  value={digits[index]}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                />
              ))}
            </fieldset>
            <footer className="mt-3 flex items-center justify-between">
              <p
                className="m-0 text-[12px] text-on-surface-variant"
                id="pin-hint"
              >
                PIN demo:{" "}
                <strong className="font-semibold text-brand-magenta">
                  {DEMO_PIN}
                </strong>{" "}
                &bull; berlaku 15 menit sejak dikirim.
              </p>
              <button
                className="text-[12px] font-semibold text-brand-magenta hover:opacity-80 disabled:opacity-60"
                id="btn-resend-pin"
                type="button"
                disabled={resendSeconds > 0}
                onClick={resendPin}
              >
                {resendSeconds > 0
                  ? `Kirim ulang (${resendSeconds}s)`
                  : "Kirim ulang PIN"}
              </button>
            </footer>
          </fieldset>

          <fieldset className="rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-card">
            <legend className="sr-only">Konfirmasi serah terima</legend>
            <h3 className="mb-3 text-[14px] font-bold text-on-surface">
              Konfirmasi Serah Terima
            </h3>
            <p className="mb-3 flex items-center gap-2 m-0">
              <span
                className="grid size-8 place-items-center rounded-full bg-brand-magenta/10 text-[12px] font-bold text-brand-magenta"
                aria-hidden="true"
              >
                B
              </span>
              <span className="block">
                <span className="block text-[14px] font-semibold leading-tight text-on-surface">
                  Bpk. Bambang Wijaya
                </span>
                <span className="block text-[12px] text-on-surface-variant">
                  Penerima terdaftar
                </span>
              </span>
            </p>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Hubungan penerima
            </p>
            <div
              className="flex items-center gap-1.5 rounded-xl bg-surface-container-low p-1"
              id="relation-tabs"
              role="tablist"
              aria-label="Hubungan penerima"
            >
              {RELATIONS.map((item) => {
                const isActive = relation === item.id;
                return (
                  <button
                    key={item.id}
                    className={`relation-tab flex-1 rounded-lg py-1.5 text-[12px] transition-all ${
                      isActive
                        ? "bg-surface-container-lowest font-semibold text-on-surface shadow-sm"
                        : "font-medium text-on-surface-variant"
                    }`}
                    data-relation={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => chooseRelation(item.id)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </form>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-surface-container-low/95 pb-safe backdrop-blur-xl">
        <section className="mx-auto max-w-md px-4 py-3">
          <a
            className={`btn-primary flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-magenta text-[15px] font-bold text-on-primary shadow-lg shadow-brand-magenta/25 transition-all hover:bg-brand-magenta/90 active:scale-[0.99] ${nextClass}`}
            id="btn-next-step"
            href="/courier/bukti-foto"
            aria-disabled={!ready}
            onClick={(event) => {
              event.preventDefault();
              goNext();
            }}
          >
            {nextBusy ? (
              <>
                <Spinner />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                Lanjut Ambil Bukti Foto{" "}
                <MaterialIcon name="arrow_forward" className="text-[19px]" />
              </>
            )}
          </a>
          <p
            className="mt-2 text-center text-[11px] text-on-surface-variant/70"
            id="lock-reason"
            hidden={!locked}
          >
            Tombol terkunci: posisi di luar radius. Ajukan pengecualian ke
            Admin.
          </p>
        </section>
      </footer>
    </div>
  );
}
