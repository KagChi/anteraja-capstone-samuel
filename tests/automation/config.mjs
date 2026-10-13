import { fileURLToPath } from "node:url";

/** Repository root, so every script can be started from anywhere. */
export const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function enabled(value, fallback) {
  if (value === undefined) return fallback;
  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

export const config = {
  repoRoot,
  baseUrl: process.env.AUTOMATION_BASE_URL ?? "http://127.0.0.1:8123",

  /** Demo courier seeded by the database seeders. */
  courier: {
    email:
      process.env.AUTOMATION_COURIER_EMAIL ??
      "budi.pratama@anteraja.example.com",
    password: process.env.AUTOMATION_COURIER_PASSWORD ?? "password",
  },

  headless: enabled(process.env.AUTOMATION_HEADLESS, true),
  /** Slows every Puppeteer action so a headed run can be followed by eye. */
  slowMo: Number(process.env.AUTOMATION_SLOWMO ?? 0),

  /** The courier app is a phone-sized PWA. */
  viewport: { width: 430, height: 932, deviceScaleFactor: 2 },
  timeoutMs: Number(process.env.AUTOMATION_TIMEOUT_MS ?? 30_000),

  artifactsRoot:
    process.env.AUTOMATION_ARTIFACTS ??
    `${repoRoot}/tests/automation/artifacts`,

  /**
   * `php artisan demo:reset-shipments` returns the demo shipments to their
   * seeded state, which is what makes the suite re-runnable. Set
   * AUTOMATION_RESET=0 to inspect a failure without touching the demo data.
   */
  reset: enabled(process.env.AUTOMATION_RESET, true),

  /** Google Fonts and the avatar service are aborted instead of stalling. */
  blockExternalAssets: enabled(process.env.AUTOMATION_BLOCK_EXTERNAL, true),
};
