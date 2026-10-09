import { formatHours, formatInteger } from "../lib/metrics.js";

export default function KpiDashboard({ stats, rules }) {
  const cards = [
    {
      key: "hubs",
      label: "Total Hub",
      value: formatInteger(stats.hub_count),
      hint: formatInteger(stats.mappable_hub_count) + " hub punya koordinat peta",
    },
    {
      key: "visits",
      label: "Completed Visits",
      value: formatInteger(stats.completed_visits),
      hint: "pasangan ARRIVAL → DEPARTURE valid",
    },
    {
      key: "mean",
      label: "Global Mean Dwell Time",
      value: formatHours(stats.mean_dwell_hours),
      hint: "berbobot completed visits, open visit dikecualikan",
    },
    {
      key: "priority",
      label: "Priority Hub Count",
      value: formatInteger(stats.priority_hub_count),
      hint: rules.label,
    },
  ];

  return (
    <section className="panel kpi" data-testid="kpi-grid" aria-label="Global KPI">
      <div className="kpi__grid">
        {cards.map((card) => (
          <article className="kpi__card" key={card.key}>
            <p className="kpi__label">{card.label}</p>
            <p className="kpi__value" data-testid={"kpi-" + card.key}>
              {card.value}
            </p>
            <p className="kpi__hint">{card.hint}</p>
          </article>
        ))}
      </div>
      <p className="kpi__note">{rules.disclaimer}</p>
    </section>
  );
}

