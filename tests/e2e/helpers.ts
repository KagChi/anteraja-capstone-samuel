import type { Page } from "@playwright/test";

/**
 * Keeps the suite hermetic: Google Fonts and the avatar service are external
 * dependencies, so they are aborted instead of stalling page loads on
 * restricted networks or CI. Everything served by the app itself passes.
 */
export async function blockExternalAssets(page: Page): Promise<void> {
  await page.route("**/*", (route) => {
    const url = route.request().url();

    if (
      url.startsWith("http://127.0.0.1") ||
      url.startsWith("http://localhost") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return route.continue();
    }

    return route.abort();
  });
}

export async function login(page: Page, email: string): Promise<void> {
  await blockExternalAssets(page);

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", "password");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/courier\/tugas|\/admin\/dashboard/, {
    waitUntil: "domcontentloaded",
  });
}
