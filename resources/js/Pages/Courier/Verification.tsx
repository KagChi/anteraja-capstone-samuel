import { router } from "@inertiajs/react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { GeofenceMap } from "../../Components/courier/GeofenceMap";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { FilterTab, FilterTabs } from "../../Components/ui/FilterBar";
import { Spinner } from "../../Components/ui/Spinner";
import { useShipmentContext } from "../../Contexts/ShipmentContext";
import { useToast } from "../../Contexts/ToastContext";
import { useActiveTracking } from "../../Hooks/useActiveTracking";
import { useFetch } from "../../Hooks/useFetch";
import { useGeolocation } from "../../Hooks/useGeolocation";
import { usePostalSearch } from "../../Hooks/usePostalSearch";
import { useSeo } from "../../Hooks/useSeo";
import { sendJson } from "../../lib/api";
import { clamp } from "../../lib/format";
import { formatMeters, haversineMeters } from "../../lib/geo";
import { districtFromAddress } from "../../lib/postal";
import type { DeliveryTask, PinIssue, PinVerifyResult } from "../../types";

const PIN_KEYS = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;

type PinStatus = "idle" | "error" | "ok";

const RELATIONS = [
  { id: "langsung", label: "Langsung" },
  { id: "keluarga", label: "Keluarga" },
  { id: "satpam", label: "Satpam" },
];

export function VerificationPage() {
  useSeo("/courier/verifikasi");
  const toast = useToast();
  const { relation, setRelation, setPinVerified } = useShipmentContext();
  const activeTracking = useActiveTracking();

  // Without a shipment in the URL there is nothing to verify.
  useEffect(() => {
    if (!activeTracking) {
      router.visit("/courier/tugas");
    }
  }, [activeTracking]);

  const taskResource = useFetch<{ data: DeliveryTask }>(
    activeTracking ? `/api/v1/courier/tasks/${activeTracking}` : null,
  );
  const task = taskResource.data?.data;
  const geofence = task?.geofence;
  const tracking = task?.tracking ?? activeTracking ?? "";
  const recipient = task?.recipient ?? "Penerima";
  const postal = usePostalSearch(districtFromAddress(task?.address));

  // Live GPS: the device fix drives the distance readout and is the exact
  // coordinate pair later submitted with the POD (the server re-verifies it).
  const geo = useGeolocation(true);
  const destination = task?.destination;
  const radius = geofence?.radiusMeters ?? null;
  const liveDistance =
    geo.latitude !== null && geo.longitude !== null && destination
      ? haversineMeters(
          geo.latitude,
          geo.longitude,
          destination.latitude,
          destination.longitude,
        )
      : null;
  const gpsReady = geo.status === "ready" && liveDistance !== null;
  const inside =
    liveDistance !== null && radius !== null ? liveDistance <= radius : null;

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const resetToken = useRef(0);
  const resendTimer = useRef<number | null>(null);

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [statuses, setStatuses] = useState<PinStatus[]>(Array(6).fill("idle"));
  const [attempts, setAttempts] = useState(1);
  const [locked, setLocked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [shake, setShake] = useState(false);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [nextBusy, setNextBusy] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);

  const code = digits.join("");
  const ready =
    code.length === 6 && verified && !locked && !verifying && gpsReady;

  const gateMessage = !gpsReady
    ? (geo.error ?? "Menunggu sinyal GPS…")
    : inside === false
      ? "Posisi " +
        formatMeters(liveDistance ?? 0) +
        " dari tujuan (radius " +
        (radius ?? "?") +
        " m). Serah terima di luar radius butuh persetujuan Admin."
      : null;

  useEffect(() => {
    return () => {
      if (resendTimer.current) window.clearInterval(resendTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!task) return;
    let active = true;

    sendJson<{ data: PinIssue }>(
      "POST",
      `/api/v1/courier/tasks/${tracking}/pin`,
    )
      .then((response) => {
        if (active) {
          setPinCode(response.data.debug_code ?? null);
          setMaxAttempts(response.data.max_attempts);
        }
      })
      .catch(() => {
        if (active) setPinCode(null);
      });

    return () => {
      active = false;
    };
  }, [task, tracking]);

  function focusIndex(index: number) {
    inputsRef.current[clamp(index, 0, 5)]?.focus();
  }

  async function evaluate(next: string[]) {
    if (locked || verifying) return;
    const value = next.join("");
    if (value.length !== 6) {
      setVerified(false);
      setStatuses(Array(6).fill("idle"));
      return;
    }

    setVerifying(true);
    try {
      const response = await sendJson<{ data: PinVerifyResult }>(
        "POST",
        `/api/v1/courier/tasks/${tracking}/pin/verify`,
        { code: value },
      );

      if (response.data.verified) {
        setVerified(true);
        resetToken.current += 1;
        setStatuses(Array(6).fill("ok"));
        setPinVerified(true);
        toast("PIN terverifikasi.");
        return;
      }

      const lockedNow = response.data.status === "locked";
      setVerified(false);
      setLocked(lockedNow);
      setAttempts(response.data.attempts);
      setMaxAttempts(response.data.max_attempts);
      setPinVerified(false);
      failPin(lockedNow, response.data.max_attempts);
    } catch (error) {
      setVerified(false);
      toast(
        error instanceof Error ? error.message : "Verifikasi PIN gagal.",
        "error",
      );
    } finally {
      setVerifying(false);
    }
  }

  function failPin(lockedNow: boolean, limit: number) {
    setStatuses(Array(6).fill("error"));
    setShake(false);
    window.setTimeout(() => setShake(true), 0);
    window.setTimeout(() => setShake(false), 360);

    if (lockedNow) {
      toast(
        `PIN salah ${limit} kali. Hubungi Admin untuk membuka akses.`,
        "error",
      );
      return;
    }
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
    window.setTimeout(
      () => router.visit(`/courier/bukti-foto?tracking=${tracking}`),
      900,
    );
  }

  function resendPin() {
    if (resendSeconds > 0) return;

    sendJson<{ data: PinIssue }>(
      "POST",
      `/api/v1/courier/tasks/${tracking}/pin`,
    )
      .then((response) => {
        setPinCode(response.data.debug_code ?? null);
        toast(
          response.data.debug_code
            ? `PIN baru dikirim ke penerima: ${response.data.debug_code}`
            : "PIN baru dikirim ke penerima.",
        );
      })
      .catch((error: unknown) => {
        toast(
          error instanceof Error ? error.message : "Gagal mengirim ulang PIN.",
          "error",
        );
      });

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
    setRelation(id);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-container-low font-sans text-on-surface antialiased">
      <header className="fixed inset-x-0 top-0 z-40 bg-surface-container-low/90 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between px-3">
          <Button
            as="link"
            to="/courier/tugas"
            variant="icon"
            size="lg"
            shape="pill"
            className="-ml-1"
            aria-label="Kembali ke daftar tugas"
          >
            <MaterialIcon name="arrow_back_ios_new" className="text-[24px]" />
          </Button>
          <h1 className="text-title-lg tracking-tight text-on-surface">
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
              {tracking}
            </span>
          </p>
          <h2 id="judul-geofence" className="sr-only">
            Status geofence
          </h2>
          <p className="mb-2 flex items-baseline justify-center font-extrabold leading-none tracking-tight text-on-surface m-0">
            <span className="tabular-nums text-[52px]">
              {liveDistance ?? "—"}
            </span>
            <span className="ml-1 text-[26px] font-bold text-on-surface-variant">
              m
            </span>
          </p>
          <p
            className={
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold m-0 " +
              (geo.status === "error"
                ? "bg-red-50 text-red-700"
                : !gpsReady
                  ? "bg-amber-50 text-amber-700"
                  : inside
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700")
            }
            id="geofence-status"
          >
            {gpsReady ? (
              <span
                className={
                  "size-2 rounded-full " +
                  (inside ? "bg-emerald-500" : "bg-amber-500")
                }
                aria-hidden="true"
              />
            ) : (
              <Spinner />
            )}
            {geo.status === "error"
              ? "GPS tidak aktif"
              : !gpsReady
                ? "Mencari sinyal GPS…"
                : radius === null
                  ? "Radius belum tersedia"
                  : inside
                    ? "Di dalam radius (Aman)"
                    : "Di luar radius"}
          </p>
          {geo.status === "error" ? (
            <p className="mt-2 m-0 max-w-sm text-[12px] font-medium text-error">
              {geo.error}
            </p>
          ) : null}
        </section>

        <section
          className="mb-4 rounded-md border border-border-subtle bg-surface-card p-4 shadow-card"
          aria-labelledby="judul-ringkasan-lokasi"
        >
          <h3
            id="judul-ringkasan-lokasi"
            className="mb-3 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Ringkasan Lokasi
          </h3>
          <dl className="m-0 grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Jarak kurir (GPS)
              </dt>
              <dd className="tabular-nums ml-0 mt-0.5 font-semibold text-on-surface">
                {liveDistance !== null ? formatMeters(liveDistance) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Radius
              </dt>
              <dd className="tabular-nums ml-0 mt-0.5 font-semibold text-on-surface">
                {radius !== null ? `${radius} m` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Akurasi GPS
              </dt>
              <dd className="tabular-nums ml-0 mt-0.5 font-semibold text-on-surface">
                {geo.accuracy !== null ? `± ${geo.accuracy} m` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Tujuan &rarr; Pembeli
              </dt>
              <dd className="tabular-nums ml-0 mt-0.5 font-semibold text-on-surface">
                {geofence?.deviationMeters ?? "—"} m
              </dd>
            </div>
          </dl>
          <figure
            className="relative m-0 mt-4 h-48 overflow-hidden rounded-xl border border-border-subtle bg-surface-container"
            id="geofence-map"
          >
            {destination && radius !== null ? (
              <GeofenceMap
                target={[destination.latitude, destination.longitude]}
                courier={
                  geo.latitude !== null && geo.longitude !== null
                    ? [geo.latitude, geo.longitude]
                    : null
                }
                radiusMeters={radius}
                distanceMeters={liveDistance}
              />
            ) : null}
            <figcaption className="pointer-events-none absolute inset-x-2 bottom-2 z-[800] flex items-center justify-between gap-2 text-[10px] font-semibold">
              <span className="rounded bg-black/70 px-2 py-0.5 text-white">
                Radius {radius} m
              </span>
              <span
                className={
                  "rounded px-2 py-0.5 text-white " +
                  (inside === false
                    ? "bg-red-600/80"
                    : inside
                      ? "bg-emerald-600/80"
                      : "bg-black/70")
                }
              >
                {inside === null
                  ? "Menunggu GPS"
                  : inside
                    ? "Di dalam radius"
                    : "Di luar radius"}
              </span>
            </figcaption>
          </figure>
          <p className="m-0 mt-3 flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3 text-[12px] text-on-surface-variant">
            <MaterialIcon
              name="markunread_mailbox"
              className="text-[16px] text-brand-magenta"
            />{" "}
            Kode Pos Tujuan:{" "}
            {postal.isLoading ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-on-surface-variant/70">
                <Spinner /> Mencari...
              </span>
            ) : postal.isError ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-error">
                Gagal memuat.
                <Button
                  variant="text"
                  className="text-[12px]"
                  onClick={postal.reload}
                >
                  Coba lagi
                </Button>
              </span>
            ) : postal.data?.[0] ? (
              <strong className="tabular-nums font-semibold text-on-surface">
                {postal.data[0].code} &bull; {postal.data[0].district}
              </strong>
            ) : (
              <span className="font-medium text-on-surface-variant/70">
                Tidak ditemukan
              </span>
            )}
          </p>
        </section>

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
          <fieldset className="rounded-md border border-border-subtle bg-surface-card p-4 shadow-card">
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
                Percobaan {attempts} dari {maxAttempts ?? "—"}
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
                  {pinCode ?? "••••••"}
                </strong>{" "}
                &bull; berlaku 15 menit sejak dikirim.
              </p>
              <Button
                variant="text"
                className="text-[12px]"
                id="btn-resend-pin"
                disabled={resendSeconds > 0}
                onClick={resendPin}
              >
                {resendSeconds > 0
                  ? `Kirim ulang (${resendSeconds}s)`
                  : "Kirim ulang PIN"}
              </Button>
            </footer>
          </fieldset>

          <fieldset className="rounded-md border border-border-subtle bg-surface-card p-4 shadow-card">
            <legend className="sr-only">Konfirmasi serah terima</legend>
            <h3 className="mb-3 text-[14px] font-bold text-on-surface">
              Konfirmasi Serah Terima
            </h3>
            <p className="mb-3 flex items-center gap-2 m-0">
              <span
                className="grid size-8 place-items-center rounded-full bg-brand-magenta/10 text-[12px] font-bold text-brand-magenta"
                aria-hidden="true"
              >
                {recipient.charAt(0)}
              </span>
              <span className="block">
                <span className="block text-[14px] font-semibold leading-tight text-on-surface">
                  {recipient}
                </span>
                <span className="block text-[12px] text-on-surface-variant">
                  Penerima terdaftar
                </span>
              </span>
            </p>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Hubungan penerima
            </p>
            <FilterTabs id="relation-tabs" label="Hubungan penerima" fill>
              {RELATIONS.map((item) => (
                <FilterTab
                  key={item.id}
                  active={relation === item.id}
                  grow
                  data-relation={item.id}
                  onClick={() => chooseRelation(item.id)}
                >
                  {item.label}
                </FilterTab>
              ))}
            </FilterTabs>
          </fieldset>
        </form>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-surface-container-low/95 pb-safe backdrop-blur-xl">
        <section className="mx-auto max-w-md px-4 py-3">
          <Button
            as="link"
            to={`/courier/bukti-foto?tracking=${tracking}`}
            variant="primary"
            size="xl"
            id="btn-next-step"
            className="w-full shadow-lg shadow-brand-magenta/25"
            busy={nextBusy}
            busyText="Memverifikasi..."
            disabled={!ready}
            onClick={(event) => {
              event.preventDefault();
              goNext();
            }}
          >
            Lanjut Ambil Bukti Foto{" "}
            <MaterialIcon name="arrow_forward" className="text-[19px]" />
          </Button>
          <p
            className="mt-2 text-center text-[11px] text-on-surface-variant/70"
            id="lock-reason"
          >
            {gateMessage}
          </p>
          {geo.status === "error" ? (
            <Button
              variant="text"
              className="mx-auto mt-1 text-[12px]"
              id="btn-retry-gps"
              onClick={geo.retry}
            >
              Coba lagi deteksi GPS
            </Button>
          ) : null}
        </section>
      </footer>
    </div>
  );
}

export default VerificationPage;
