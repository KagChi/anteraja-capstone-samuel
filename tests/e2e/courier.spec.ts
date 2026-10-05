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

test("courier completes a GPS-stamped in-app camera POD delivery", async ({
  page,
}) => {
  await login(page, "budi.pratama@anteraja.example.com");

  // The verification flow always acts on the prototype's active shipment; it
  // can run once per seed, after which the shipment is delivered.
  const tasksResponse = await page.request.get(
    "/api/v1/courier/tasks?per_page=100",
  );
  const tasks = (await tasksResponse.json()) as {
    data: Array<{
      tracking: string;
      destination?: { latitude: number; longitude: number };
    }>;
  };
  const task = tasks.data.find((item) => item.tracking === "AJ2509000011");

  test.skip(
    !task,
    "Seed data AJ2509000011 is already delivered in this database.",
  );

  // Mock the device GPS fix on the shipment destination so the live distance
  // readout resolves inside the geofence radius.
  if (task?.destination) {
    await page.context().setGeolocation({
      latitude: task.destination.latitude,
      longitude: task.destination.longitude,
    });
  }

  await page.getByRole("link", { name: "Mulai Antar" }).first().click();
  await expect(page).toHaveURL(/\/courier\/verifikasi/);

  // GPS detection: the live fix must resolve inside the geofence radius.
  await expect(page.locator("#geofence-status")).toContainText(
    "Di dalam radius",
    { timeout: 20_000 },
  );

  const pinHint = page.locator("#pin-hint");
  await expect(pinHint).toContainText(/\d{6}/, { timeout: 20_000 });
  const code = (await pinHint.innerText()).match(/\d{6}/)?.[0];
  expect(code).toBeTruthy();

  for (const [index, digit] of [...(code ?? "")].entries()) {
    await page.locator(`#pin-${index + 1}`).fill(digit);
  }

  const next = page.locator("#btn-next-step");
  await expect(next).toBeEnabled({ timeout: 20_000 });
  await next.click();
  await expect(page).toHaveURL(/\/courier\/bukti-foto/);

  // In-app camera capture, then upload together with the live GPS fix.
  const captureButton = page.locator("#btn-capture-photo");
  await expect(captureButton).toBeEnabled({ timeout: 20_000 });
  await captureButton.click();

  const confirm = page.locator("#btn-confirm-pod");
  await expect(confirm).toBeVisible();
  await expect(page.locator("#pod-gps-status")).toContainText("ke tujuan");
  await confirm.click();

  await expect(page).toHaveURL(/\/courier\/sukses/, { timeout: 30_000 });
});
