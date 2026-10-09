import { formatHours, formatInteger } from "../lib/metrics.js";

export default function TopHubList({ hubs, excluded, selectedHubId, onSelect }) {
  return (
    <section className="panel top-hubs" aria-label="Top 3 hub berdasarkan mean dwell time">
      <header className="panel__header">
        <h2 className="panel__title">Top 3 Hub — Mean Dwell Time</h2>
        <p className="panel__subtitle">
          Ranking memakai nilai numerik mentah dan hanya mempertimbangkan hub dengan minimal 100
          kunjungan selesai.
        </p>
      </header>

      {hubs.length === 0 ? (
        <p className="empty-inline">Belum ada hub dengan sampel cukup untuk di-ranking.</p>
      ) : (
        <ol className="top-hubs__list" data-testid="top-hubs">
          {hubs.map((hub, index) => (
            <li key={hub.hub_id}>
              <button
                type="button"
                className={"top-hub" + (hub.hub_id === selectedHubId ? " is-selected" : "")}
                onClick={() => onSelect(hub.hub_id)}
                aria-pressed={hub.hub_id === selectedHubId}
                data-testid={"top-hub-" + hub.hub_id}
              >
                <span className="top-hub__rank">#{index + 1}</span>
                <span className="top-hub__body">
                  <span className="top-hub__name">{hub.hub_name}</span>
                  <span className="top-hub__meta">
                    {hub.hub_id} · {hub.city} · {formatInteger(hub.completed_visits)} kunjungan ·
                    peringkat global #{hub.mean_rank}
                  </span>
                </span>
                <span className="top-hub__value">
                  <strong>{formatHours(hub.mean_dwell_hours)}</strong>
                  <small>median {formatHours(hub.median_dwell_hours)}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {excluded.length > 0 ? (
        <p className="panel__note">
          Dikecualikan dari Top 3:{" "}
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
