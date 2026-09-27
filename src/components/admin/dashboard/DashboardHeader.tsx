interface DashboardHeaderProps {
  eyebrow: string;
  shift: string;
  title: string;
  description: string;
}

export function DashboardHeader({
  eyebrow,
  shift,
  title,
  description,
}: DashboardHeaderProps) {
  return (
    <section>
      <p className="m-0 mb-1 flex items-center gap-space-xs text-on-surface-variant">
        <span className="text-label-sm font-bold uppercase tracking-wider text-brand-magenta">
          {eyebrow}
        </span>
        <span className="text-outline-variant" aria-hidden="true">
          &bull;
        </span>
        <span className="text-label-sm font-medium text-on-surface-variant">
          {shift}
        </span>
      </p>
      <h1 className="text-headline-lg tracking-tight text-on-surface">
        {title}
      </h1>
      <p className="mt-0.5 text-body-md text-on-surface-variant">
        {description}
      </p>
    </section>
  );
}
