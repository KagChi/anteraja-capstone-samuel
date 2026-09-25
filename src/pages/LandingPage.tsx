import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../components/LoadingAction";
import { MaterialIcon } from "../components/MaterialIcon";
import { useSession } from "../context/SessionContext";
import { useSeo } from "../hooks/useSeo";
import type { Role } from "../types";

const TARGETS: Record<Role, string> = {
  courier: "/courier/tugas",
  admin: "/admin/dashboard",
};

const LABELS: Record<Role, string> = {
  courier: "Aplikasi Kurir (Mobile)",
  admin: "Konsol Admin / Hub",
};

const DEFAULTS: Record<Role, string> = {
  courier: "Satria",
  admin: "Hub Admin Ops",
};

export function LandingPage() {
  useSeo("/");
  const navigate = useNavigate();
  const { login } = useSession();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<Role>("courier");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function open(selected: Role) {
    setRole(selected);
    setName("");
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
    }
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }

  function close() {
    dialogRef.current?.close();
  }

  function submit() {
    if (busy) return;
    const typed = name.trim();
    const resolved = typed || DEFAULTS[role];
    login(role, resolved);
    setBusy(true);
    window.setTimeout(() => {
      navigate(TARGETS[role]);
    }, 900);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-canvas font-sans text-on-surface antialiased">
      <header className="w-full border-b border-border-subtle bg-surface-container-lowest">
        <p className="mx-auto flex h-16 max-w-5xl items-center gap-2.5 px-5 m-0">
          <img className="h-6 w-auto" src="/logo-anteraja.png" alt="Anteraja" />
          <span className="ml-1 hidden border-l border-border-subtle pl-3 text-[12px] text-on-surface-variant sm:inline">
            Satria Rapid Field Dispatch
          </span>
          <span className="ml-auto rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            Purwarupa
          </span>
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-10">
        <section
          className="mx-auto max-w-2xl text-center"
          aria-labelledby="judul-utama"
        >
          <p className="m-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-magenta/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-brand-magenta">
              <MaterialIcon name="verified_user" className="text-[15px]" />{" "}
              Integritas Pengiriman
            </span>
          </p>
          <h1
            id="judul-utama"
            className="mt-4 text-3xl font-extrabold tracking-tight text-on-surface sm:text-headline-xl"
          >
            Purwarupa Antarmuka Anteraja Instant
          </h1>
          <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">
            Kerangka web statis hasil konversi rancangan UI/UX. Pilih alur peran
            untuk mulai menjelajah. Setiap halaman saling terhubung dan mengacu
            pada PRD serta FRD-01 sampai FRD-05.
          </p>
        </section>

        <nav
          className="grid gap-5 md:grid-cols-2"
          aria-label="Pilih alur peran"
        >
          <article className="group flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card transition-all hover:shadow-active">
            <span
              className="grid size-12 place-items-center rounded-xl bg-brand-magenta/10 text-brand-magenta"
              aria-hidden="true"
            >
              <MaterialIcon name="two_wheeler" className="text-[26px]" />
            </span>
            <header>
              <h2 className="text-title-lg font-bold text-on-surface">
                Aplikasi Kurir (Mobile)
              </h2>
              <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
                Alur satu tangan untuk Satria: daftar tugas, verifikasi lokasi
                &amp; PIN, bukti foto, dan konfirmasi sukses.
              </p>
            </header>
            <ul className="m-0 mt-auto list-none space-y-1 p-0 text-[12px] text-on-surface-variant">
              <li className="flex items-center gap-2">
                <MaterialIcon
                  name="arrow_right_alt"
                  className="text-[14px] text-brand-magenta"
                />{" "}
                FRD-01, FRD-02, FRD-03, FRD-04, FRD-05
              </li>
              <li className="flex items-center gap-2">
                <MaterialIcon
                  name="devices"
                  className="text-[14px] text-brand-magenta"
                />{" "}
                Optimal di lebar 375&ndash;780 px
              </li>
            </ul>
            <p className="m-0">
              <a
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-magenta transition-all group-hover:gap-2.5"
                href={TARGETS.courier}
                data-role="courier"
                onClick={(event) => {
                  event.preventDefault();
                  open("courier");
                }}
              >
                Masuk sebagai Kurir{" "}
                <MaterialIcon name="arrow_forward" className="text-[18px]" />
              </a>
            </p>
          </article>

          <article className="group flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card transition-all hover:shadow-active">
            <span
              className="grid size-12 place-items-center rounded-xl bg-surface-container text-on-surface"
              aria-hidden="true"
            >
              <MaterialIcon name="monitor" className="text-[26px]" />
            </span>
            <header>
              <h2 className="text-title-lg font-bold text-on-surface">
                Konsol Admin / Hub (Desktop)
              </h2>
              <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
                Pemantauan operasional: dashboard pengiriman, audit trail,
                antrian pengecualian, dan pengaturan radius.
              </p>
            </header>
            <ul className="m-0 mt-auto list-none space-y-1 p-0 text-[12px] text-on-surface-variant">
              <li className="flex items-center gap-2">
                <MaterialIcon
                  name="arrow_right_alt"
                  className="text-[14px] text-on-surface-variant"
                />{" "}
                FRD-01, FRD-04, FRD-05
              </li>
              <li className="flex items-center gap-2">
                <MaterialIcon
                  name="devices"
                  className="text-[14px] text-on-surface-variant"
                />{" "}
                Optimal di lebar 1280 px ke atas
              </li>
            </ul>
            <p className="m-0">
              <a
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-on-surface transition-all group-hover:gap-2.5"
                href={TARGETS.admin}
                data-role="admin"
                onClick={(event) => {
                  event.preventDefault();
                  open("admin");
                }}
              >
                Masuk sebagai Admin{" "}
                <MaterialIcon name="arrow_forward" className="text-[18px]" />
              </a>
            </p>
          </article>
        </nav>

        <section aria-labelledby="judul-peta-halaman">
          <h2
            id="judul-peta-halaman"
            className="mb-3 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Peta Halaman
          </h2>
          <section className="grid gap-4 md:grid-cols-2">
            <nav
              className="rounded-xl border border-border-subtle bg-surface-container-lowest p-4"
              aria-label="Halaman aplikasi kurir"
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand-magenta m-0">
                Kurir
              </p>
              <ol className="list-none space-y-1.5 p-0 text-[13px] m-0">
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/courier/tugas"
                  >
                    1. Daftar Tugas Pengiriman
                  </a>
                </li>
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/courier/verifikasi"
                  >
                    2. Verifikasi Lokasi &amp; PIN
                  </a>
                </li>
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/courier/bukti-foto"
                  >
                    3. Ambil Bukti Foto
                  </a>
                </li>
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/courier/sukses"
                  >
                    4. Konfirmasi Sukses
                  </a>
                </li>
              </ol>
            </nav>
            <nav
              className="rounded-xl border border-border-subtle bg-surface-container-lowest p-4"
              aria-label="Halaman konsol admin"
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant m-0">
                Admin / Hub
              </p>
              <ol className="list-none space-y-1.5 p-0 text-[13px] m-0">
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/admin/dashboard"
                  >
                    1. Dashboard Pengiriman
                  </a>
                </li>
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/admin/audit-trail"
                  >
                    2. Detail Audit Trail
                  </a>
                </li>
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/admin/antrian-pengecualian"
                  >
                    3. Antrian Pengecualian
                  </a>
                </li>
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/admin/pengecualian-detail"
                  >
                    3b. Detail Pengecualian
                  </a>
                </li>
                <li>
                  <a
                    className="text-on-surface hover:text-brand-magenta"
                    href="/admin/pengaturan-radius"
                  >
                    4. Pengaturan Radius
                  </a>
                </li>
              </ol>
            </nav>
          </section>
        </section>
      </main>

      <footer className="w-full border-t border-border-subtle">
        <p className="mx-auto max-w-5xl px-5 py-6 text-[11px] text-on-surface-variant/70 m-0">
          Capstone Anteraja Instant &bull; Purwarupa UI/UX (branch 7-prototype)
          &bull; Data contoh untuk keperluan demonstrasi.
        </p>
      </footer>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-[26rem] border-0 rounded-2xl bg-transparent p-0 backdrop:bg-[rgba(28,27,27,0.55)] backdrop:backdrop-blur-[4px]"
        id="login-modal"
        aria-labelledby="login-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <form
          className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-container-lowest shadow-2xl m-0"
          id="login-form"
          autoComplete="off"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
            <section className="flex items-center gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-magenta/10 text-brand-magenta"
                aria-hidden="true"
              >
                <MaterialIcon name="badge" className="text-[22px]" />
              </span>
              <section>
                <h2
                  id="login-title"
                  className="text-title-lg font-bold tracking-tight text-on-surface"
                >
                  Masuk Purwarupa
                </h2>
                <p className="text-[12px] text-on-surface-variant m-0">
                  {LABELS[role]}
                </p>
              </section>
            </section>
            <button
              className="grid size-8 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container"
              type="button"
              data-close-modal
              aria-label="Tutup dialog"
              onClick={close}
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
          </header>
          <section className="space-y-4 p-5">
            <p className="m-0">
              <label
                className="mb-2 block text-label-md uppercase tracking-wider text-on-surface-variant"
                htmlFor="login-name"
              >
                Nama / Username
              </label>
              <input
                ref={inputRef}
                className="h-12 w-full rounded-xl border border-border-subtle bg-surface-container-low px-3 text-body-md text-on-surface focus:border-brand-magenta focus:outline-none focus:ring-0"
                id="login-name"
                name="username"
                type="text"
                autoComplete="username"
                placeholder={DEFAULTS[role]}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </p>
            <p className="text-[12px] leading-relaxed text-on-surface-variant m-0">
              Identitas ini dipakai untuk menampilkan sapaan di halaman tujuan.
              Tidak ada data yang dikirim ke server.
            </p>
          </section>
          <footer className="flex items-center justify-end gap-3 border-t border-border-subtle bg-surface-container-low/40 p-5">
            <button
              className="inline-flex h-11 min-w-[7rem] items-center justify-center gap-2 rounded-xl bg-brand-magenta px-5 text-sm font-bold text-on-primary shadow-sm transition-all hover:bg-primary"
              id="btn-login"
              type="submit"
              disabled={busy}
              aria-busy={busy || undefined}
            >
              {busy ? (
                <>
                  <Spinner />
                  <span>Menghubungkan...</span>
                </>
              ) : (
                <>
                  <MaterialIcon name="login" className="text-[18px]" /> Masuk
                </>
              )}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
