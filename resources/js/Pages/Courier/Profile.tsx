import { router } from "@inertiajs/react";
import { Avatar } from "../../Components/Avatar";
import { CourierBottomNav } from "../../Components/courier/CourierBottomNav";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";
import { StatusPanel } from "../../Components/ui/StatusPanel";
import { useCourierAvatar } from "../../Hooks/useCourierAvatar";
import { useFetch } from "../../Hooks/useFetch";
import { useSeo } from "../../Hooks/useSeo";
import type { CourierProfile } from "../../types";

/**
 * Profil: the courier's identity, assignment area and shift counters, plus

 * the session logout.
 */
export function CourierProfilePage() {
  useSeo("/courier/profil");
  const profileResource = useFetch<{ data: CourierProfile }>(
    "/api/v1/courier/profile",
  );
  const profile = profileResource.data?.data;
  const courierAvatar = useCourierAvatar();

  return (
    <div className="flex min-h-screen flex-col bg-surface-container-low font-sans text-on-surface antialiased">
      <header className="fixed inset-x-0 top-0 z-40 bg-surface-container-low/90 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-md items-center px-4">
          <h1 className="text-title-lg tracking-tight text-on-surface">
            Profil Kurir
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(6rem+env(safe-area-inset-bottom,16px))]">
        {profileResource.isLoading && !profile ? (
          <StatusPanel spinning>Memuat profil...</StatusPanel>
        ) : null}

        {profileResource.isError && !profile ? (
          <StatusPanel
            icon="cloud_off"
            tone="error"
            action={
              <Button
                variant="text"
                className="text-[12px]"
                onClick={profileResource.reload}
              >
                Coba lagi
              </Button>
            }
          >
            Gagal memuat profil kurir.
          </StatusPanel>
        ) : null}

        {profile ? (
          <>
            <section
              className="rounded-md border border-border-subtle bg-surface-card p-4 shadow-card"
              aria-labelledby="judul-identitas"
              id="courier-profile"
            >
              <header className="flex items-center gap-3">
                <Avatar
                  name={profile.name}
                  resource={courierAvatar}
                  className="size-12 text-[16px]"
                />
                <span className="block leading-tight">
                  <span className="block text-title-md font-bold text-on-surface">
                    {profile.name}
                  </span>
                  <span className="tabular-nums block text-[12px] text-on-surface-variant">
                    Satria {profile.code} • Area {profile.serviceArea.region}
                  </span>
                </span>
                <mark
                  className={
                    "ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold " +
                    (profile.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700")
                  }
                >
                  {profile.active ? "Aktif" : "Nonaktif"}
                </mark>
              </header>
              <dl className="m-0 mt-4 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
                <div className="rounded-lg bg-surface-container-low/60 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Telepon
                  </dt>
                  <dd className="tabular-nums m-0 mt-0.5 font-semibold text-on-surface">
                    {profile.phone ?? "—"}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-container-low/60 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Email
                  </dt>
                  <dd className="m-0 mt-0.5 truncate font-semibold text-on-surface">
                    {profile.email ?? "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              className="rounded-md border border-border-subtle bg-surface-card p-4 shadow-card"
              aria-labelledby="judul-statistik"
              id="courier-stats"
            >
              <h2
                id="judul-statistik"
                className="m-0 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Statistik Shift
              </h2>
              <dl className="m-0 mt-3 grid grid-cols-3 gap-2 text-center">
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-low/60 p-3">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Stop Aktif
                  </span>
                  <strong className="tabular-nums block text-[20px] font-extrabold text-brand-magenta">
                    {profile.stats.activeTasks}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-low/60 p-3">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Selesai Hari Ini
                  </span>
                  <strong className="tabular-nums block text-[20px] font-extrabold text-on-surface">
                    {profile.stats.deliveredToday}
                  </strong>
                </dd>
                <dd className="m-0 rounded-lg border border-border-subtle bg-surface-container-low/60 p-3">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Total Selesai
                  </span>
                  <strong className="tabular-nums block text-[20px] font-extrabold text-on-surface">
                    {profile.stats.deliveredTotal}
                  </strong>
                </dd>
              </dl>
            </section>

            <Button
              variant="outline"
              size="lg"
              className="w-full border-error/30 text-error"
              id="btn-logout"
              onClick={() => router.post("/logout")}
            >
              <MaterialIcon name="logout" className="text-[18px]" /> Keluar dari
              Akun
            </Button>
          </>
        ) : null}
      </main>

      <CourierBottomNav activeLabel="Profil" />
    </div>
  );
}

export default CourierProfilePage;
