export default function AiInsightPanel({ summary, hubNameById }) {
  if (!summary) return null;
  const priorityHubs = Array.isArray(summary.priority_hubs) ? summary.priority_hubs : [];
  const nextChecks = Array.isArray(summary.next_checks) ? summary.next_checks : [];

  return (
    <section className="panel ai" aria-label="AI summary" data-testid="ai-panel">
      <header className="panel__header">
        <h2 className="panel__title">AI Summary — Structured Output</h2>
        <p className="panel__subtitle">
          Ringkasan dan rekomendasi ditampilkan sebagai teks biasa (tidak dieksekusi). Sumber:{" "}
          {summary.model ?? "tidak diketahui"} · prompt {summary.prompt_version ?? "-"}.
        </p>
      </header>

      <p className="ai__summary">{summary.summary}</p>

      <div className="ai__columns">
        <div>
          <h3 className="ai__heading">priority_hubs</h3>
          {priorityHubs.length === 0 ? (
            <p className="ai__empty">Tidak ada hub prioritas pada data ini.</p>
          ) : (
            <ul className="ai__chips">
              {priorityHubs.map((hubId) => (
                <li key={hubId}>
                  <span className="chip chip--static">
                    {hubId}
                    {hubNameById.get(hubId) ? " · " + hubNameById.get(hubId) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="ai__heading">next_checks</h3>
          <ol className="ai__list">
            {nextChecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

