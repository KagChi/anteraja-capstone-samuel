import { MaterialIcon } from "../MaterialIcon";

export type TimelineState = "done" | "current" | "pending";

export interface TimelineStep {
  label: string;
  time: string;
  state: TimelineState;
}

const DOT_CLASS: Record<TimelineState, string> = {
  done: "bg-tertiary text-white",
  current: "bg-brand-magenta text-white",
  pending: "bg-surface-container-high text-on-surface-variant/60",
};

export function TrackingTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol
      className="relative m-0 list-none space-y-4 pl-1"
      aria-label="Riwayat perjalanan resi"
    >
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-3">
          <span
            className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${DOT_CLASS[step.state]}`}
            aria-hidden="true"
          >
            <MaterialIcon
              name={step.state === "done" ? "check" : "circle"}
              className="text-[14px]"
              fill={step.state !== "pending"}
            />
          </span>
          <section className="min-w-0 flex-1 border-b border-black/[0.05] pb-3 last:border-0 last:pb-0">
            <p className="m-0 text-[13px] font-semibold text-on-surface">
              {step.label}
            </p>
            <time className="tabular-nums text-[11px] text-on-surface-variant">
              {step.time}
            </time>
          </section>
        </li>
      ))}
    </ol>
  );
}
