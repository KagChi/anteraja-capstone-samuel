import { useCallback, useMemo, useState } from "react";
import AiInsightPanel from "./components/AiInsightPanel.jsx";
import HubDetailPanel from "./components/HubDetailPanel.jsx";
import HubList from "./components/HubList.jsx";
import HubMap from "./components/HubMap.jsx";
import KpiDashboard from "./components/KpiDashboard.jsx";
import PriorityFilter from "./components/PriorityFilter.jsx";
import StatusPanel from "./components/StatusPanel.jsx";
import TopHubList from "./components/TopHubList.jsx";
import { useHubData } from "./hooks/useHubData.js";
import {
  PRIORITY_RULES,
  SEVERITY_META,
  SEVERITY_ORDER,
  applyPriorityFilter,
  datasetStats,
  excludedLowSampleHubs,
  filterHubList,
  formatInteger,
  severityCounts,
  topHubsByMean,
} from "./lib/metrics.js";

const numberFormat = new Intl.NumberFormat("id-ID");
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default function App() {
  const { status, error, metrics, summary, views, reload } = useHubData();
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedHubId, setSelectedHubId] = useState(null);

  // Satu state filter dipakai bersama: peta memakai applyPriorityFilter, list memakai
  // filter yang sama ditambah pencarian teks.
  const mapHubs = useMemo(
    () => applyPriorityFilter(views, priorityOnly).filter((hub) => hub.has_coordinates),
    [views, priorityOnly],
  );
  const listHubs = useMemo(
    () => filterHubList(views, { priorityOnly, query }),
    [views, priorityOnly, query],
  );
  const topHubs = useMemo(() => topHubsByMean(views, 3), [views]);
  const excluded = useMemo(() => excludedLowSampleHubs(views, 3), [views]);
  const stats = useMemo(() => datasetStats(views), [views]);
  const priorityCount = useMemo(() => views.filter((hub) => hub.is_priority).length, [views]);
  const severity = useMemo(() => severityCounts(views), [views]);
  const selectedHub = useMemo(
    () => views.find((hub) => hub.hub_id === selectedHubId) ?? null,
    [views, selectedHubId],
  );
  const hubNameById = useMemo(() => new Map(views.map((hub) => [hub.hub_id, hub.hub_name])), [views]);
  const selectHub = useCallback((hubId) => setSelectedHubId(hubId), []);
  const generatedAt = metrics?.generated_at ? dateFormat.format(new Date(metrics.generated_at)) : null;

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__identity">
          <p className="app__eyebrow">Anteraja · Capstone Day 19</p>
          <h1 className="app__title">Hub Dwell Monitor</h1>
          <p className="app__subtitle">
            Pantau dwell time tiap hub, temukan hub prioritas investigasi, dan lihat sebaran
            lokasinya pada peta.
          </p>
        </div>
        <dl className="app__meta">
          <div>
            <dt>Sumber data</dt>
            <dd>{metrics?.source ?? "scan_events.csv Day 18"}</dd>
          </div>
          <div>
            <dt>Aturan prioritas</dt>
            <dd>{PRIORITY_RULES.label}</dd>
          </div>
        </dl>
      </header>

      <main className="app__main">
        {status === "loading" ? <StatusPanel variant="loading" /> : null}
        {status === "error" ? <StatusPanel variant="error" message={error} onRetry={reload} /> : null}
        {status === "empty" ? <StatusPanel variant="empty" /> : null}

        {status === "ready" ? (
          <>
            <KpiDashboard stats={stats} rules={PRIORITY_RULES} />

            <div className="toolbar">
              <div className="toolbar__row">
                <PriorityFilter
                  priorityOnly={priorityOnly}
                  onChange={setPriorityOnly}
                  totalCount={views.length}
                  priorityCount={priorityCount}
                />
                <p className="toolbar__count" data-testid="toolbar-count">
                  List: {numberFormat.format(listHubs.length)} hub · Peta:{" "}
                  {numberFormat.format(mapHubs.length)} marker
                </p>
              </div>
              <ul className="severity-strip" aria-label="Sebaran status keparahan hub">
                {SEVERITY_ORDER.map((id) => (
                  <li key={id}>
                    <span className={"legend-dot legend-dot--" + id} />
                    <strong>{SEVERITY_META[id].label}</strong>
                    <span className="severity-strip__count">{numberFormat.format(severity[id])}</span>
                    <span className="severity-strip__hint">{SEVERITY_META[id].hint}</span>
                  </li>
                ))}
              </ul>
            </div>

            <TopHubList
              hubs={topHubs}
              excluded={excluded}
              selectedHubId={selectedHubId}
              onSelect={selectHub}
            />

            <div className="layout">
              <HubMap hubs={mapHubs} selectedHub={selectedHub} onSelect={selectHub} />
              <div className="layout__side">
                <HubDetailPanel
                  hub={selectedHub}
                  onClose={() => setSelectedHubId(null)}
                  onFocus={selectHub}
                />
                <HubList
                  hubs={listHubs}
                  query={query}
                  onQueryChange={setQuery}
                  selectedHubId={selectedHubId}
                  onSelect={selectHub}
                  totalHubs={views.length}
                  priorityOnly={priorityOnly}
                />
              </div>
            </div>

            <AiInsightPanel summary={summary} hubNameById={hubNameById} />

            <footer className="app__footer">
              <span>
                {formatInteger(stats.completed_visits)} completed visits dari{" "}
                {formatInteger(stats.hub_count)} hub · metrics diperbarui {generatedAt ?? "-"}
              </span>
              <span>Basemap &copy; OpenStreetMap contributors · Dwelling dihitung per kunjungan paket</span>
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}
