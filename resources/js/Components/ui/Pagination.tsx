import { cn } from "../../lib/cn";
import { MaterialIcon } from "../MaterialIcon";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  isLoading: boolean;
  goTo: (page: number) => void;
}

/**
 * Numbered pagination for a data table. One segmented control, pinned to the
 * bottom-right of the table; hidden when everything fits a single page.
 */

/** Shared cell recipe so the three cells render at one height. */
const SEGMENT =
  "h-10 gap-1.5 whitespace-nowrap rounded-lg px-3 text-body-sm font-semibold";

/** Square cell for a page number. */
const NUMBER_CELL =
  "size-10 justify-center rounded-lg text-body-sm font-semibold tabular-nums";

/**
 * Width of the number strip. The list endpoints hand out one cursor at a time,
 * so the reachable pages grow as the visitor walks; capping the window keeps
 * the control the same width instead of stretching on every page. The arrows
 * drop their labels under `sm`, so the strip still fits a phone.
 */
const WINDOW = 5;

/** A contiguous window of at most WINDOW pages that always holds `page`. */
function pageItems(
  page: number,
  pageCount: number,
): { key: string; value: number }[] {
  const start = Math.max(
    1,
    Math.min(
      page - Math.floor(WINDOW / 2),
      Math.max(1, pageCount - WINDOW + 1),
    ),
  );
  const end = Math.min(pageCount, start + WINDOW - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => ({
    key: `page-${start + index}`,
    value: start + index,
  }));
}

export function Pagination({
  page,
  pageCount,
  isLoading,
  goTo,
  className,
}: PaginationProps & { className?: string }) {
  if (pageCount <= 1) return null;

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
          disabled={page <= 1 || isLoading}
          onClick={() => goTo(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </Button>
        {pageItems(page, pageCount).map((item) => (
          <Button
            key={item.key}
            variant="segment"
            active={item.value === page}
            className={NUMBER_CELL}
            onClick={() => goTo(item.value)}
            aria-label={`Halaman ${item.value}`}
            aria-current={item.value === page ? "page" : undefined}
            id={item.value === page ? "page-indicator" : undefined}
          >
            {item.value}
          </Button>
        ))}
        <Button
          variant="segment"
          className={SEGMENT}
          disabled={page >= pageCount || isLoading}
          onClick={() => goTo(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </Button>
      </div>
    </nav>
  );
}
