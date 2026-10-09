#!/usr/bin/env node
/**
 * screenshots.mjs - mengambil screenshot desain (stitch v1/v2) dan aplikasi (desktop/mobile).
 *
 * Pakai: jalankan dev server lebih dulu, lalu:
 *   npm run shots                       # BASE_URL default http://localhost:5173
 *   BASE_URL=http://localhost:5173 npm run shots
 *
 * Hasil di folder screenshots/ + screenshots/console-report.json (bukti console bersih).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const OUT_DIR = resolve(root, "screenshots");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

const DESKTOP = { width: 1440, height: 1024 };
const MOBILE = { width: 390, height: 844 };

const issues = [];

async function capture(browser, options) {
  const { name, viewport, url, waitFor, prepare, fullPage = true, settle = 1200 } = options;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("console", (message) => {
    const type = message.type();
    if (type !== "error" && type !== "warning") return;
    const text = message.text();
    if (/favicon|net::ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION)/i.test(text)) return;
    issues.push({ shot: name, type, text });
  });
  page.on("pageerror", (error) => issues.push({ shot: name, type: "pageerror", text: String(error) }));

  await page.goto(url, { waitUntil: "load" });
  if (waitFor) {
    await page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => {
      issues.push({ shot: name, type: "timeout", text: "selector tidak muncul: " + waitFor });
    });
  }
  if (prepare) await prepare(page);
  if (settle > 0) await page.waitForTimeout(settle);
  await page.screenshot({ path: resolve(OUT_DIR, name), fullPage });
  await context.close();
  console.log("screenshot -> screenshots/" + name);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const fileUrl = (relative) => pathToFileURL(resolve(root, relative)).href;

  // 1. Mockup desain lokal (spesifikasi desktop 1440 + catatan iterasi v1 -> v2).
  //    screenshots/stitch-v1.png dan stitch-v2.png adalah tangkapan layar Stitch dari desainer.
  await capture(browser, { name: "mockup-desktop-v1.png", viewport: { width: 1440, height: 1200 }, url: fileUrl("design/stitch-v1.html"), settle: 400 });
  await capture(browser, { name: "mockup-desktop-v2.png", viewport: { width: 1440, height: 1500 }, url: fileUrl("design/stitch-v2.html"), settle: 400 });

  // 2. Aplikasi - desktop 1440.
  await capture(browser, { name: "desktop.png", viewport: DESKTOP, url: BASE_URL + "/", waitFor: "[data-testid=\"kpi-grid\"]" });
  await capture(browser, {
    name: "desktop-priority-only.png",
    viewport: DESKTOP,
    url: BASE_URL + "/",
    waitFor: "[data-testid=\"kpi-grid\"]",
    prepare: async (page) => {
      await page.click("[data-testid=\"filter-priority\"]");
      await page.waitForTimeout(500);
    },
  });
  await capture(browser, {
    name: "desktop-hub-detail.png",
    viewport: DESKTOP,
    url: BASE_URL + "/",
    waitFor: "[data-testid=\"hub-row-HUB_MKS\"]",
    prepare: async (page) => {
      await page.click("[data-testid=\"hub-row-HUB_MKS\"]");
      await page.waitForSelector("[data-testid=\"hub-detail\"]");
      await page.waitForTimeout(1600);
    },
  });
  await capture(browser, {
    name: "desktop-search.png",
    viewport: DESKTOP,
    url: BASE_URL + "/",
    waitFor: "[data-testid=\"hub-search\"]",
    prepare: async (page) => {
      await page.fill("[data-testid=\"hub-search\"]", "jawa");
      await page.waitForTimeout(300);
    },
  });

  // 3. Application state: loading, empty, error.
  await capture(browser, { name: "desktop-state-loading.png", viewport: DESKTOP, url: BASE_URL + "/?state=loading", waitFor: "[data-testid=\"state-loading\"]", settle: 400 });
  await capture(browser, { name: "desktop-state-empty.png", viewport: DESKTOP, url: BASE_URL + "/?state=empty", waitFor: "[data-testid=\"state-empty\"]", settle: 400 });
  await capture(browser, { name: "desktop-state-error.png", viewport: DESKTOP, url: BASE_URL + "/?state=error", waitFor: "[data-testid=\"state-error\"]", settle: 400 });

  // 4. Aplikasi - mobile 390.
  await capture(browser, { name: "mobile.png", viewport: MOBILE, url: BASE_URL + "/", waitFor: "[data-testid=\"kpi-grid\"]" });
  await capture(browser, {
    name: "mobile-hub-detail.png",
    viewport: MOBILE,
    url: BASE_URL + "/",
    waitFor: "[data-testid=\"hub-row-HUB_MKS\"]",
    prepare: async (page) => {
      await page.click("[data-testid=\"hub-row-HUB_MKS\"]");
      await page.waitForSelector("[data-testid=\"hub-detail\"]");
      await page.waitForTimeout(1500);
    },
  });

  await browser.close();

  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    console_issues: issues,
    ok: issues.filter((issue) => issue.type === "error" || issue.type === "pageerror").length === 0,
  };
  writeFileSync(resolve(OUT_DIR, "console-report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log("console issues:", issues.length);
  issues.forEach((issue) => console.log("  [" + issue.type + "] " + issue.shot + ": " + issue.text.slice(0, 200)));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
