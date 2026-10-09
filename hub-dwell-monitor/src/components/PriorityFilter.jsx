export default function PriorityFilter({ priorityOnly, onChange, totalCount, priorityCount }) {
  return (
    <div className="filter" role="group" aria-label="Priority filter">
      <span className="filter__label">Priority filter</span>
      <div className="filter__options">
        <button
          type="button"
          className={"chip" + (priorityOnly ? "" : " is-active")}
          aria-pressed={!priorityOnly}
          onClick={() => onChange(false)}
          data-testid="filter-all"
        >
          All Hubs <span className="chip__count">{totalCount}</span>
        </button>
        <button
          type="button"
          className={"chip" + (priorityOnly ? " is-active" : "")}
          aria-pressed={priorityOnly}
          onClick={() => onChange(true)}
          data-testid="filter-priority"
        >
          Priority Only <span className="chip__count">{priorityCount}</span>
        </button>
      </div>
      <p className="filter__hint">Filter ini dipakai bersama oleh hub list dan Leaflet map.</p>
    </div>
  );
}

