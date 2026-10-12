import { cn } from "../../lib/cn";
import { MaterialIcon } from "../MaterialIcon";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Cursor prev/next pagination for a data table. Rendered bottom-right as one
 * segmented control; hidden when everything fits a single page.
 */

/** Shared cell recipe so the three cells render at one height. */
const SEGMENT =
  "h-10 gap-1.5 whitespace-nowrap rounded-lg px-3 text-body-sm font-semibold";

export function Pagination({
  page,
  hasPrev,
  hasNext,
  isLoading,
  onPrev,
  onNext,
  className,
}: PaginationProps & { className?: string }) {
  if (!hasPrev && !hasNext) return null;

  return (
    <nav
      className={cn("flex justify-end", className)}
      aria-label="Navigasi halaman"
      aria-busy={isLoading || undefined}
    >
      <div className="inline-flex items-center gap-1 rounded-xl bg-surface-container p-1">
        <Button
          variant="segment"
          className={SEGMENT}
          disabled={!hasPrev || isLoading}
          onClick={onPrev}
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
          Sebelumnya
        </Button>
        <span
          className={cn(
            SEGMENT,
            "inline-flex items-center justify-center bg-surface-container-lowest text-on-surface-variant tabular-nums shadow-sm",
          )}
          id="page-indicator"
        >
          Halaman{" "}
          <strong className="font-extrabold text-on-surface">{page}</strong>
        </span>
        <Button
          variant="segment"
          className={SEGMENT}
          disabled={!hasNext || isLoading}
          onClick={onNext}
        >
          Berikutnya
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </Button>
      </div>
    </nav>
  );
}
