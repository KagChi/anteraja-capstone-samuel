import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8123";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry",
    // The courier POD flow requires a device position and an in-app camera.
    // Tests run with a mocked position at the demo destination and Chromium's
    // fake media device standing in for the phone camera.
    permissions: ["geolocation"],
    // A realistic accuracy keeps the FRD-06 fake-GPS gate clean; the blocked
    // spec overrides it with 0 (Playwright's default) on purpose.
    geolocation: {
      latitude: -6.175392,
      longitude: 106.827153,
      accuracy: 12,
    },
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
  reporter: [["list"]],
});
