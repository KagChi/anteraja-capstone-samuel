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
  dwellScale,
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
  const severity = useMemo(() => severityCounts(views), [views]);
  const scale = useMemo(() => dwellScale(views), [views]);
  const priorityCount = useMemo(() => views.filter((hub) => hub.is_priority).length, [views]);
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
        <div className="app__brand">
          <span className="app__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
          </span>
          <div>
            <p className="app__eyebrow">Anteraja · Capstone Day 19</p>
            <h1 className="app__title">Hub Dwell Monitor</h1>
            <p className="app__subtitle">
              Pantau dwell time tiap hub, temukan hub prioritas investigasi, dan lihat sebaran
              lokasinya pada peta.
            </p>
          </div>
        </div>

        <ul className="app__chips">
          <li>
            <span>Sumber data</span>
            <strong>scan_events · Day 18</strong>
          </li>
          <li>
            <span>Aturan prioritas</span>
            <strong>mean ≥ 6 jam &amp; ≥ 100 kunjungan</strong>
          </li>
          <li>
            <span>Metrics diperbarui</span>
            <strong>{generatedAt ?? "—"}</strong>
          </li>
        </ul>
      </header>

      <main className="app__main">
        {status === "loading" ? <StatusPanel variant="loading" /> : null}
        {status === "error" ? <StatusPanel variant="error" message={error} onRetry={reload} /> : null}
        {status === "empty" ? <StatusPanel variant="empty" /> : null}

        {status === "ready" ? (
          <>
            <KpiDashboard stats={stats} rules={PRIORITY_RULES} />

            <section className="panel toolbar" aria-label="Filter dan ringkasan status">
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
                    <span className={"legend-chip legend-chip--" + id}>
                      <i aria-hidden="true" />
                      <b>{numberFormat.format(severity[id])}</b>
                      {SEVERITY_META[id].label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <TopHubList
              hubs={topHubs}
              excluded={excluded}
              selectedHubId={selectedHubId}
              onSelect={selectHub}
              scale={scale}
            />

            <div className="layout">
              <HubMap hubs={mapHubs} selectedHub={selectedHub} onSelect={selectHub} />
              <div className="layout__side">
                <HubDetailPanel
                  hub={selectedHub}
                  onClose={() => setSelectedHubId(null)}
                  onFocus={selectHub}
                  totalVisits={stats.completed_visits}
                />
                <HubList
                  hubs={listHubs}
                  query={query}
                  onQueryChange={setQuery}
                  selectedHubId={selectedHubId}
                  onSelect={selectHub}
                  totalHubs={views.length}
                  priorityOnly={priorityOnly}
                  scale={scale}
                />
              </div>
            </div>

            <AiInsightPanel summary={summary} hubNameById={hubNameById} />

            <footer className="app__footer">
              <span>
                {formatInteger(stats.completed_visits)} completed visits dari{" "}
                {formatInteger(stats.hub_count)} hub · pipeline: scan_events → metrics.json
              </span>
              <span>
                Basemap © OpenStreetMap contributors · ambang 6 jam = aturan simulasi latihan
              </span>
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}

