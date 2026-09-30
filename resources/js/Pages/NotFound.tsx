import { router } from "@inertiajs/react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { MaterialIcon } from "../Components/MaterialIcon";
import { Button } from "../Components/ui/Button";
import { useShipmentContext } from "../Contexts/ShipmentContext";
import { useToast } from "../Contexts/ToastContext";
import { useSeo } from "../Hooks/useSeo";
import { MainLayout } from "../Layouts/MainLayout";

export function NotFoundPage() {
  useSeo("/404");
  const toast = useToast();
  const { getShipmentById } = useShipmentContext();
  const [query, setQuery] = useState("");

  function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = query.trim();
    if (!code) {
      toast("Masukkan nomor resi terlebih dahulu.", "error");
      return;
    }
    const found = getShipmentById(code);
    if (!found) {
      toast(`Resi tidak ditemukan: ${code}`, "error");
      return;
    }
    router.visit(`/shipments/${found.id}`);
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-14 text-center">
      <p
        className="m-0 text-[64px] font-extrabold leading-none tracking-tight text-brand-magenta"
        aria-hidden="true"
      >
        404
      </p>
      <h1 className="text-[20px] font-bold tracking-tight text-on-surface">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-on-surface-variant">
        Alamat yang Anda tuju tidak tersedia. Anda bisa kembali ke beranda atau
        melacak nomor resi langsung dari sini.
      </p>

      <form
        className="mt-1 flex w-full max-w-sm items-center gap-2"
        onSubmit={track}
      >
        <label className="relative block flex-1">
          <span className="sr-only">Cari nomor resi</span>
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
          />
          <input
            className="h-11 w-full rounded-xl border border-border-subtle bg-surface-container-low pl-9 pr-3 text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-brand-magenta focus:outline-none focus:ring-0"
            type="search"
            placeholder="Lacak nomor resi..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button type="submit" variant="primary" className="h-11 shrink-0">
          Lacak
        </Button>
      </form>

      <p className="m-0 flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button as="link" to="/courier/tugas" variant="outline" size="sm">
          <MaterialIcon name="two_wheeler" className="text-[16px]" /> Mode Kurir
        </Button>
        <Button as="link" to="/shipments" variant="textNeutral" size="sm">
          Daftar Resi{" "}
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Button>
      </p>
    </div>
  );
}

export default NotFoundPage;
NotFoundPage.layout = (page: ReactNode) => <MainLayout>{page}</MainLayout>;
