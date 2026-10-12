import { STRIP_PAGES } from "../../Hooks/useCursorPagination";
import { cn } from "../../lib/cn";
import { MaterialIcon } from "../MaterialIcon";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  hasMorePages: boolean;
  isLoading: boolean;
  isDiscovering: boolean;
  goTo: (page: number) => void;
}

/**
 * Numbered pagination for a data table, pinned to the bottom-right. The strip
 * renders a fixed set of slots - a gap, five page cells, a gap - so the control
 * keeps one width whether the list has two pages or forty, and while the pages
 * ahead are still being discovered.
 */

/** Arrow cell. The label is dropped under `sm` so the strip fits a phone. */
const ARROW =
  "h-9 gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-body-sm font-semibold sm:h-10 sm:px-3";

/** One page-number slot. */
const CELL =
  "size-9 justify-center rounded-lg text-body-sm font-semibold tabular-nums sm:size-10";

/** One gap slot, sized the same whether or not it draws an ellipsis. */
const GAP = "grid h-9 w-4 place-items-center sm:h-10 sm:w-6";

/** Empty slot: keeps the strip's width without drawing anything. */
const BLANK = "inline-block size-9 sm:size-10";

/** A contiguous window of at most STRIP_PAGES pages that always holds `page`. */
function pageItems(
  page: number,
  pageCount: number,
): { key: string; value: number }[] {
  const start = Math.max(
    1,
    Math.min(
      page - Math.floor(STRIP_PAGES / 2),
      Math.max(1, pageCount - STRIP_PAGES + 1),
    ),
  );
  const end = Math.min(pageCount, start + STRIP_PAGES - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => ({
    key: `page-${start + index}`,
    value: start + index,
  }));
}

interface Slot {
  key: string;
  value: number | null;
}

/** The window, padded with empty slots so the strip is always STRIP_PAGES wide. */
function pageSlots(page: number, pageCount: number): Slot[] {
  const slots: Slot[] = pageItems(page, pageCount).map((item) => ({
    key: item.key,
    value: item.value,
  }));

  while (slots.length < STRIP_PAGES) {
    slots.push({ key: `blank-${slots.length + 1}`, value: null });
  }

  return slots;
}

function GapSlot({ show }: { show: boolean }) {
  return (
    <span
      className={cn(GAP, "text-body-sm text-on-surface-variant")}
      aria-hidden="true"
    >
      {show ? "…" : ""}
    </span>
  );
}

export function Pagination({
  page,
  pageCount,
  hasMorePages,
  isLoading,
  isDiscovering,
  goTo,
  className,
}: PaginationProps & { className?: string }) {
  // Hold the strip until the first pass of discovery settles, so it appears
  // complete instead of filling in one number at a time.
  if (pageCount <= 1 || (isDiscovering && pageCount < STRIP_PAGES)) return null;

  const items = pageItems(page, pageCount);
  const first = items[0]?.value ?? 1;
  const last = items[items.length - 1]?.value ?? pageCount;

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
          <span className="hidden sm:inline">Sebelumnya</span>
        </Button>
        <GapSlot show={first > 1} />
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
        <GapSlot show={last < pageCount || hasMorePages} />
        <Button
          variant="segment"
          className={ARROW}
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
