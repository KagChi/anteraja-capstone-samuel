import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Shared page header for the admin console: one title style, one description
 * width, and an optional right-aligned actions slot, so every admin page reads
 * the same.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <section>
        <h1 className="text-headline-xl tracking-tight text-on-surface">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </section>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
