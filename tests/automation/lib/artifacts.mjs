import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "../config.mjs";

/**
 * Every run gets its own folder: `test-results.json` plus the screenshots the
 * scenarios captured, so evidence from two runs never overwrite each other.
 */
export function createRun(session) {
  const startedAt = new Date();
  const stamp = startedAt.toISOString().slice(0, 19).replace(/[:]/g, "-");
  const id = `${stamp}-${session}`;
  const dir = path.join(config.artifactsRoot, id);
  const screenshotsDir = path.join(dir, "screenshots");

  mkdirSync(screenshotsDir, { recursive: true });

  return { id, dir, screenshotsDir, session, startedAt };
}

export function buildResults(run, scenarios, extra = {}) {
  const finishedAt = new Date();
  const passed = scenarios.filter((item) => item.status === "PASS").length;

  return {
    suite: "Anteraja Shipment Request — Regression Test",
    session: run.session,
    runId: run.id,
    baseUrl: config.baseUrl,
    gitCommit: gitCommit(),
    startedAt: run.startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt - run.startedAt,
    summary: {
      total: scenarios.length,
      passed,
      failed: scenarios.length - passed,
    },
    scenarios,
    ...extra,
  };
}

export function writeResults(run, results) {
  const file = path.join(run.dir, "test-results.json");
  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  return file;
}

export function printSummary(results) {
  const lines = [""];

  for (const scenario of results.scenarios) {
    lines.push(
      `${scenario.status}  ${scenario.id} (${scenario.category}, ` +
        `${scenario.durationMs} ms)`,
    );
    for (const check of scenario.checks) {
      const mark = check.status === "PASS" ? "  ok  " : "  fail";
      lines.push(
        `${mark} ${check.name}: expected ${JSON.stringify(check.expected)}, ` +
          `got ${JSON.stringify(check.actual)}`,
      );
    }
    if (scenario.error) lines.push(`       error: ${scenario.error}`);
  }

  lines.push(
    "",
    `${results.summary.passed}/${results.summary.total} scenarios passed`,
    "",
  );

  process.stdout.write(`${lines.join("\n")}\n`);
}

function gitCommit() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: config.repoRoot,
    encoding: "utf8",
  });

  return result.status === 0 ? result.stdout.trim() : null;
}
