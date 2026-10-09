export default function StatusPanel({ variant, message, onRetry }) {
  if (variant === "loading") {
    return (
      <section className="panel status" data-testid="state-loading" aria-live="polite">
        <div className="status__spinner" aria-hidden="true" />
        <div>
          <h2 className="panel__title">Memuat data hub…</h2>
          <p className="panel__subtitle">Mengambil metrics.json, locations.json, dan ai-summary.json.</p>
        </div>
      </section>
    );
  }

  if (variant === "error") {
    return (
      <section className="panel status status--error" data-testid="state-error" role="alert">
        <div>
          <h2 className="panel__title">Gagal memuat data</h2>
          <p className="panel__subtitle">{message ?? "Terjadi kesalahan yang tidak diketahui."}</p>
        </div>
        <button type="button" className="button" onClick={onRetry}>
          Coba lagi
        </button>
      </section>
    );
  }

  return (
    <section className="panel status status--empty" data-testid="state-empty">
      <div>
        <h2 className="panel__title">Data hub belum tersedia</h2>
        <p className="panel__subtitle">
          metrics.json tidak memuat hub. Pastikan pipeline data Day 18 sudah dijalankan ulang
          (npm run data:build) sebelum memantau dwell time.
        </p>
      </div>
    </section>
  );
}

