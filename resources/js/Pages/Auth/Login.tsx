import { Link, useForm } from "@inertiajs/react";
import { MaterialIcon } from "../../Components/MaterialIcon";
import { Button } from "../../Components/ui/Button";

export function LoginPage() {
  const form = useForm({ email: "", password: "", remember: true });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    form.post("/login", {
      onFinish: () => form.reset("password"),
    });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface-canvas px-5 font-sans text-on-surface antialiased">
      <main className="w-full max-w-[26rem]">
        <header className="mb-6 text-center">
          <img
            className="mx-auto h-7 w-auto"
            src="/logo-anteraja.png"
            alt="Anteraja"
          />
          <h1 className="mt-4 text-title-lg font-bold tracking-tight">
            Masuk Konsol Satria
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Gunakan akun kurir atau admin hub Anda.
          </p>
        </header>

        <form
          className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-6 shadow-card"
          onSubmit={submit}
          noValidate
        >
          <section className="space-y-4">
            <p className="m-0">
              <label
                className="mb-2 block text-label-md uppercase tracking-wider text-on-surface-variant"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="h-12 w-full rounded-xl border border-border-subtle bg-surface-container-low px-3 text-body-md text-on-surface focus:border-brand-magenta focus:outline-none focus:ring-0"
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={form.data.email}
                onChange={(event) => form.setData("email", event.target.value)}
                required
              />
              {form.errors.email ? (
                <span className="mt-1 block text-[12px] text-alert-amber">
                  {form.errors.email}
                </span>
              ) : null}
            </p>

            <p className="m-0">
              <label
                className="mb-2 block text-label-md uppercase tracking-wider text-on-surface-variant"
                htmlFor="password"
              >
                Kata Sandi
              </label>
              <input
                className="h-12 w-full rounded-xl border border-border-subtle bg-surface-container-low px-3 text-body-md text-on-surface focus:border-brand-magenta focus:outline-none focus:ring-0"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.data.password}
                onChange={(event) =>
                  form.setData("password", event.target.value)
                }
                required
              />
            </p>

            <label
              className="flex items-center gap-2 text-[13px] text-on-surface-variant"
              htmlFor="remember"
            >
              <input
                id="remember"
                type="checkbox"
                checked={form.data.remember}
                onChange={(event) =>
                  form.setData("remember", event.target.checked)
                }
              />
              Ingat saya
            </label>
          </section>

          <footer className="mt-6 flex items-center justify-between gap-3">
            <Link
              className="text-[13px] font-semibold text-on-surface-variant hover:text-brand-magenta"
              href="/"
            >
              Kembali
            </Link>
            <Button
              variant="primary"
              type="submit"
              busy={form.processing}
              busyText="Menghubungkan..."
              disabled={form.processing}
            >
              <MaterialIcon name="login" className="text-[18px]" /> Masuk
            </Button>
          </footer>
        </form>

        <section className="mt-4 rounded-xl border border-dashed border-border-subtle p-4 text-[12px] leading-relaxed text-on-surface-variant">
          <p className="m-0 font-semibold text-on-surface">Akun demo</p>
          <p className="m-0">Kurir — budi.pratama@anteraja.example.com</p>
          <p className="m-0">Admin — windy.kusuma@anteraja.example.com</p>
          <p className="m-0">Kata sandi untuk keduanya: password</p>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
