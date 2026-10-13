#!/usr/bin/env node
/**
 * Sesi 2 — Shipment End-to-End Automation.
 *
 * One scenario, executed end to end and then judged. Browser automation stops
 * after the last click; automated testing starts there and compares the
 * expected result from `data/shipment-cases.json` with what the app did:
 * Expected Result ↔ Actual Result → PASS / FAIL.
 *
 *   Open Form → Fill Shipment Data → Screenshot → Submit → Wait for Navigation
 *   → Open Request History → Verify Result
 *
 * Usage: node tests/automation/session-2-shipment-e2e.mjs [scenario-id]
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

const wanted = process.argv[2] ?? "happy-path-delivery";
const scenario = payload.scenarios.find((item) => item.id === wanted);
if (!scenario) {
  process.stderr.write(`Unknown scenario "${wanted}".`);
  process.exit(1);
}

const run = createRun("session-2");
process.stdout.write("\nSesi 2 — Shipment End-to-End Automation\n");
process.stdout.write(`Run      : ${run.id}\n`);
process.stdout.write(`Scenario : ${scenario.id} — ${scenario.title}\n`);
process.stdout.write(`App      : ${config.baseUrl}\n`);

process.stdout.write(
  "\nManual baseline (ditetapkan sebelum automation dibuat):\n",
);
for (const [index, line] of payload.manualBaseline.steps.entries()) {
  process.stdout.write(`  ${index + 1}. ${line}\n`);
}
process.stdout.write(
  `  Expected result: ${payload.manualBaseline.expectedResult}\n`,
);

const browser = await launchBrowser();
process.stdout.write("\nMenjalankan workflow di browser...\n");
const result = await runScenario(browser, scenario, run);
await browser.close();

const results = buildResults(run, [result], {
  manualBaseline: payload.manualBaseline,
});
const file = writeResults(run, results);

process.stdout.write(
  "\nBrowser automation selesai. Automated testing dimulai:",
);
process.stdout.write(" membandingkan expected result dengan actual result.\n");
printSummary(results);
process.stdout.write(
  `Artifacts: ${run.dir}\n  ${file.split("/").pop()} + screenshots/\n`,
);

process.exit(result.status === "PASS" ? 0 : 1);
