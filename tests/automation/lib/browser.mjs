import puppeteer from "puppeteer";
import { config } from "../config.mjs";

/**
 * Chrome's fake capture device stands in for the phone camera and the fake UI
 * answers the permission prompt, so the POD step runs unattended.
 */
const LAUNCH_ARGS = [
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
  "--hide-scrollbars",
  "--mute-audio",
];

export function launchBrowser() {
  return puppeteer.launch({
    headless: config.headless,
    args: LAUNCH_ARGS,
    slowMo: config.slowMo || undefined,
    defaultViewport: null,
  });
}

/**
 * One isolated browser context per scenario: its own cookies, its own
 * location permission and its own mocked position.
 */
export async function openSession(browser) {
  const context = await browser.createBrowserContext();
  await context.overridePermissions(new URL(config.baseUrl).origin, [
    "geolocation",
    "camera",
  ]);

  const page = await context.newPage();
  await page.setViewport(config.viewport);
  await page.setDefaultTimeout(config.timeoutMs);
  await page.setDefaultNavigationTimeout(config.timeoutMs);

  const consoleOutput = recordConsole(page);
  if (config.blockExternalAssets) await blockExternalAssets(page);

  return { context, page, console: consoleOutput };
}

export async function setPosition(page, position) {
  await page.setGeolocation(position);
}

/**
 * Records what the page reports while a scenario runs, so a failure carries the
 * browser-side evidence with it.
 */
function recordConsole(page) {
  const messages = [];
  const errors = [];

  page.on("console", (message) => {
    const type = message.type();
    if (type !== "error" && type !== "warning") return;
    messages.push({ type, text: message.text() });
  });
  page.on("pageerror", (error) => {
    errors.push(error instanceof Error ? error.message : String(error));
  });

  return { messages, errors };
}

/**
 * The suite must not depend on Google Fonts, an avatar service or a region
 * upstream, so every off-origin request is aborted. Everything the app serves
 * itself passes through.
 */
async function blockExternalAssets(page) {
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    if (request.isInterceptResolutionHandled()) return;

    const url = request.url();
    const fromTheApp =
      url.startsWith(config.baseUrl) ||
      url.startsWith("http://127.0.0.1") ||
      url.startsWith("http://localhost") ||
      url.startsWith("data:") ||
      url.startsWith("blob:");

    if (fromTheApp) {
      request.continue();
      return;
    }

    request.abort();
  });
}
