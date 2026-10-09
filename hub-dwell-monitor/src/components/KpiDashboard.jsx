import { formatHours, formatInteger } from "../lib/metrics.js";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const ICONS = {
  hubs: (
    <svg {...svgProps}>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M12 12 4 8m8 4 8-4m-8 4v9" />
    </svg>
  ),
  visits: (
    <svg {...svgProps}>
      <path d="M3 8h18v9H3z" />
      <path d="M3 11.5h18" />
      <path d="M9 8V5.5h6V8" />
    </svg>
  ),
  mean: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  priority: (
    <svg {...svgProps}>
      <path d="M12 4 3.5 19.5h17L12 4Z" />
      <path d="M12 9.5v4.5m0 3h.01" />
    </svg>
  ),
};

export default function KpiDashboard({ stats, rules }) {
  const cards = [
    {
      key: "hubs",
      tone: "brand",
      label: "Total Hub",
      value: formatInteger(stats.hub_count),
      unit: "hub",
      hint: formatInteger(stats.mappable_hub_count) + " hub punya koordinat peta",
      icon: ICONS.hubs,
    },
    {
      key: "visits",
      tone: "teal",
      label: "Completed Visits",
      value: formatInteger(stats.completed_visits),
      unit: "kunjungan",
      hint: "pasangan ARRIVAL → DEPARTURE valid",
      icon: ICONS.visits,
    },
    {
      key: "mean",
      tone: "amber",
      label: "Global Mean Dwell",
      value: formatHours(stats.mean_dwell_hours, { withUnit: false }),
      unit: "jam",
      hint: "berbobot completed visits, open visit dikecualikan",
      icon: ICONS.mean,
    },
    {
      key: "priority",
      tone: "critical",
      label: "Priority Hub",
      value: formatInteger(stats.priority_hub_count),
      unit: "hub",
      hint: rules.label,
      icon: ICONS.priority,
    },
  ];

  return (
    <section className="panel kpi" data-testid="kpi-grid" aria-label="Global KPI">
      <div className="kpi__grid">
        {cards.map((card) => (
          <article className={"kpi-card kpi-card--" + card.tone} key={card.key}>
            <span className="kpi-card__icon">{card.icon}</span>
            <p className="kpi-card__label">{card.label}</p>
            <p className="kpi-card__value" data-testid={"kpi-" + card.key}>
              {card.value}
              <span className="kpi-card__unit">{card.unit}</span>
            </p>
            <p className="kpi-card__hint">{card.hint}</p>
          </article>
        ))}
      </div>
      <p className="kpi__note">
        <span className="kpi__note-dot" aria-hidden="true" />
        {rules.disclaimer}
      </p>
    </section>
  );
}

