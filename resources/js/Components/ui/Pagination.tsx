import { STRIP_PAGES } from "../../Hooks/useCursorPagination";
import { cn } from "../../lib/cn";
import { MaterialIcon } from "../MaterialIcon";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** Pages exist beyond the window; the strip itself stays purely numeric. */
  hasMorePages: boolean;
  isLoading: boolean;
  isDiscovering: boolean;
  goTo: (page: number) => void;
}

/**
 * Numbered pagination for a data table, pinned to the bottom-right. The strip
 * keeps a fixed set of page cells - never a marker cell or an ellipsis - so it
 * shows a plain run of numbers at one width, with the run centred when the list
 * has fewer pages than the window.
 */

/** Arrow cell: icon only, the same box as a page cell. */
const ARROW = "size-9 justify-center rounded-lg sm:size-10";

/** One page-number cell. */
const CELL =
  "size-9 justify-center rounded-lg text-body-sm font-semibold tabular-nums sm:size-10";

/** Empty cell: holds a slot open without drawing anything. */
const BLANK = "inline-block size-9 sm:size-10";

interface Slot {
  key: string;
  value: number | null;
}

/** A contiguous window of at most STRIP_PAGES pages that always holds `page`. */
function pageItems(page: number, pageCount: number): number[] {
  const start = Math.max(
    1,
    Math.min(
      page - Math.floor(STRIP_PAGES / 2),
      Math.max(1, pageCount - STRIP_PAGES + 1),
    ),
  );
  const end = Math.min(pageCount, start + STRIP_PAGES - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * The window padded to STRIP_PAGES cells, split evenly around it, so every table
 * renders the same strip width whatever its page count.
 */
function pageSlots(page: number, pageCount: number): Slot[] {
  const items = pageItems(page, pageCount);
  const padding = STRIP_PAGES - items.length;
  const before = Math.floor(padding / 2);

  const blank = (index: number, side: string): Slot => ({
    key: `blank-${side}-${index}`,
    value: null,
  });

  return [
    ...Array.from({ length: before }, (_, index) => blank(index, "lead")),
    ...items.map((value) => ({ key: `page-${value}`, value })),
    ...Array.from({ length: padding - before }, (_, index) =>
      blank(index, "trail"),
    ),
  ];
}

export function Pagination({
  page,
  pageCount,
  isLoading,
  isDiscovering,
  goTo,
  className,
}: PaginationProps & { className?: string }) {
  // Hold the strip until the first pass of discovery settles, so it appears
  // complete instead of filling in one number at a time.
  if (pageCount <= 1 || (isDiscovering && pageCount < STRIP_PAGES)) return null;

  return (
    <nav
      className={cn("flex justify-end", className)}
      aria-label="Navigasi halaman"
      aria-busy={isLoading || undefined}
    >
      <div className="inline-flex items-center gap-1 rounded-xl bg-surface-container p-1">
        <Button
          variant="segment"
          className={ARROW}
          disabled={page <= 1 || isLoading}
          onClick={() => goTo(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
        </Button>
        {pageSlots(page, pageCount).map((slot) =>
          slot.value === null ? (
            <span key={slot.key} className={BLANK} aria-hidden="true" />
          ) : (
            <Button
              key={slot.key}
              variant="segment"
              active={slot.value === page}
              className={CELL}
              onClick={() => goTo(slot.value as number)}
              aria-label={`Halaman ${slot.value}`}
              aria-current={slot.value === page ? "page" : undefined}
              id={slot.value === page ? "page-indicator" : undefined}
            >
              {slot.value}
            </Button>
          ),
        )}
        <Button
          variant="segment"
          className={ARROW}
          disabled={page >= pageCount || isLoading}
          onClick={() => goTo(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </Button>
      </div>
    </nav>
  );
}
