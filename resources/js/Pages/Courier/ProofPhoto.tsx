import { router } from "@inertiajs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingButton } from "../../Components/LoadingAction";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { Spinner } from "../../Components/ui/Spinner";
import { useShipmentContext } from "../../Contexts/ShipmentContext";
import { useToast } from "../../Contexts/ToastContext";
import { useActiveTracking } from "../../Hooks/useActiveTracking";
import { useFetch } from "../../Hooks/useFetch";
import { useGeolocation } from "../../Hooks/useGeolocation";
import { useSeo } from "../../Hooks/useSeo";
import { sendForm, sendJson } from "../../lib/api";
import { formatClock } from "../../lib/format";
import { formatMeters, haversineMeters } from "../../lib/geo";
import type {
  DeliveryCompletionResult,
  DeliveryProofResult,
  DeliveryTask,
} from "../../types";

type CameraState = "starting" | "live" | "error";

const RELATION_LABELS: Record<string, string> = {
  langsung: "Penerima Langsung",
  keluarga: "Keluarga Penerima",
  satpam: "Satpam / Keamanan",
};

interface Capture {
  blob: Blob;
  url: string;
  capturedAt: string;
}

/**
 * FRD-02 capture step: the courier's live GPS fix and a photo taken from the
 * in-app camera (there is no gallery path). Both travel to the server, which
 * is the source of truth for the watermark, distance and review status.
 */
export function ProofPhotoPage() {
  useSeo("/courier/bukti-foto");
  const toast = useToast();
  const { relation, setProof, setCompletion } = useShipmentContext();
  const activeTracking = useActiveTracking();
  const geo = useGeolocation(true);

  // Without a shipment in the URL there is nothing to capture.
  useEffect(() => {
    if (!activeTracking) {
      router.visit("/courier/tugas");
    }
  }, [activeTracking]);

  const [clock, setClock] = useState(() => formatClock());
  const [flash, setFlash] = useState(false);
  const [camera, setCamera] = useState<CameraState>("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [_cameraToken, setCameraToken] = useState(0);
  const [capture, setCapture] = useState<Capture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const taskResource = useFetch<{ data: DeliveryTask }>(
    activeTracking ? `/api/v1/courier/tasks/${activeTracking}` : null,
  );
  const task = taskResource.data?.data;
  const tracking = task?.tracking ?? activeTracking ?? "";
  const recipient = task?.recipient ?? "Penerima";
  const destination = task?.destination;

  const distance =
    geo.latitude !== null && geo.longitude !== null && destination
      ? haversineMeters(
          geo.latitude,
          geo.longitude,
          destination.latitude,
          destination.longitude,
        )
      : null;

  const gpsReady = geo.status === "ready" && distance !== null;
  const gpsLabel =
    geo.status === "error"
      ? (geo.error ?? "Sinyal GPS tidak tersedia.")
      : gpsReady
        ? formatMeters(distance) +
          " ke tujuan • akurasi ±" +
          (geo.accuracy ?? "?") +
          " m"
        : "Mencari sinyal GPS…";

  const triggerFlash = useCallback(() => {
    setFlash(false);
    window.setTimeout(() => setFlash(true), 0);
    window.setTimeout(() => setFlash(false), 460);
  }, []);

  // In-app camera only: the stream is rendered into the viewfinder and the
  // frame is grabbed from the video element, never from a file picker.
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | null = null;

    async function start() {
      setCamera("starting");
      setCameraError(null);

      const media = navigator.mediaDevices;

      if (!media?.getUserMedia) {
        setCamera("error");
        setCameraError("Kamera dalam aplikasi tidak tersedia di peramban ini.");
        return;
      }

      try {
        stream = await media.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });

        if (disposed) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }

        const video = videoRef.current;

        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }

        setCamera("live");
      } catch {
        if (!disposed) {
          setCamera("error");
          setCameraError(
            "Tidak dapat mengakses kamera. Periksa izin kamera lalu coba lagi.",
          );
        }
      }
    }

    start();

    return () => {
      disposed = true;

      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;

    if (!video || camera !== "live" || video.videoWidth === 0) {
      triggerFlash();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        setCapture((current) => {
          if (current) URL.revokeObjectURL(current.url);

          return {
            blob,
            url: URL.createObjectURL(blob),
            capturedAt: new Date().toISOString(),
          };
        });
        triggerFlash();
      },
      "image/jpeg",
      0.9,
    );
  }, [camera, triggerFlash]);

  function retakePhoto() {
    setCapture((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    toast("Foto diambil ulang. Arahkan kamera kembali.");
  }

  async function confirmDelivery() {
    if (!task) return;

    if (!capture) {
      toast("Ambil foto bukti terlebih dahulu.", "error");
      return;
    }

    if (geo.latitude === null || geo.longitude === null) {
      toast("Menunggu sinyal GPS. Pastikan izin lokasi aktif.", "error");
      return;
    }

    const coordinates = {
      latitude: geo.latitude,
      longitude: geo.longitude,
    };

    try {
      const form = new FormData();
      form.append("latitude", String(coordinates.latitude));
      form.append("longitude", String(coordinates.longitude));
      form.append("recipient_name", task.recipient || "Penerima");
      form.append("relation", relation);
      form.append("device_captured_at", capture.capturedAt);
      form.append(
        "photo",
        capture.blob,
        `pod-${task.tracking}-${Date.now()}.jpg`,
      );

      const proofResponse = await sendForm<{ data: DeliveryProofResult }>(
        "POST",
        `/api/v1/courier/tasks/${task.tracking}/proof`,
        form,
      );
      setProof(proofResponse.data);

      const completion = await sendJson<{ data: DeliveryCompletionResult }>(
        "POST",
        `/api/v1/courier/tasks/${task.tracking}/complete`,
        coordinates,
      );
      setCompletion(completion.data);

      router.visit(`/courier/sukses?tracking=${tracking}`);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Gagal menyelesaikan pengiriman.",
        "error",
      );
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black font-sans text-white antialiased">
      <header className="z-30 w-full shrink-0 px-4 pt-safe">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between">
          <Button
            as="link"
            to={`/courier/verifikasi?tracking=${tracking}`}
            variant="iconInverse"
            size="lg"
            shape="pill"
            className="backdrop-blur-md"
            aria-label="Kembali ke verifikasi"
          >
            <MaterialIcon name="arrow_back_ios_new" className="text-[20px]" />
          </Button>
          <h1 className="text-title-md tracking-tight text-white">
            Bukti Foto
          </h1>
          <span className="size-9" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between overflow-hidden px-4 pt-2 pb-safe">
        <figure
          className={
            "pod-viewfinder relative grid min-h-[320px] flex-1 place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 shadow-2xl m-0 " +
            (flash ? "animate-viewfinder" : "")
          }
          id="pod-viewfinder"
          onClick={() => (capture ? triggerFlash() : takePhoto())}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              if (capture) {
                triggerFlash();
              } else {
                takePhoto();
              }
            }
          }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            autoPlay
            playsInline
            muted
            aria-label="Pratinjau kamera dalam aplikasi"
          />
          {capture ? (
            <img
              src={capture.url}
              alt="Pratinjau bukti foto serah terima"
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          {camera === "starting" ? (
            <span className="absolute inset-0 grid place-items-center bg-black/40">
              <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[12px] font-medium text-white/85">
                <Spinner /> Menyalakan kamera...
              </span>
            </span>
          ) : null}
          {camera === "error" ? (
            <span className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 rounded-xl bg-black/70 px-4 py-3 text-center text-[12px] font-medium text-white/85">
              <MaterialIcon name="no_photography" className="text-[28px]" />
              {cameraError}
              <Button
                variant="textInverse"
                onClick={() => {
                  setCapture(null);
                  setCameraToken((value) => value + 1);
                }}
              >
                Coba lagi
              </Button>
            </span>
          ) : null}
          <mark className="absolute left-3 top-3 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md">
            Kamera dalam aplikasi
          </mark>
          <span
            className="pointer-events-none absolute inset-x-4 top-1/2 h-24 -translate-y-1/2 rounded-2xl border border-dashed border-brand-magenta/50"
            aria-hidden="true"
          />
          <figcaption className="absolute inset-x-3 bottom-3">
            <span
              className={
                "tabular-nums mx-auto flex w-fit items-center rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium tracking-wide text-white/85 backdrop-blur-md " +
                (flash ? "animate-viewfinder" : "")
              }
              id="pod-watermark"
            >
              {clock} WIB &bull;{" "}
              {geo.latitude !== null && geo.longitude !== null
                ? `${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}`
                : "Menunggu GPS"}
            </span>
          </figcaption>
        </figure>

        <section
          className="shrink-0 space-y-3 pt-4 pb-2"
          aria-labelledby="judul-penerima-pod"
        >
          <p
            className={
              "m-0 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold " +
              (geo.status === "error"
                ? "bg-red-500/15 text-red-300"
                : gpsReady
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/10 text-white/70")
            }
            id="pod-gps-status"
          >
            <MaterialIcon
              name={gpsReady ? "my_location" : "location_searching"}
              className="text-[15px]"
            />
            {gpsLabel}
          </p>
          <header className="space-y-1 py-1 text-center">
            <h2
              id="judul-penerima-pod"
              className="text-[14px] font-semibold tracking-tight text-white"
            >
              {recipient}
            </h2>
            <p className="text-[12px] text-white/50">
              {RELATION_LABELS[relation] ?? "Penerima"}
            </p>
          </header>
          <p className="m-0 flex flex-col items-center gap-3 pt-1">
            {capture ? (
              <LoadingButton
                variant="primary"
                size="lg"
                className="w-full"
                id="btn-confirm-pod"
                delay={200}
                busyText="Mengunggah bukti..."
                disabled={!task || !gpsReady}
                onAction={confirmDelivery}
              >
                <MaterialIcon name="check_circle" className="text-[20px]" />{" "}
                Konfirmasi &amp; Selesaikan
              </LoadingButton>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                id="btn-capture-photo"
                disabled={camera !== "live"}
                onClick={takePhoto}
              >
                <MaterialIcon name="photo_camera" className="text-[20px]" />{" "}
                Ambil Foto Bukti
              </Button>
            )}
            {capture ? (
              <Button
                variant="textInverse"
                className="py-1 text-[13px]"
                id="btn-retake-photo"
                onClick={retakePhoto}
              >
                <MaterialIcon name="replay" className="text-[18px]" /> Ambil
                Ulang Foto
              </Button>
            ) : null}
          </p>
        </section>
      </main>
    </div>
  );
}

export default ProofPhotoPage;
