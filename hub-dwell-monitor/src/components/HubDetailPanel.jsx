import {
  PRIORITY_RULES,
  SEVERITY_META,
  formatHours,
  formatInteger,
  formatPercent,
  shareOfVisits,
} from "../lib/metrics.js";

function TelemetryBar({ hub }) {
  const threshold = PRIORITY_RULES.minMeanDwellHours;
  const mean = hub.mean_dwell_hours ?? 0;
  const scale = Math.max(12, mean * 1.05, threshold * 2);
  const fillPercent = Math.min(100, (mean / scale) * 100);
  const thresholdPercent = Math.min(100, (threshold / scale) * 100);
  const delta = mean - threshold;

  return (
    <div className="telemetry" data-testid="hub-telemetry">
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
          {delta >= 0 ? "+" : ""}
          {formatHours(delta, { decimals: 1 })} dari ambang
        </span>
      </div>
    </div>
  );
}

export default function HubDetailPanel({ hub, onClose, onFocus, totalVisits }) {
  if (!hub) {
    return (
      <section className="panel hub-detail hub-detail--empty" aria-label="Hub detail">
        <header className="panel__head">
          <h2 className="panel__title">
            <span className="panel__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 8.5v4l2.5 1.5" />
              </svg>
            </span>
            Hub Detail
          </h2>
        </header>
        <p className="hub-detail__hint">
          Klik marker di peta atau baris di hub list untuk membuka detail dwell time hub.
        </p>
      </section>
    );
  }

  const severity = hub.severity;
  const meta = SEVERITY_META[severity];
  const share = shareOfVisits(hub, totalVisits);

  const metrics = [
    { label: "Median", value: formatHours(hub.median_dwell_hours) },
    { label: "Min", value: formatHours(hub.min_dwell_hours) },
    { label: "Max", value: formatHours(hub.max_dwell_hours) },
    { label: "P90", value: formatHours(hub.p90_dwell_hours) },
    { label: "Completed Visits", value: formatInteger(hub.completed_visits) },
    {
      label: "Porsi Kunjungan",
      value: share === null ? "—" : formatPercent(share),
    },
  ];

  return (
    <section
      className={"panel hub-detail hub-detail--" + severity}
      aria-label="Hub detail"
      data-testid="hub-detail"
    >
      <header className="hub-detail__head">
        <div className="hub-detail__ident">
          <span className={"status status--" + severity}>
            <i aria-hidden="true" />
            {meta?.label ?? "Tanpa status"}
          </span>
          <h2 className="hub-detail__name">{hub.hub_name}</h2>
          <p className="hub-detail__sub">
            {hub.hub_id} · {hub.city}, {hub.province} · peringkat #{hub.mean_rank} dari 12
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup detail hub">
          ✕
        </button>
      </header>

      <div className="hub-detail__hero">
        <div>
          <p className="hero__label">Mean dwell time</p>
          <p className="hero__value">
            {formatHours(hub.mean_dwell_hours, { withUnit: false })}
            <span>jam</span>
          </p>
        </div>
        <p className={"hero__badge hero__badge--" + severity}>
          {hub.is_priority ? "Prioritas investigasi" : meta?.hint}
        </p>
      </div>

      <TelemetryBar hub={hub} />

      <dl className="metric-grid">
        {metrics.map((item) => (
          <div className="metric-grid__item" key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <button type="button" className="button button--block" onClick={() => onFocus(hub.hub_id)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
        </svg>
        Fokuskan di peta
      </button>
    </section>
  );
}

