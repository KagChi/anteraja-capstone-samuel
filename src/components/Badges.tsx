import type { ServiceSegment, StatusTone } from "../types";

const SERVICE_LABEL: Record<ServiceSegment, string> = {
  instant: "Instant",
  sameday: "Same-Day",
  regular: "Reguler",
};

const SERVICE_CLASS: Record<ServiceSegment, string> = {
  instant: "text-brand-magenta bg-brand-magenta/10",
  sameday: "text-amber-700 bg-secondary-container/60",
  regular: "text-emerald-700 bg-emerald-100",
};

export function ServiceTag({ service }: { service: ServiceSegment }) {
  return (
    <mark
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${SERVICE_CLASS[service]}`}
    >
      {SERVICE_LABEL[service]}
    </mark>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  amber: "text-amber-700 bg-alert-amber/15",
  emerald: "text-emerald-700 bg-emerald-50",
  orange: "text-orange-700 bg-orange-100",
};

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <mark
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_CLASS[tone]}`}
    >
      {label}
    </mark>
  );
}
