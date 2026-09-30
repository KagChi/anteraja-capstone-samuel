interface DashboardStatsProps {
  total: number;
  reviewCount: number;
  verifiedCount: number;
}

export function DashboardStats({
  total,
  reviewCount,
  verifiedCount,
}: DashboardStatsProps) {
  return (
    <p className="m-0 flex items-center gap-space-xs self-start rounded-full bg-surface-container px-space-md py-space-xs md:self-auto">
      <span
        className="size-2 animate-ping rounded-full bg-brand-magenta"
        aria-hidden="true"
      />
      <span className="text-body-sm text-on-surface">
        <strong className="text-title-md">{total}</strong> pengiriman hari ini
        <span className="mx-1.5 text-outline-variant" aria-hidden="true">
          &bull;
        </span>
        <strong className="text-title-md text-brand-magenta" id="review-count">
          {reviewCount}
        </strong>{" "}
        perlu tinjauan
        <span className="mx-1.5 text-outline-variant" aria-hidden="true">
          &bull;
        </span>
        <span className="text-on-surface-variant">
          {verifiedCount} terverifikasi otomatis
        </span>
      </span>
    </p>
  );
}
