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
