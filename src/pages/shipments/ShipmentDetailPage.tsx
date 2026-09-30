import { Link, useParams } from "react-router-dom";
import { ServiceTag, StatusPill } from "../../components/Badges";
import { MaterialIcon } from "../../components/MaterialIcon";
import {
  type TimelineStep,
  TrackingTimeline,
} from "../../components/shipments/TrackingTimeline";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useShipmentContext } from "../../context/ShipmentContext";
import { useFetch } from "../../hooks/useFetch";
import { useSeo } from "../../hooks/useSeo";
import type {
  DeliveryFlag,
  DeliveryRow,
  ShipmentDetail,
  TimelineStepData,
} from "../../types";

const DONE_BY_FLAG: Record<DeliveryFlag, number> = {
  delivered: 4,
  exception: 3,
  review: 2,
};

function buildTimeline(
  steps: TimelineStepData[],
  flag: DeliveryFlag,
): TimelineStep[] {
  const done = DONE_BY_FLAG[flag];
  return steps.map((step, index) => ({
    label: step.label,
    time: index < done ? step.time : "—",
    state: index < done ? "done" : index === done ? "current" : "pending",
  }));
}

export function ShipmentDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  useSeo(`/shipments/${id}`, "/shipments");
  const { getShipmentById } = useShipmentContext();
  const detail = useFetch<{ data: DeliveryRow; detail: ShipmentDetail | null }>(
    id ? `/api/shipments/${encodeURIComponent(id)}` : null,
  );

  if (detail.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-[13px] text-on-surface-variant">
        <Spinner /> Memuat detail resi dari server...
      </div>
    );
  }

  // API adalah sumber utama; fallback memakai daftar resi yang sudah dimuat.
  const shipment = detail.data?.data ?? getShipmentById(id);

  if (!shipment) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <span
          className="grid size-16 place-items-center rounded-full bg-surface-container text-on-surface-variant"
          aria-hidden="true"
        >
          <MaterialIcon name="search_off" className="text-[36px]" />
        </span>
        <h1 className="text-[20px] font-bold tracking-tight text-on-surface">
          Resi tidak ditemukan
        </h1>
        <p className="max-w-xs text-[13px] leading-relaxed text-on-surface-variant">
          Nomor resi{" "}
          <strong className="tabular-nums text-on-surface">{id || "—"}</strong>{" "}
          tidak terdaftar dalam sistem. Periksa kembali nomor resi Anda.
        </p>
        <Button as="link" to="/shipments" variant="primary" className="mt-1">
          <MaterialIcon name="arrow_back" className="text-[18px]" /> Kembali ke
          Daftar Resi
        </Button>
      </div>
    );
  }

  const timeline = buildTimeline(
    detail.data?.detail?.timeline ?? [],
    shipment.flag,
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/shipments"
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-on-surface-variant hover:text-on-surface"
      >
        <MaterialIcon name="arrow_back" className="text-[18px]" /> Semua Resi
      </Link>

      <article className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card">
        <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Nomor Resi
        </p>
        <p className="tabular-nums m-0 mt-1 text-barcode-tracking font-extrabold text-on-surface">
          {shipment.tracking}
        </p>
        <p className="m-0 mt-3 flex flex-wrap items-center gap-2">
          <ServiceTag service={shipment.service} />
          <StatusPill label={shipment.statusLabel} tone={shipment.statusTone} />
        </p>
      </article>

      <section
        className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card"
        aria-labelledby="judul-tujuan"
      >
        <h2
          id="judul-tujuan"
          className="mb-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
        >
          Tujuan Pengiriman
        </h2>
        <p className="m-0 flex items-start gap-3">
          <MaterialIcon
            name="person_pin_circle"
            className="mt-0.5 text-[20px] text-brand-magenta"
          />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-on-surface">
              {shipment.recipient ?? "Penerima"}
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-on-surface-variant">
              {shipment.address ?? shipment.regionLabel}
            </span>
          </span>
        </p>
        <p className="m-0 mt-3 flex items-center justify-between gap-2 border-t border-black/[0.05] pt-3 text-[12px] text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <MaterialIcon name="two_wheeler" className="text-[16px]" />{" "}
            {shipment.courierName}{" "}
            <span className="text-on-surface-variant/70">
              ({shipment.courierCode})
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <MaterialIcon name="location_on" className="text-[16px]" />{" "}
            {shipment.regionLabel}
          </span>
        </p>
      </section>

      <section
        className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card"
        aria-labelledby="judul-perjalanan"
      >
        <h2
          id="judul-perjalanan"
          className="mb-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
        >
          Riwayat Perjalanan
        </h2>
        <TrackingTimeline steps={timeline} />
        {shipment.flag === "exception" ? (
          <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2 text-[12px] text-orange-700">
            <MaterialIcon name="error" className="text-[16px]" /> Terdapat
            pengecualian geofence yang sedang ditinjau admin.
          </p>
        ) : null}
      </section>

      <Button as="link" to="/shipments" variant="secondary" className="w-full">
        <MaterialIcon name="search" className="text-[18px]" /> Lacak Resi Lain
      </Button>
    </div>
  );
}
