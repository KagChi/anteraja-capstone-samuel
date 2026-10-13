import * as act from "./actions.mjs";
import { openSession, setPosition } from "./browser.mjs";
import { resetShipments } from "./reset.mjs";
import { sel } from "./selectors.mjs";

/** Far from every seeded destination: the courier is outside the radius. */
const OUTSIDE = { latitude: -6.3, longitude: 106.9 };

/** ~25 m from the destination, so the POD carries a real, non-zero distance. */
const IN_RADIUS_OFFSET = { latitude: -0.00018, longitude: 0.00013 };

function createChecklist() {
  const checks = [];

  const push = (name, expected, actual, passed) => {
    checks.push({
      name,
      expected,
      actual,
      status: passed ? "PASS" : "FAIL",
    });
  };

  return {
    checks,
    contains(name, actual, needle) {
      push(
        name,
        `contains ${JSON.stringify(needle)}`,
        actual,
        String(actual ?? "").includes(needle),
      );
    },
    equal(name, expected, actual) {
      push(name, expected, actual, expected === actual);
    },
    truthy(name, actual, expected = "a value") {
      push(name, expected, actual, Boolean(actual));
    },
  };
}

function createShooter(page, run, scenario, files) {
  let index = 0;

  return async function capture(label) {
    index += 1;
    const name = `${scenario.id}--${String(index).padStart(2, "0")}-${label}.png`;
    await page.screenshot({ path: `${run.screenshotsDir}/${name}` });
    files.push(`screenshots/${name}`);
    return name;
  };
}

async function failShot(page, run, scenario, files) {
  const name = `${scenario.id}--99-failure.png`;
  await page.screenshot({
    path: `${run.screenshotsDir}/${name}`,
    fullPage: true,
  });
  files.push(`screenshots/${name}`);
}

/**
 * Signs in and aims the mocked GPS fix. The courier ships fix-quality signals
 * to the server, so where the browser says it is decides which gate opens.
 */
async function prepare(page, scenario) {
  await act.login(page);
  const task = await act.shipmentSnapshot(page, scenario.shipment);
  await setPosition(page, positionFor(scenario.input, task));
  return task;
}

function positionFor(input, task) {
  const accuracyMeters = input.accuracyMeters ?? 12;

  if (input.position === "outside") {
    return { ...OUTSIDE, accuracy: accuracyMeters };
  }

  const destination = task?.destination;
  if (!destination) {
    throw new Error("The shipment carries no destination to aim the fix at.");
  }

  return {
    latitude: destination.latitude + IN_RADIUS_OFFSET.latitude,
    longitude: destination.longitude + IN_RADIUS_OFFSET.longitude,
    accuracy: accuracyMeters,
  };
}

/**
 * Flow = the user journey a scenario declares. Each flow drives the browser and
 * records expected-vs-actual checks; the runner turns those into PASS/FAIL.
 */
const flows = {
  /** Happy path: valid PIN, POD photo, delivery complete, visible in Riwayat. */
  async "complete-delivery"({ page, scenario, checklist, capture }) {
    await act.openTaskFromList(page, scenario.shipment);
    await act.waitForFix(page);
    checklist.contains(
      "geofence admits the courier",
      await act.text(page, sel.verification.geofenceStatus),
      "Di dalam radius",
    );
    await capture("form-loaded");

    const pin = await act.readPinHint(page);
    checklist.truthy("demo PIN issued on the form", pin);

    await act.typePin(
      page,
      scenario.input.pin === "valid" ? pin : scenario.input.pin,
    );
    await act.chooseRelation(page, scenario.input.relation);
    await act.waitForEnabled(page, sel.verification.nextStep);
    await capture("form-filled");

    await act.submitStep(page);
    checklist.contains(
      "moved to the proof step",
      await act.path(page),
      "/courier/bukti-foto",
    );

    await act.captureProof(page);
    checklist.contains(
      "live fix accepted at the proof step",
      await act.text(page, sel.proof.gpsStatus),
      "ke tujuan",
    );
    await capture("proof-captured");

    await act.confirmProof(page);
    checklist.contains(
      "success screen",
      await act.text(page, sel.success.title),
      scenario.expect.successTitle,
    );
    await capture("success");

    const row = await act.findHistoryRow(page, scenario.shipment);
    checklist.truthy("shipment appears in Riwayat", row);
    checklist.contains(
      "Riwayat status label",
      row ?? "",
      scenario.expect.history.statusLabel,
    );
    await capture("riwayat");
  },

  /** Negative: four digits and Enter, so the guard must refuse to advance. */
  async "incomplete-pin"({ page, scenario, checklist, capture }) {
    await act.openTaskFromList(page, scenario.shipment);
    await act.typePin(page, scenario.input.digits);
    await act.pressEnterInPin(page, scenario.input.digits.length + 1);
    await act.waitForToast(page, scenario.expect.toast);

    checklist.contains(
      "validation error toast",
      await act.toastText(page),
      scenario.expect.toast,
    );
    checklist.contains(
      "stays on the verification form",
      await act.path(page),
      "/courier/verifikasi",
    );
    checklist.equal(
      "next step stays blocked",
      "true",
      await act.attr(page, sel.verification.nextStep, "aria-disabled"),
    );
    await capture("validation-error");
  },

  /** Negative: a wrong six-digit PIN is refused and counted. */
  async "wrong-pin"({ page, scenario, checklist, capture }) {
    await act.openTaskFromList(page, scenario.shipment);
    await act.typePin(page, scenario.input.pin);
    await act.waitForToast(page, scenario.expect.toast);

    checklist.contains(
      "wrong PIN toast",
      await act.toastText(page),
      scenario.expect.toast,
    );
    checklist.contains(
      "stays on the verification form",
      await act.path(page),
      "/courier/verifikasi",
    );

    // The form clears the digits 500 ms after a refusal, so the next try
    // starts from an empty field.
    await act.waitForEmptyPin(page);
    checklist.equal(
      "fields cleared for the next try",
      "",
      await act.value(page, sel.verification.pinInput(1)),
    );

    const snapshot = await act.shipmentSnapshot(page, scenario.shipment);
    checklist.equal(
      "server counted the failed attempt",
      scenario.expect.attempts,
      snapshot.pin?.attempts,
    );
    await capture("wrong-pin");
  },

  /** Edge: the segment policy locks the challenge after three failures. */
  async "pin-lockout"({ page, scenario, checklist, capture }) {
    await act.openTaskFromList(page, scenario.shipment);

    for (let attempt = 1; attempt <= scenario.input.attempts; attempt += 1) {
      await act.typePin(page, scenario.input.pin);
      if (attempt < scenario.input.attempts) await act.waitForEmptyPin(page);
    }

    await act.waitFor(page, sel.verification.lockedBanner);
    checklist.contains(
      "lock banner explains the lock",
      await act.text(page, sel.verification.lockedBanner),
      "PIN Terkunci",
    );
    checklist.contains(
      "lock toast names the limit",
      await act.toastText(page),
      "PIN salah",
    );
    checklist.equal(
      "next step stays blocked",
      "true",
      await act.attr(page, sel.verification.nextStep, "aria-disabled"),
    );
    await capture("pin-locked");
  },

  /** Edge: a mock-provider fingerprint (accuracy 0) blocks the POD upload. */
  async "mock-gps-block"({ page, scenario, checklist, capture }) {
    await act.openTaskFromList(page, scenario.shipment);
    await act.waitForFix(page);
    await capture("form-loaded");

    const pin = await act.readPinHint(page);
    await act.typePin(page, pin);
    await act.submitStep(page);
    await act.captureProof(page);
    await act.confirmProofExpectingBlock(page, sel.proof.blockedPanel);

    checklist.contains(
      "POD refused with the integrity reason",
      await act.text(page, sel.proof.blockedPanel),
      scenario.expect.blockedPanel,
    );
    await capture("gps-blocked");

    await act.requestGpsReview(page, scenario.input.reason);
    checklist.contains(
      "review request queued for admin",
      await act.text(page, sel.proof.lockPending),
      scenario.expect.lockPending,
    );
    await capture("gps-review-requested");
  },

  /** Edge: outside the radius a recorded reason unlocks the journey. */
  async "outside-geofence"({ page, scenario, checklist, capture }) {
    await act.openTaskFromList(page, scenario.shipment);
    await act.waitForFix(page);
    await act.waitFor(page, sel.verification.exceptionCard);

    checklist.contains(
      "exception card asks for a reason",
      await act.text(page, sel.verification.exceptionCard),
      "Belum diajukan",
    );
    checklist.equal(
      "next step is blocked before a reason",
      "true",
      await act.attr(page, sel.verification.nextStep, "aria-disabled"),
    );
    await capture("outside-radius");

    const pin = await act.readPinHint(page);
    await act.typePin(page, pin);
    await act.submitException(page, scenario.input.reason);

    checklist.contains(
      "reason recorded on the card",
      await act.text(page, sel.verification.exceptionCard),
      "Tercatat",
    );
    checklist.contains(
      "journey may continue",
      await act.text(page, sel.verification.lockReason),
      scenario.expect.lockReason,
    );
    await act.waitForEnabled(page, sel.verification.nextStep);
    checklist.equal(
      "next step unlocks after the reason",
      null,
      await act.attr(page, sel.verification.nextStep, "aria-disabled"),
    );
    await capture("exception-recorded");
  },
};

export async function runScenario(browser, scenario, run) {
  const startedAt = Date.now();
  const checklist = createChecklist();
  const screenshots = [];
  let session = null;
  let consoleOutput = { messages: [], errors: [] };
  let error = null;

  try {
    if (scenario.reset !== false) resetShipments([scenario.shipment]);

    session = await openSession(browser);
    consoleOutput = session.console;
    const capture = createShooter(session.page, run, scenario, screenshots);
    const task = await prepare(session.page, scenario);
    const flow = flows[scenario.flow];
    if (!flow) throw new Error(`Unknown flow "${scenario.flow}"`);

    await flow({
      page: session.page,
      scenario,
      checklist,
      capture,
      task,
    });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
    if (session) {
      await failShot(session.page, run, scenario, screenshots).catch(() => {});
    }
  } finally {
    if (session) await session.context.close().catch(() => {});
  }

  const failed = checklist.checks.some((check) => check.status === "FAIL");

  return {
    id: scenario.id,
    category: scenario.category,
    title: scenario.title,
    shipment: scenario.shipment,
    flow: scenario.flow,
    status: error || failed ? "FAIL" : "PASS",
    durationMs: Date.now() - startedAt,
    checks: checklist.checks,
    screenshots,
    console: consoleOutput,
    error,
  };
}
