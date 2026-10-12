#!/usr/bin/env node
/**
 * Sesi 1 — Browser Automation Fundamentals.
 *
 * The whole session is one loop: open a page, wait for an element, interact,
 * continue. Nothing here judges business behaviour yet; it proves the browser
 * can be driven and that the selectors the later sessions depend on exist.
 *
 *   Open Page → Wait for Element → Interact → Continue
 */
import { config } from "./config.mjs";
import * as act from "./lib/actions.mjs";
import { buildResults, createRun, writeResults } from "./lib/artifacts.mjs";
import { launchBrowser, openSession, setPosition } from "./lib/browser.mjs";
import { sel } from "./lib/selectors.mjs";

const steps = [];

function step(title, detail) {
  steps.push({ title, detail });
  process.stdout.write(`\n▶ ${title}\n  ${detail}\n`);
}

const run = createRun("session-1");
process.stdout.write(`\nSesi 1 — Browser Automation Fundamentals\n`);
process.stdout.write(`Run : ${run.id}\n`);
process.stdout.write(`App : ${config.baseUrl} (headless=${config.headless})\n`);

const browser = await launchBrowser();
const session = await openSession(browser);

try {
  const { page } = session;

  step("Open Page", `page.goto('${config.baseUrl}/login')`);
  await act.goto(page, "/login");

  step("Wait for Element", `page.waitForSelector('${sel.login.email}')`);
  await page.waitForSelector(sel.login.email);
  await page.screenshot({ path: `${run.screenshotsDir}/01-login.png` });

  step(
    "Read the Dom",
    "page.title() and page.$$eval() count the fields the form renders",
  );
  const title = await page.title();
  const fields = await page.$$eval("input", (nodes) =>
    nodes.map((node) => node.id || node.name),
  );
  process.stdout.write(`  title : ${title}\n  fields: ${fields.join(", ")}\n`);

  step("Interact", "type the courier credentials and submit the form");
  await page.type(sel.login.email, config.courier.email);
  await page.type(sel.login.password, config.courier.password);
  await page.click(sel.login.submit);

  step(
    "Continue",
    "wait for the task list: Inertia swaps pages without a document load, " +
      "so the suite waits on an element, not on a navigation event",
  );
  await page.waitForSelector(sel.tasks.container);
  await act.waitForPath(page, /\/courier\/tugas/);
  await act.waitForTasks(page);
  await page.screenshot({ path: `${run.screenshotsDir}/02-task-list.png` });

  step(
    "Dom Selector",
    "read data-tracking off every task card, like a user scan",
  );
  const trackings = await page.$$eval(
    `${sel.tasks.container} article`,
    (nodes) => nodes.map((node) => node.dataset.tracking).filter(Boolean),
  );
  process.stdout.write(`  tasks: ${trackings.join(", ")}\n`);

  const target = trackings[0];
  if (!target)
    throw new Error("No shipment is waiting in the courier task list.");

  step(
    "Mock the device fix",
    "page.setGeolocation({ ...destination }) — the courier app reads the live fix",
  );
  const snapshot = await act.shipmentSnapshot(page, target);
  await setPosition(page, {
    latitude: snapshot.destination.latitude,
    longitude: snapshot.destination.longitude,
    accuracy: 12,
  });
  process.stdout.write(
    `  fix: ${snapshot.destination.latitude}, ${snapshot.destination.longitude}\n`,
  );

  step(
    "Interact",
    `open the last task card link: ${sel.tasks.openLink(target)}`,
  );
  const link = await page.waitForSelector(sel.tasks.openLink(target));
  await Promise.all([
    act.waitForPath(page, /\/courier\/verifikasi/),
    link.click(),
  ]);
  await page.waitForSelector(sel.verification.form);
  await page.waitForFunction(
    (selector) =>
      (document.querySelector(selector)?.textContent ?? "").includes(
        "Di dalam radius",
      ),
    { timeout: config.timeoutMs },
    sel.verification.geofenceStatus,
  );

  step(
    "Wait for Element",
    "wait until the PIN hint really contains six digits, instead of sleeping",
  );
  const pin = await act.readPinHint(page);
  const geofence = await act.text(page, sel.verification.geofenceStatus);
  process.stdout.write(
    `  shipment: ${target}\n  pin     : ${pin}\n  geofence: ${geofence}\n`,
  );
  await page.screenshot({ path: `${run.screenshotsDir}/03-verification.png` });

  step(
    "Continue",
    "the selectors below are the contract Sesi 2 and Sesi 3 drive",
  );
  process.stdout.write(
    `  ${[
      sel.verification.form,
      sel.verification.nextStep,
      sel.proof.capture,
      sel.proof.confirm,
      sel.success.title,
      sel.history.list,
    ].join("\n  ")}\n`,
  );

  const results = buildResults(
    run,
    [
      {
        id: "session-1-fundamentals",
        category: "walkthrough",
        title: "Open page, wait for element, interact, continue",
        shipment: target,
        status: "PASS",
        durationMs: Date.now() - run.startedAt.getTime(),
        checks: [
          {
            name: "login form reachable",
            expected: true,
            actual: true,
            status: "PASS",
          },
          {
            name: "task list rendered",
            expected: trackings.length > 0,
            actual: trackings.length,
            status: trackings.length > 0 ? "PASS" : "FAIL",
          },
          {
            name: "verification form rendered",
            expected: true,
            actual: true,
            status: "PASS",
          },
          {
            name: "demo PIN readable",
            expected: "6 digits",
            actual: pin,
            status: pin ? "PASS" : "FAIL",
          },
        ],
        screenshots: [
          "screenshots/01-login.png",
          "screenshots/02-task-list.png",
          "screenshots/03-verification.png",
        ],
        console: session.console,
        error: null,
      },
    ],
    {
      notes:
        "Walkthrough only: it drives the browser but asserts no business rule.",
    },
  );

  const file = writeResults(run, results);
  process.stdout.write(`\nArtifacts: ${run.dir}\n  ${file.split("/").pop()}\n`);
} finally {
  await session.context.close();
  await browser.close();
}
