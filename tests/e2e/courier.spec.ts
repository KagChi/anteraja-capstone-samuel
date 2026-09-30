import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("courier lands on tasks and opens the verification step", async ({
  page,
}) => {
  await login(page, "budi.pratama@anteraja.example.com");

  await expect(page.getByRole("heading", { name: "Pengiriman" })).toBeVisible();

  await page.getByRole("link", { name: "Mulai Antar" }).first().click();

  await expect(page).toHaveURL(/\/courier\/verifikasi/);
  await expect(
    page.getByRole("heading", { name: "Verifikasi Pengiriman" }),
  ).toBeVisible();
});
