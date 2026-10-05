import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("admin lands on the dashboard", async ({ page }) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  await expect(page).toHaveURL(/\/admin\/dashboard/);
});

test("admin can open the exception queue", async ({ page }) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  await page.goto("/admin/antrian-pengecualian");
  await expect(
    page.getByRole("heading", { name: "Antrian Pengecualian" }),
  ).toBeVisible();
});

test("admin search reaches shipments outside the loaded page", async ({
  page,
}) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  await page.goto("/admin/dashboard");
  await page.locator('[data-status="all"]').click();
  await page.fill("#search-input", "AJ2509000500");

  // The row is far beyond the first cursor page, so it can only appear when
  // the filter runs on the server.
  await expect(page.getByText("AJ2509000500")).toBeVisible({
    timeout: 15_000,
  });
});
