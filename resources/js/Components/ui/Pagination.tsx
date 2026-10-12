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
 * Numbered pagination for a data table. One centered segmented control; hidden
 * when everything fits a single page.
 */

/** Shared cell recipe so the three cells render at one height. */
const SEGMENT =
  "h-10 gap-1.5 whitespace-nowrap rounded-lg px-3 text-body-sm font-semibold";

/** Square cell for a page number. */
const NUMBER_CELL =
  "size-10 justify-center rounded-lg text-body-sm font-semibold tabular-nums";

/**
 * The numbers to render: every page on short runs, otherwise the ends plus a
 * window around the current page.
 */
function pageItems(
  page: number,
  pageCount: number,
): { key: string; value: number | null }[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => ({
      key: `page-${index + 1}`,
      value: index + 1,
    }));
  }

  const items: { key: string; value: number | null }[] = [
    { key: "page-1", value: 1 },
  ];
  if (page > 3) items.push({ key: "gap-left", value: null });
  for (const number of [page - 1, page, page + 1]) {
    if (number > 1 && number < pageCount) {
      items.push({ key: `page-${number}`, value: number });
    }
  }
  if (page < pageCount - 2) items.push({ key: "gap-right", value: null });
  items.push({ key: `page-${pageCount}`, value: pageCount });
  return items;
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
      className={cn("flex justify-center", className)}
      aria-label="Navigasi halaman"
      aria-busy={isLoading || undefined}
    >
      <div className="inline-flex items-center gap-1 rounded-xl bg-surface-container p-1">
        <Button
          variant="segment"
          className={SEGMENT}
          disabled={page <= 1 || isLoading}
          onClick={() => goTo(page - 1)}
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
          Sebelumnya
        </Button>
        {pageItems(page, pageCount).map((item) =>
          item.value === null ? (
            <span
              key={item.key}
              className={cn(
                NUMBER_CELL,
                "grid place-items-center text-on-surface-variant",
              )}
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Button
              key={item.key}
              variant="segment"
              active={item.value === page}
              className={NUMBER_CELL}
              onClick={() => goTo(item.value as number)}
              aria-label={`Halaman ${item.value}`}
              aria-current={item.value === page ? "page" : undefined}
              id={item.value === page ? "page-indicator" : undefined}
            >
              {item.value}
            </Button>
          ),
        )}
        <Button
          variant="segment"
          className={SEGMENT}
          disabled={page >= pageCount || isLoading}
          onClick={() => goTo(page + 1)}
        >
          Berikutnya
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </Button>
      </div>
    </nav>
  );
}
