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

test("verification without a shipment returns to the task list", async ({
  page,
}) => {
  await login(page, "budi.pratama@anteraja.example.com");

  await page.goto("/courier/verifikasi");

  await expect(page).toHaveURL(/\/courier\/tugas/);
});

test("courier is asked for a reason when outside the geofence", async ({
  page,
}) => {
  await login(page, "budi.pratama@anteraja.example.com");

  // Far away from the destination: the exception path must open.
  await page
    .context()
    .setGeolocation({ latitude: -6.3, longitude: 106.9, accuracy: 12 });
  await page.goto("/courier/verifikasi?tracking=AJ2509000011");

  await expect(page.locator("#exception-card")).toBeVisible({
    timeout: 20_000,
  });
  await page.fill("#exception-reason", "Lobi gedung dikunci satpam.");
  await page.locator("#btn-request-exception").click();

  await expect(page.locator("#exception-card")).toContainText("Tercatat", {
    timeout: 20_000,
  });
  await expect(page.locator("#lock-reason")).toContainText("boleh dilanjutkan");
});

test("courier is blocked on a mock GPS fingerprint and can ask for review", async ({
  page,
}) => {
  await login(page, "budi.pratama@anteraja.example.com");

  // A second seeded shipment keeps the full POD flow (which delivers the Maxy
  // AI Hub shipment) untouched.
  const tasksResponse = await page.request.get(
    "/api/v1/courier/tasks?per_page=100",
  );
  const tasks = (await tasksResponse.json()) as {
    data: Array<{
      tracking: string;
      destination?: { latitude: number; longitude: number };
      gpsLock?: { status: string } | null;
    }>;
  };
  const task = tasks.data.find((item) => item.tracking === "AJ2509000011");

  test.skip(!task?.destination, "Seed data AJ2509000011 is not available.");
  test.skip(
    task?.gpsLock?.status === "pending",
    "AJ2509000011 already has a pending GPS review request (run demo:reset-shipments to replay).",
  );

  // Playwright's default accuracy is 0: the mock-provider fingerprint the
  // server blocks on (FRD-06).
  await page.context().setGeolocation({
    latitude: task.destination.latitude,
    longitude: task.destination.longitude,
    accuracy: 0,
  });

  await page.goto("/courier/bukti-foto?tracking=AJ2509000011");
  await expect(page.locator("#pod-gps-status")).toContainText("ke tujuan", {
    timeout: 20_000,
  });

  const captureButton = page.locator("#btn-capture-photo");
  await expect(captureButton).toBeEnabled({ timeout: 20_000 });
  await captureButton.click();

  const confirm = page.locator("#btn-confirm-pod");
  await expect(confirm).toBeVisible();
  await confirm.click();

  await expect(page.locator("#gps-blocked-panel")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#gps-blocked-panel")).toContainText(
    "Akurasi GPS tidak wajar",
  );

  await page.fill("#gps-lock-reason", "Perangkat melaporkan akurasi 0 meter.");
  await page.locator("#btn-request-gps-review").click();

  await expect(page.locator("#gps-lock-pending")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#gps-lock-pending")).toContainText(
    "Menunggu Keputusan Admin",
  );
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
  const task = tasks.data.find((item) => item.tracking === "AJ2509001001");

  test.skip(
    !task,
    "Seed data AJ2509001001 (Maxy AI Hub) is already delivered in this database.",
  );

  // Mock the device GPS fix on the shipment destination so the live distance
  // readout resolves inside the geofence radius.
  if (task?.destination) {
    await page.context().setGeolocation({
      latitude: task.destination.latitude,
      longitude: task.destination.longitude,
      accuracy: 12,
    });
  }

  // Open the Maxy AI Hub task explicitly; its tracking drives the flow.
  await page
    .locator('article[data-tracking="AJ2509001001"]')
    .getByRole("link", { name: /Mulai Antar/ })
    .click();
  await expect(page).toHaveURL(/\/courier\/verifikasi/);

  // GPS detection: the live fix must resolve inside the geofence radius.
  await expect(page.locator("#geofence-status")).toContainText(
    "Di dalam radius",
    { timeout: 20_000 },
  );

  // The radius map renders so the courier can confirm the drop-off location.
  await expect(page.locator("#geofence-map")).toBeVisible();
  await expect(page.locator("#geofence-map").locator("path")).not.toHaveCount(
    0,
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

test("courier is locked out after three wrong PIN attempts", async ({
  page,
}) => {
  await login(page, "budi.pratama@anteraja.example.com");

  const tasksResponse = await page.request.get(
    "/api/v1/courier/tasks?per_page=100",
  );
  const tasks = (await tasksResponse.json()) as {
    data: Array<{ tracking: string; pin?: { status: string } | null }>;
  };
  const task = tasks.data.find((item) => item.tracking === "AJ2509000011");

  test.skip(!task, "Seed data AJ2509000011 is not available.");
  test.skip(
    task?.pin?.status === "locked",
    "The PIN is already locked (run demo:reset-shipments to replay).",
  );

  await page.goto("/courier/verifikasi?tracking=AJ2509000011");
  await expect(page.locator("#pin-form")).toBeVisible();

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const index of [1, 2, 3, 4, 5, 6]) {
      await page.locator(`#pin-${index}`).fill("0");
    }

    if (attempt < 2) {
      // The failed attempt clears the fields for the next try.
      await expect(page.locator("#pin-1")).toHaveValue("", { timeout: 5_000 });
    }
  }

  await expect(page.locator("#pin-locked-banner")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("#pin-locked-banner")).toContainText(
    "PIN Terkunci",
  );
  await expect(page.locator("#btn-resend-pin")).toBeDisabled();
});

test("courier can propose a meeting point from the verification step", async ({
  page,
}) => {
  await login(page, "budi.pratama@anteraja.example.com");

  const tasksResponse = await page.request.get(
    "/api/v1/courier/tasks?per_page=100",
  );
  const tasks = (await tasksResponse.json()) as {
    data: Array<{
      tracking: string;
      destination?: { latitude: number; longitude: number };
      meetingPoint?: { status: string; final: boolean } | null;
    }>;
  };
  const task = tasks.data.find((item) => item.tracking === "AJ2509000011");

  test.skip(!task?.destination, "Seed data AJ2509000011 is not available.");
  test.skip(
    task?.meetingPoint?.status === "proposed" || task?.meetingPoint?.final,
    "AJ2509000011 already has a meeting point (run demo:reset-shipments to replay).",
  );

  await page.context().setGeolocation({
    latitude: task.destination.latitude,
    longitude: task.destination.longitude,
    accuracy: 12,
  });

  await page.goto("/courier/verifikasi?tracking=AJ2509000011");
  await expect(page.locator("#meeting-point-card")).toBeVisible();

  const useMyLocation = page.locator("#btn-use-my-location");
  await expect(useMyLocation).toBeEnabled({ timeout: 20_000 });
  await useMyLocation.click();
  await page.locator("#btn-propose-meeting-point").click();

  await expect(page.locator("#meeting-point-pending")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#meeting-point-status")).toContainText(
    "Menunggu persetujuan",
  );
});

test("courier can open riwayat and profil", async ({ page }) => {
  await login(page, "budi.pratama@anteraja.example.com");

  await page.goto("/courier/riwayat");
  await expect(
    page.getByRole("heading", { name: "Riwayat Pengiriman" }),
  ).toBeVisible();

  await page.locator('a[href="/courier/profil"]').click();
  await expect(
    page.getByRole("heading", { name: "Profil Kurir" }),
  ).toBeVisible();
  await expect(page.locator("#courier-profile")).toBeVisible();
  await expect(page.locator("#courier-stats")).toBeVisible();
});
