import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CourierBottomNav } from "../../components/courier/CourierBottomNav";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useSession } from "../../context/SessionContext";
import { useToast } from "../../context/ToastContext";
import { TASKS } from "../../data/tasks";
import { useSeo } from "../../hooks/useSeo";
import { useWelcomeToast } from "../../hooks/useWelcomeToast";
import { initialOf } from "../../lib/format";
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
  const name = session?.name ?? "Satria";
  useWelcomeToast(name);

  const [filter, setFilter] = useState<Filter>("all");
  const [flash, setFlash] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());

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
    setFilter("all");
    setFlash(found.tracking);
    window.setTimeout(() => {
      cardRefs.current
        .get(found.tracking)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    window.setTimeout(() => setFlash(null), 900);
    toast(`Resi ditemukan: ${found.tracking}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-on-surface antialiased">
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-surface/85 pt-safe backdrop-blur-xl">
        <p className="mx-auto flex h-14 max-w-md items-center justify-between px-5 m-0">
          <Link
            className="flex items-center gap-2.5"
            to="/"
            aria-label="Kembali ke beranda Satria"
          >
            <img
              className="h-6 w-auto"
              src="/logo-anteraja.png"
              alt="Anteraja"
            />
          </Link>
          <span className="flex items-center gap-3">
            <span className="block text-right leading-tight">
              <span className="block text-[13px] font-semibold text-on-surface">
                {name}
              </span>
              <span className="block text-[11px] font-medium text-on-surface-variant">
                #4821 &bull; Jak-Sel
              </span>
            </span>
            <span
              className="grid size-8 place-items-center rounded-full bg-brand-magenta/10 text-[13px] font-bold text-brand-magenta ring-1 ring-black/10"
              aria-hidden="true"
            >
              {initialOf(name, "S")}
            </span>
          </span>
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-28">
        <section className="px-1" aria-labelledby="judul-tugas">
          <h1
            id="judul-tugas"
            className="text-[26px] font-bold tracking-tight text-on-surface"
          >
            Pengiriman
          </h1>
          <p className="text-[13px] text-on-surface-variant">
            <span>{visibleTasks.length}</span> tersisa &bull;{" "}
            <span>{done}</span> selesai hari ini
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
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`seg-btn flex-1 rounded-[8px] px-3 py-1.5 text-[13px] transition-all ${
                  isActive
                    ? "bg-surface-container-lowest font-semibold text-on-surface shadow-sm"
                    : "font-medium text-on-surface-variant hover:text-on-surface"
                }`}
                data-filter={item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
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
                ref={(element) => {
                  if (element) cardRefs.current.set(task.tracking, element);
                  else cardRefs.current.delete(task.tracking);
                }}
                className={`task-card relative rounded-2xl border-y border-r border-border-subtle border-l-4 bg-surface-card p-4 shadow-card ${
                  task.category === "instant"
                    ? "border-l-brand-magenta"
                    : "border-l-energetic-yellow"
                } ${flash === task.tracking ? "animate-flash" : ""}`}
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
                  <span className="tabular-nums text-[12px] tracking-tight text-on-surface-variant/70">
                    {task.tracking}
                  </span>
                  {task.cta ? (
                    <Link
                      className="btn-start inline-flex items-center gap-1 text-[13px] font-semibold text-brand-magenta hover:opacity-80"
                      to="/courier/verifikasi"
                    >
                      {task.cta}{" "}
                      <MaterialIcon
                        name="arrow_forward"
                        className="text-[16px]"
                      />
                    </Link>
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
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface"
            id="btn-scan-resi"
            type="button"
            onClick={scan}
          >
            <MaterialIcon name="qr_code_scanner" className="text-[18px]" />{" "}
            Pindai Resi Manual
          </button>
        </p>
      </main>

      <CourierBottomNav activeLabel="Tugas" />
    </div>
  );
}
