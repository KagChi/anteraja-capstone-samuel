import {
  SEVERITY_META,
  barPercent,
  formatHours,
  formatInteger,
  severityFor,
} from "../lib/metrics.js";

export default function HubList({
  hubs,
  query,
  onQueryChange,
  selectedHubId,
  onSelect,
  totalHubs,
  priorityOnly,
  scale,
}) {
  return (
    <section className="panel hub-list" aria-label="Hub list">
      <header className="panel__head">
        <h2 className="panel__title">
          <span className="panel__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </span>
          Hub List
        </h2>
        <p className="panel__hint">
          {formatInteger(hubs.length)}/{formatInteger(totalHubs)} hub
          {priorityOnly ? " · priority only" : " · all hubs"}
        </p>
      </header>

      <label className="search">
        <span className="search__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
        </span>
        <span className="sr-only">Cari hub</span>
        <input
          type="search"
          className="search__input"
          value={query}
          placeholder="Cari hub, kode, atau kota…"
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
            const selected = hub.hub_id === selectedHubId;
            return (
              <li key={hub.hub_id}>
                <button
                  type="button"
                  className={"hub-row" + (selected ? " is-selected" : "")}
                  onClick={() => onSelect(hub.hub_id)}
                  aria-pressed={selected}
                  data-testid={"hub-row-" + hub.hub_id}
                >
                  <span className="hub-row__head">
                    <span className="hub-row__name">{hub.hub_name}</span>
                    <span className={"status status--" + severity}>
                      <i aria-hidden="true" />
                      {SEVERITY_META[severity].label}
                    </span>
                  </span>
                  <span className="hub-row__sub">
                    {hub.hub_id} · {hub.city}
                  </span>
                  <span className="hub-row__stats">
                    <span className="hub-row__dwell">
                      {formatHours(hub.mean_dwell_hours, { withUnit: false, decimals: 1 })}
                      <em>jam</em>
                    </span>
                    <span className="hub-row__extra">
                      median {formatHours(hub.median_dwell_hours, { withUnit: false, decimals: 1 })} jam ·{" "}
                      {formatInteger(hub.completed_visits)} kunjungan
                    </span>
                  </span>
                  <span className="hub-row__bar" aria-hidden="true">
                    <i style={{ width: barPercent(hub.mean_dwell_hours, scale) + "%" }} />
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

