export default function AiInsightPanel({ summary, hubNameById }) {
  if (!summary) return null;
  const priorityHubs = Array.isArray(summary.priority_hubs) ? summary.priority_hubs : [];
  const nextChecks = Array.isArray(summary.next_checks) ? summary.next_checks : [];

  return (
    <section className="panel ai" aria-label="Ringkasan AI" data-testid="ai-panel">
      <header className="ai__head">
        <span className="ai__avatar" aria-hidden="true">
          AI
        </span>
        <div>
          <h2 className="panel__title">Ringkasan AI — Structured Output</h2>
          <p className="panel__hint">
            {summary.model ?? "model tidak diketahui"} · prompt {summary.prompt_version ?? "-"} ·
            ditampilkan sebagai teks, tidak dieksekusi
          </p>
        </div>
      </header>

      <p className="ai__summary">{summary.summary}</p>

      <div className="ai__grid">
        <div className="ai__block">
          <h3 className="ai__label">priority_hubs ({priorityHubs.length})</h3>
          {priorityHubs.length === 0 ? (
            <p className="ai__empty">Tidak ada hub prioritas pada data ini.</p>
          ) : (
            <ul className="ai__chips">
              {priorityHubs.map((hubId) => (
                <li key={hubId}>
                  <span className="hub-chip">
                    <strong>{hubId}</strong>
                    {hubNameById.get(hubId) ? <em>{hubNameById.get(hubId)}</em> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ai__block">
          <h3 className="ai__label">next_checks</h3>
          <ol className="ai__list">
            {nextChecks.map((item) => (
              <li key={item}>
                <span className="ai__check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

