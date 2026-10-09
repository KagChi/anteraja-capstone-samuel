const ICONS = {
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 4 3.5 19.5h17L12 4Z" />
      <path d="M12 10v4.5m0 3h.01" />
    </svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
      <path d="M9 12h6" />
    </svg>
  ),
};

export default function StatusPanel({ variant, message, onRetry }) {
  if (variant === "loading") {
    return (
      <section className="panel state-panel" data-testid="state-loading" aria-live="polite">
        <div className="state-panel__row">
          <span className="state-panel__spinner" aria-hidden="true" />
          <div>
            <h2 className="panel__title">Memuat data hub…</h2>
            <p className="panel__hint">
              Mengambil metrics.json, locations.json, dan ai-summary.json.
            </p>
          </div>
        </div>
        <div className="skeleton" aria-hidden="true">
          <span /> <span /> <span /> <span />
        </div>
      </section>
    );
  }

  if (variant === "error") {
    return (
      <section className="panel state-panel state-panel--error" data-testid="state-error" role="alert">
        <div className="state-panel__row">
          <span className="state-panel__icon">{ICONS.error}</span>
          <div>
            <h2 className="panel__title">Gagal memuat data</h2>
            <p className="panel__hint">{message ?? "Terjadi kesalahan yang tidak diketahui."}</p>
          </div>
        </div>
        <button type="button" className="button" onClick={onRetry}>
          Coba lagi
        </button>
      </section>
    );
  }

  return (
    <section className="panel state-panel state-panel--empty" data-testid="state-empty">
      <div className="state-panel__row">
        <span className="state-panel__icon">{ICONS.empty}</span>
        <div>
          <h2 className="panel__title">Data hub belum tersedia</h2>
          <p className="panel__hint">
            metrics.json tidak memuat hub. Jalankan ulang pipeline data
            (npm run data:build) sebelum memantau dwell time.
          </p>
        </div>
      </div>
    </section>
  );
}
