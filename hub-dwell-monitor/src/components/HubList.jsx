import { SEVERITY_META, formatHours, formatInteger, severityFor } from "../lib/metrics.js";

export default function HubList({
  hubs,
  query,
  onQueryChange,
  selectedHubId,
  onSelect,
  totalHubs,
  priorityOnly,
}) {
  return (
    <section className="panel hub-list" aria-label="Hub list">
      <header className="panel__header">
        <h2 className="panel__title">Hub List</h2>
        <p className="panel__subtitle">
          {formatInteger(hubs.length)} dari {formatInteger(totalHubs)} hub tampil
          {priorityOnly ? " (filter: priority only)" : " (filter: all hubs)"}.
        </p>
      </header>

      <label className="search">
        <span className="search__label">Cari hub</span>
        <input
          type="search"
          className="search__input"
          value={query}
          placeholder="Cari nama, kode hub, atau kota…"
          onChange={(event) => onQueryChange(event.target.value)}
          data-testid="hub-search"
        />
      </label>

      {hubs.length === 0 ? (
        <p className="empty-inline" data-testid="hub-list-empty">
          Tidak ada hub yang cocok dengan pencarian &ldquo;{query}&rdquo;
          {priorityOnly ? " pada filter Priority Only" : ""}. Ubah kata kunci atau matikan filter
          prioritas.
        </p>
      ) : (
        <ul className="hub-rows" data-testid="hub-rows">
          {hubs.map((hub) => {
            const severity = hub.severity ?? severityFor(hub);
            return (
              <li key={hub.hub_id}>
                <button
                  type="button"
                  className={"hub-row" + (hub.hub_id === selectedHubId ? " is-selected" : "")}
                  onClick={() => onSelect(hub.hub_id)}
                  aria-pressed={hub.hub_id === selectedHubId}
                  data-testid={"hub-row-" + hub.hub_id}
                >
                  <span className="hub-row__top">
                    <span className="hub-row__name">{hub.hub_name}</span>
                    <span className={"badge badge--" + severity}>
                      {SEVERITY_META[severity].label}
                    </span>
                    <span className="hub-row__code">{hub.hub_id}</span>
                  </span>
                  <span className="hub-row__meta">
                    {hub.city}, {hub.province} · {formatInteger(hub.completed_visits)} kunjungan
                    selesai
                  </span>
                  <span className="hub-row__metrics">
                    <span>
                      dwell <strong>{formatHours(hub.mean_dwell_hours)}</strong>
                    </span>
                    <span>median {formatHours(hub.median_dwell_hours)}</span>
                    <span>
                      min {formatHours(hub.min_dwell_hours)} · max {formatHours(hub.max_dwell_hours)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

