#!/usr/bin/env node
/**
 * Sesi 3 — Data-Driven Regression Testing.
 *
 * The same script runs every scenario in `data/shipment-cases.json`: the test
 * data lives in the JSON file, the flows live in `lib/scenario-runner.mjs`, and
 * each scenario gets PASS/FAIL, screenshot evidence and a row in
 * `test-results.json`. Re-run it after any application change.
 *
 * Usage: node tests/automation/session-3-regression.mjs [id|category ...]
 */
import { readFileSync } from "node:fs";
import { config } from "./config.mjs";
import {
  buildResults,
  createRun,
  printSummary,
  writeResults,
} from "./lib/artifacts.mjs";
import { launchBrowser } from "./lib/browser.mjs";
import { runScenario } from "./lib/scenario-runner.mjs";

const casesFile = new URL("./data/shipment-cases.json", import.meta.url);
const payload = JSON.parse(readFileSync(casesFile, "utf8"));
const filters = process.argv.slice(2);

const scenarios = filters.length
  ? payload.scenarios.filter(
      (item) => filters.includes(item.id) || filters.includes(item.category),
    )
  : payload.scenarios;

if (scenarios.length === 0) {
  process.stderr.write(`No scenario matches ${filters.join(", ")}.\n`);
  process.exit(1);
}

const run = createRun("session-3");
process.stdout.write("\nSesi 3 — Data-Driven Regression Testing\n");
process.stdout.write(`Run      : ${run.id}\n`);
process.stdout.write(`App      : ${config.baseUrl}\n`);
process.stdout.write(`Scenarios: ${scenarios.length} (${payload.workflow})\n`);
process.stdout.write(
  "Setiap skenario di-reset dulu lewat 'php artisan demo:reset-shipments', " +
    "jadi suite ini bisa dijalankan ulang tanpa bersih-bersih manual.\n",
);

const browser = await launchBrowser();
const results = [];

for (const scenario of scenarios) {
  process.stdout.write(
    `\n▶ ${scenario.id} [${scenario.category}] — ${scenario.title}\n`,
  );
  const result = await runScenario(browser, scenario, run);
  results.push(result);
  process.stdout.write(`  ${result.status}\n`);
}

await browser.close();

const report = buildResults(run, results, {
  manualBaseline: payload.manualBaseline,
  filters: filters.length ? filters : null,
});
const file = writeResults(run, report);

printSummary(report);
process.stdout.write(`Artifacts: ${run.dir}\n`);
process.stdout.write(`  ${file.split("/").pop()} + ${"screenshots/"}\n`);

process.exit(report.summary.failed === 0 ? 0 : 1);
