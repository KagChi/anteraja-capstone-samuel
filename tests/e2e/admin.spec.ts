import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("admin lands on the dashboard", async ({ page }) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  await expect(page).toHaveURL(/\/admin\/dashboard/);
  // The client-side swap after login must render the console, not a blank
  // page: the session comes from the current page props.
  await expect(
    page.getByRole("heading", { name: "Daftar Pengiriman" }),
  ).toBeVisible();
});

test("admin can open the exception queue", async ({ page }) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  await page.goto("/admin/antrian-pengecualian");
  await expect(
    page.getByRole("heading", { name: "Antrian Pengecualian" }),
  ).toBeVisible();
});

test("admin can switch the approval queue to the GPS locks tab", async ({
  page,
}) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  await page.goto("/admin/antrian-pengecualian");
  await page.locator('[data-mode="gps"]').click();

  await expect(
    page.getByRole("heading", { name: "Blokir GPS Menunggu Keputusan" }),
  ).toBeVisible();
});

test("admin can open the PIN lock dashboard", async ({ page }) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  await page.goto("/admin/pin-terkunci");
  await expect(
    page.getByRole("heading", { name: "PIN Terkunci" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tantangan PIN Butuh Keputusan" }),
  ).toBeVisible();

  // The queue may be empty on a fresh seed; when a courier has locked a PIN
  // the review modal opens with the unlock/override decisions.
  const rows = page.locator(".pin-lock-row");

  if ((await rows.count()) > 0) {
    await rows
      .first()
      .getByRole("button", { name: "Tinjau PIN terkunci" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Buka Blokir PIN" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Buka Blokir PIN" }),
    ).toBeHidden();
  }
});

test("admin can download the audit trail as CSV", async ({ page }) => {
  await login(page, "windy.kusuma@anteraja.example.com");

  const response = await page.request.get(
    "/api/v1/admin/shipments/AJ2509000011/audit-export",
  );

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"] ?? "").toContain("text/csv");
  expect(await response.text()).toContain("bagian,waktu,aktor,jenis,detail");
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
