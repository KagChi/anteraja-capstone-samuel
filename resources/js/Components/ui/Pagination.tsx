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
 * Cursor prev/next pagination for a data table. Rendered bottom-right; hidden
 * when everything fits a single page.
 */
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
      className={cn("flex items-center justify-end gap-3", className ?? "pt-2")}
      aria-label="Navigasi halaman"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={!hasPrev || isLoading}
        onClick={onPrev}
      >
        <MaterialIcon name="chevron_left" className="text-[18px]" /> Sebelumnya
      </Button>
      <span
        className="text-[13px] font-semibold text-on-surface-variant"
        id="page-indicator"
      >
        Halaman {page}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext || isLoading}
        onClick={onNext}
      >
        Berikutnya <MaterialIcon name="chevron_right" className="text-[18px]" />
      </Button>
    </nav>
  );
}
