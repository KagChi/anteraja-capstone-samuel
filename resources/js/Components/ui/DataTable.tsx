import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";
import { CARD_CLASS } from "./Card";
import { Pagination, type PaginationProps } from "./Pagination";

interface DataTableProps {
  title: string;
  toolbar?: ReactNode;
  pagination?: PaginationProps;
  children: ReactNode;
}

/**
 * Shared admin data-table card: one header (title + toolbar), table body and
 * bottom-right pagination, so every admin table looks the same.
 */
export function DataTable({
  title,
  toolbar,
  pagination,
  children,
}: DataTableProps) {
  const titleId = useId();

  return (
    <section
      className={cn(CARD_CLASS, "overflow-hidden")}
      aria-labelledby={titleId}
    >
      <header className="flex flex-col gap-4 border-b border-border-subtle p-4 md:p-6">
        <h2
          id={titleId}
          className="text-title-md font-semibold text-on-surface"
        >
          {title}
        </h2>
        {toolbar ? (
          <section className="flex flex-wrap items-center justify-between gap-3">
            {toolbar}
          </section>
        ) : null}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left">
          {children}
        </table>
      </div>
      {pagination && (pagination.hasPrev || pagination.hasNext) ? (
        <footer className="flex items-center justify-end border-t border-border-subtle px-5 py-3">
          <Pagination {...pagination} />
        </footer>
      ) : null}
    </section>
  );
}
