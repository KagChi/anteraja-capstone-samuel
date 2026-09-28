import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MaterialIcon } from "../../components/MaterialIcon";
import { Button } from "../../components/ui/Button";
import { useSession } from "../../context/SessionContext";
import { useToast } from "../../context/ToastContext";
import { TASKS } from "../../data/tasks";
import { useSeo } from "../../hooks/useSeo";
import { useWelcomeToast } from "../../hooks/useWelcomeToast";
import { getCompleted } from "../../lib/storage";
import type { TaskBadge, TaskCategory } from "../../types";

type Filter = "all" | TaskCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "instant", label: "Instant" },
  { id: "sameday", label: "Same-Day" },
];

function Badge({ badge }: { badge: TaskBadge }) {
  if (badge.tone === "service-instant") {
    return (
      <span className="rounded-md bg-brand-magenta/10 px-2 py-0.5 text-[12px] font-semibold text-brand-magenta">
        {badge.label}
      </span>
    );
  }
  if (badge.tone === "service-sameday") {
    return (
      <span className="rounded-md bg-surface-container px-2 py-0.5 text-[12px] font-medium text-on-surface-variant">
        {badge.label}
      </span>
    );
  }
  if (badge.tone === "pin") {
    return (
      <span className="flex items-center gap-1 text-[12px] font-medium text-on-surface-variant">
        <span
          className="size-1.5 rounded-full bg-alert-amber"
          aria-hidden="true"
        />
        {badge.label}
      </span>
    );
  }
  if (badge.tone === "pill") {
    return (
      <span className="rounded-md bg-surface-container px-2 py-0.5 text-[12px] font-medium text-on-surface">
        {badge.label}
      </span>
    );
  }
  return (
    <span className="text-[12px] text-on-surface-variant/70">
      {badge.label}
    </span>
  );
}

export function TugasPage() {
  useSeo("/courier/tugas");
  const { session } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const name = session?.name ?? "Satria";
  useWelcomeToast(name);

  const [filter, setFilter] = useState<Filter>("all");

  const visibleTasks = TASKS.filter(
    (task) => filter === "all" || task.category === filter,
  );
  const done = 8 + getCompleted().length;

  function scan() {
    const code = window.prompt("Masukkan nomor resi yang ingin dipindai:");
    if (!code) return;
    const query = code.trim().toLowerCase();
    if (!query) return;
    const found = TASKS.find((task) =>
      task.tracking.toLowerCase().includes(query),
    );
    if (!found) {
      toast(`Resi tidak ditemukan: ${code.trim()}`, "error");
      return;
    }
    toast(`Resi ditemukan: ${found.tracking}`);
    navigate(`/shipments/${found.tracking}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="px-1" aria-labelledby="judul-tugas">
        <h1
          id="judul-tugas"
          className="text-[26px] font-bold tracking-tight text-on-surface"
        >
          Pengiriman
        </h1>
        <p className="text-[13px] text-on-surface-variant">
          <span>{visibleTasks.length}</span> tersisa &bull; <span>{done}</span>{" "}
          selesai hari ini
        </p>
      </section>

      <div
        className="flex items-center rounded-[10px] bg-surface-container-high p-0.5 shadow-inner"
        id="segment-bar"
        role="tablist"
        aria-label="Filter layanan"
      >
        {FILTERS.map((item) => {
          const isActive = filter === item.id;
          return (
            <Button
              key={item.id}
              variant="tab"
              active={isActive}
              className="flex-1 rounded-[8px] px-3 py-1.5 text-[13px]"
              data-filter={item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          );
        })}
      </div>

      <ul
        className="m-0 flex list-none flex-col gap-3 p-0"
        id="task-container"
        aria-label="Daftar stop aktif"
      >
        {visibleTasks.map((task) => (
          <li key={task.tracking}>
            <article
              className={`task-card relative rounded-2xl border-y border-r border-border-subtle border-l-4 bg-surface-card p-4 shadow-card ${
                task.category === "instant"
                  ? "border-l-brand-magenta"
                  : "border-l-energetic-yellow"
              }`}
              data-category={task.category}
              data-tracking={task.tracking}
            >
              <header className="mb-2 flex items-center justify-between gap-2">
                <p className="m-0 flex items-center gap-2">
                  {task.badges.map((badge) => (
                    <Badge key={badge.label} badge={badge} />
                  ))}
                </p>
                <p className="m-0 whitespace-nowrap text-[12px] text-on-surface-variant/70">
                  {task.distance} &bull; {task.eta}
                </p>
              </header>
              <h2 className="truncate text-[16px] font-semibold leading-snug text-on-surface">
                <Link className="hover:underline" to="/courier/verifikasi">
                  {task.recipient}
                </Link>
              </h2>
              <p className="mt-0.5 truncate text-[13px] leading-relaxed text-on-surface-variant">
                {task.address}
              </p>
              <footer className="mt-3.5 flex items-center justify-between border-t border-black/[0.05] pt-3">
                <Link
                  className="tabular-nums text-[12px] tracking-tight text-on-surface-variant/70 hover:text-brand-magenta"
                  to={`/shipments/${task.tracking}`}
                >
                  {task.tracking}
                </Link>
                {task.cta ? (
                  <Button
                    as="link"
                    to="/courier/verifikasi"
                    variant="text"
                    className="text-[13px]"
                  >
                    {task.cta}{" "}
                    <MaterialIcon
                      name="arrow_forward"
                      className="text-[16px]"
                    />
                  </Button>
                ) : (
                  <span className="text-[12px] text-on-surface-variant/70">
                    {task.footerNote}
                  </span>
                )}
              </footer>
            </article>
          </li>
        ))}
      </ul>

      <p className="m-0 px-1 pt-2 text-center">
        <Button variant="ghost" size="sm" id="btn-scan-resi" onClick={scan}>
          <MaterialIcon name="qr_code_scanner" className="text-[18px]" /> Pindai
          Resi Manual
        </Button>
      </p>
    </div>
  );
}
