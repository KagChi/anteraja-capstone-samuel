import { Link } from "@inertiajs/react";
import { useRef, useState } from "react";
import { Avatar } from "../../Components/Avatar";
import { CourierBottomNav } from "../../Components/courier/CourierBottomNav";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { Spinner } from "../../Components/ui/Spinner";
import { useSession } from "../../Contexts/SessionContext";
import { useShipmentContext } from "../../Contexts/ShipmentContext";
import { useToast } from "../../Contexts/ToastContext";
import { useFetch } from "../../Hooks/useFetch";
import { useSeo } from "../../Hooks/useSeo";
import { useWelcomeToast } from "../../Hooks/useWelcomeToast";
import type { DeliveryTask, TaskBadge, TaskCategory } from "../../types";

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

export function TasksPage() {
  useSeo("/courier/tugas");
  const { session } = useSession();
  const { courierAvatar } = useShipmentContext();
  const toast = useToast();
  const name = session?.name ?? "Satria";
  useWelcomeToast(name);

  const [filter, setFilter] = useState<Filter>("all");
  const [flash, setFlash] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const tasksResource = useFetch<{ data: DeliveryTask[] }>(
    "/api/v1/courier/tasks",
  );
  const tasks = tasksResource.data?.data ?? [];

  const visibleTasks = tasks.filter(
    (task) => filter === "all" || task.category === filter,
  );
  const done = 8;

  function scan() {
    const code = window.prompt("Masukkan nomor resi yang ingin dipindai:");
    if (!code) return;
    const query = code.trim().toLowerCase();
    if (!query) return;
    const found = tasks.find((task) =>
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
            href="/"
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
            <Avatar
              name={name}
              resource={courierAvatar}
              className="ring-black/10"
            />
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
          {tasksResource.isLoading ? (
            <li className="rounded-2xl border border-dashed border-border-subtle bg-surface-card px-4 py-10 text-center text-[13px] text-on-surface-variant">
              <Spinner /> Memuat tugas dari server...
            </li>
          ) : tasksResource.isError ? (
            <li className="rounded-2xl border border-dashed border-border-subtle bg-surface-card px-4 py-10 text-center text-[13px] text-on-surface-variant">
              Gagal memuat tugas dari server.{" "}
              <Button
                variant="text"
                className="text-[12px]"
                onClick={tasksResource.reload}
              >
                Coba lagi
              </Button>
            </li>
          ) : (
            visibleTasks.map((task) => (
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
                    <Link
                      className="hover:underline"
                      href="/courier/verifikasi"
                    >
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
            ))
          )}
        </ul>

        <p className="m-0 px-1 pt-2 text-center">
          <Button variant="ghost" size="sm" id="btn-scan-resi" onClick={scan}>
            <MaterialIcon name="qr_code_scanner" className="text-[18px]" />{" "}
            Pindai Resi Manual
          </Button>
        </p>
      </main>

      <CourierBottomNav activeLabel="Tugas" />
    </div>
  );
}

export default TasksPage;
