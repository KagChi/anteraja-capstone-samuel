import { spawnSync } from "node:child_process";
import { config } from "../config.mjs";

/**
 * Puts the shipments a scenario touches back into their seeded state, which is
 * what makes the regression suite re-runnable: `demo:reset-shipments` clears
 * the POD, the exceptions, the GPS lock request and the flow events, and
 * re-issues the recipient PIN.
 */
export function resetShipments(trackings) {
  const keys = trackings.filter(Boolean);
  if (!config.reset || keys.length === 0) {
    return { skipped: true, output: null };
  }

  const result = spawnSync(
    "php",
    ["artisan", "demo:reset-shipments", ...keys],
    { cwd: config.repoRoot, encoding: "utf8" },
  );

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`demo:reset-shipments ${keys.join(" ")} failed: ${detail}`);
  }

  return { skipped: false, output: result.stdout.trim() };
}
