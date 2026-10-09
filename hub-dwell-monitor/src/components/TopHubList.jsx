import {
  SEVERITY_META,
  barPercent,
  formatHours,
  formatInteger,
  severityFor,
} from "../lib/metrics.js";

export default function TopHubList({ hubs, excluded, selectedHubId, onSelect, scale }) {
  return (
    <section className="panel top-hubs" aria-label="Top 3 hub berdasarkan mean dwell time">
      <header className="panel__head">
        <h2 className="panel__title">
          <span className="panel__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="8.5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="1" />
            </svg>
          </span>
          Top 3 Hub — Mean Dwell Time
        </h2>
        <p className="panel__hint">Ranking nilai mentah · minimal 100 kunjungan selesai</p>
      </header>

      {hubs.length === 0 ? (
        <p className="empty-inline">Belum ada hub dengan sampel cukup untuk di-ranking.</p>
      ) : (
        <ol className="top-hubs__list" data-testid="top-hubs">
          {hubs.map((hub, index) => {
            const severity = hub.severity ?? severityFor(hub);
            const selected = hub.hub_id === selectedHubId;
            return (
              <li key={hub.hub_id}>
                <button
                  type="button"
                  className={"top-card" + (selected ? " is-selected" : "")}
                  onClick={() => onSelect(hub.hub_id)}
                  aria-pressed={selected}
                  data-testid={"top-hub-" + hub.hub_id}
                >
                  <span className="top-card__rank">{index + 1}</span>
                  <span className="top-card__body">
                    <span className="top-card__name">{hub.hub_name}</span>
                    <span className="top-card__meta">
                      {hub.hub_id} · {hub.city} · {formatInteger(hub.completed_visits)} kunjungan
                    </span>
                    <span className={"status status--" + severity}>
                      <i aria-hidden="true" />
                      {SEVERITY_META[severity].label}
                    </span>
                  </span>
                  <span className="top-card__value">
                    <strong>{formatHours(hub.mean_dwell_hours, { withUnit: false, decimals: 1 })}</strong>
                    <em>jam</em>
                  </span>
                  <span className="top-card__bar" aria-hidden="true">
                    <i style={{ width: barPercent(hub.mean_dwell_hours, scale) + "%" }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {excluded.length > 0 ? (
        <p className="callout callout--info">
          <strong>Dikecualikan dari Top 3:</strong>{" "}
          {excluded
            .map(
              (hub) =>
                hub.hub_name +
                " (" +
                formatHours(hub.mean_dwell_hours) +
                ", hanya " +
                formatInteger(hub.completed_visits) +
                " kunjungan)",
            )
            .join(", ")}{" "}
          — sampel belum cukup untuk menetapkan prioritas investigasi.
        </p>
      ) : null}
    </section>
  );
}

