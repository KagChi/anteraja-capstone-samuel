import { PRIORITY_RULES, SEVERITY_META, formatHours, formatInteger } from "../lib/metrics.js";

function TelemetryBar({ hub }) {
  const threshold = PRIORITY_RULES.minMeanDwellHours;
  const mean = hub.mean_dwell_hours ?? 0;
  const scale = Math.max(12, mean * 1.05, threshold * 2);
  const fillPercent = Math.min(100, (mean / scale) * 100);
  const thresholdPercent = Math.min(100, (threshold / scale) * 100);

  return (
    <div className="telemetry" data-testid="hub-telemetry">
      <p className="telemetry__title">Dwell time vs ambang prioritas {threshold} jam</p>
      <div className="telemetry__track">
        <span
          className={"telemetry__fill telemetry__fill--" + hub.severity}
          style={{ width: fillPercent + "%" }}
        />
        <span className="telemetry__threshold" style={{ left: thresholdPercent + "%" }} />
      </div>
      <div className="telemetry__scale">
        <span>0 jam</span>
        <span>ambang {threshold} jam</span>
        <span>
          aktual <strong>{formatHours(hub.mean_dwell_hours)}</strong>
        </span>
      </div>
    </div>
  );
}

export default function HubDetailPanel({ hub, onClose, onFocus }) {
  if (!hub) {
    return (
      <section className="panel hub-detail hub-detail--hint" aria-label="Hub detail">
        <h2 className="panel__title">Hub Detail</h2>
        <p className="panel__subtitle">
          Klik marker di peta atau baris di hub list untuk membuka detail dwell time.
        </p>
      </section>
    );
  }

  const severity = hub.severity;
  const rows = [
    { label: "Mean Dwell Time", value: formatHours(hub.mean_dwell_hours), strong: true },
    { label: "Median Dwell Time", value: formatHours(hub.median_dwell_hours) },
    { label: "Min Dwell Time", value: formatHours(hub.min_dwell_hours) },
    { label: "Max Dwell Time", value: formatHours(hub.max_dwell_hours) },
    { label: "P90 Dwell Time", value: formatHours(hub.p90_dwell_hours) },
    { label: "Completed Visits", value: formatInteger(hub.completed_visits) },
    {
      label: "Investigation Priority",
      value: hub.is_priority
        ? "Prioritas investigasi"
        : hub.sample_sufficient
          ? "Terpantau (di bawah ambang)"
          : "Sampel belum cukup",
      strong: hub.is_priority,
    },
    { label: "Ranking Mean Dwell", value: "#" + hub.mean_rank + " dari 12 hub" },
  ];

  return (
    <section className="panel hub-detail" aria-label="Hub detail" data-testid="hub-detail">
      <header className="panel__header hub-detail__header">
        <div>
          <h2 className="panel__title">{hub.hub_name}</h2>
          <p className="panel__subtitle">
            {hub.hub_id} · {hub.city}, {hub.province}
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup detail hub">
          ✕
        </button>
      </header>

      <div className="hub-detail__badges">
        <span className={"badge badge--" + severity}>
          {SEVERITY_META[severity]?.label ?? "Tanpa status"}
        </span>
        <span className="hub-detail__severity-hint">{SEVERITY_META[severity]?.hint}</span>
      </div>

      <TelemetryBar hub={hub} />

      <dl className="detail-grid">
        {rows.map((row) => (
          <div className="detail-grid__item" key={row.label}>
            <dt>{row.label}</dt>
            <dd className={row.strong ? "is-strong" : ""}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="hub-detail__actions">
        <button type="button" className="button" onClick={() => onFocus(hub.hub_id)}>
          Fokuskan di peta
        </button>
      </div>
    </section>
  );
}

