import { config } from "../config.mjs";
import { sel } from "./selectors.mjs";

export async function goto(page, pathname) {
  await page.goto(`${config.baseUrl}${pathname}`, {
    waitUntil: "domcontentloaded",
  });
}

/**
 * Inertia swaps pages with the History API, so there is no document load to
 * wait for: the suite waits on the URL instead of on a navigation event.
 */
export async function waitForPath(page, pattern, timeout = config.timeoutMs) {
  await page.waitForFunction(
    (source) =>
      new RegExp(source).test(`${location.pathname}${location.search}`),
    { timeout },
    pattern.source,
  );
}

export function path(page) {
  return page.evaluate(() => `${location.pathname}${location.search}`);
}

export async function login(page, { email, password } = config.courier) {
  await goto(page, "/login");
  await page.waitForSelector(sel.login.email);
  await page.type(sel.login.email, email);
  await page.type(sel.login.password, password);
  await page.click(sel.login.submit);
  await waitForPath(page, /\/courier\/tugas/);
  await page.waitForSelector(sel.tasks.container);
}

/** The courier taps a shipment in the task list, exactly like the user does. */
export async function waitForTasks(page) {
  await page.waitForSelector(sel.tasks.container);
  // The list paints a loading panel first: wait for a real task card.
  await page.waitForSelector(`${sel.tasks.container} article[data-tracking]`);
}

export async function openTaskFromList(page, tracking) {
  await goto(page, "/courier/tugas");
  await waitForTasks(page);
  const card = sel.tasks.card(tracking);
  await page.waitForSelector(card);
  await page.$eval(card, (element) =>
    element.scrollIntoView({ block: "center" }),
  );

  const link = await page.waitForSelector(sel.tasks.openLink(tracking));
  await Promise.all([waitForPath(page, /\/courier\/verifikasi/), link.click()]);
  await page.waitForSelector(sel.verification.form);
}

/**
 * The demo PIN is published on the page (`#pin-hint`) because the prototype
 * has no SMS gateway, so the suite reads it instead of hard-coding it.
 */
export async function readPinHint(page) {
  await page.waitForFunction(
    (selector) =>
      /\d{6}/.test(document.querySelector(selector)?.textContent ?? ""),
    { timeout: config.timeoutMs },
    sel.verification.pinHint,
  );

  const hint = await text(page, sel.verification.pinHint);
  return hint.match(/\d{6}/)?.[0] ?? null;
}

export async function typePin(page, digits, { delayMs = 30 } = {}) {
  const characters = [...digits];

  for (const [index, digit] of characters.entries()) {
    const input = await page.waitForSelector(
      sel.verification.pinInput(index + 1),
    );
    await input.click({ clickCount: 3 });
    await input.type(digit, { delay: delayMs });
  }
}

export async function pressEnterInPin(page, index) {
  await page.focus(sel.verification.pinInput(index));
  await page.keyboard.press("Enter");
}

export async function waitForEmptyPin(page) {
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.value === "",
    { timeout: config.timeoutMs },
    sel.verification.pinInput(1),
  );
}

export async function chooseRelation(page, relation) {
  const tab = await page.waitForSelector(
    sel.verification.relationTab(relation),
  );
  await tab.click();
}

/**
 * The status pill starts on "Mencari sinyal GPS…" and only turns into the
 * radius verdict once the device fix lands, so scenarios wait for that.
 */
export function waitForFix(page) {
  return page.waitForFunction(
    (css) => {
      const text = document.querySelector(css)?.textContent ?? "";
      return (
        text.includes("Di dalam radius") || text.includes("Di luar radius")
      );
    },
    { timeout: config.timeoutMs },
    sel.verification.geofenceStatus,
  );
}

/** Submits the verification step and waits for the POD page. */
export async function submitStep(page) {
  await waitForEnabled(page, sel.verification.nextStep);
  await Promise.all([
    waitForPath(page, /\/courier\/bukti-foto/),
    page.click(sel.verification.nextStep),
  ]);
}

export async function captureProof(page) {
  await waitForPath(page, /\/courier\/bukti-foto/);
  await waitForEnabled(page, sel.proof.capture);
  await page.click(sel.proof.capture);
  await page.waitForSelector(sel.proof.confirm);
}

export async function confirmProof(page) {
  await waitForEnabled(page, sel.proof.confirm);
  await Promise.all([
    waitForPath(page, /\/courier\/sukses/),
    page.click(sel.proof.confirm),
  ]);
  await page.waitForSelector(sel.success.title);
}

/** A rejected fix keeps the courier on the POD page and explains why. */
export async function confirmProofExpectingBlock(page, blockSelector) {
  await waitForEnabled(page, sel.proof.confirm);
  await page.click(sel.proof.confirm);
  await page.waitForSelector(blockSelector);
}

export async function requestGpsReview(page, reason) {
  await page.type(sel.proof.lockReason, reason);
  await page.click(sel.proof.requestReview);
  await page.waitForSelector(sel.proof.lockPending);
}

export async function submitException(page, reason) {
  await page.waitForSelector(sel.verification.exceptionReason);
  await page.type(sel.verification.exceptionReason, reason);
  await page.click(sel.verification.exceptionSubmit);
  await page.waitForFunction(
    (selector) =>
      (document.querySelector(selector)?.textContent ?? "").includes(
        "Tercatat",
      ),
    { timeout: config.timeoutMs },
    sel.verification.exceptionCard,
  );
}

/**
 * Riwayat is cursor-paginated ten rows at a time, so the row is searched page
 * by page through the numbered pager.
 */
export async function findHistoryRow(page, tracking, { maxPages = 5 } = {}) {
  await goto(page, "/courier/riwayat");
  await page.waitForSelector(sel.history.list);
  await waitForHistoryList(page);

  if (await exists(page, sel.history.row(tracking))) {
    return text(page, sel.history.row(tracking));
  }

  for (let number = 2; number <= maxPages; number += 1) {
    const button = await page.$(sel.history.pageButton(number));
    if (!button) return null;

    await button.click();
    await page.waitForFunction(
      (selector, expected) =>
        document.querySelector(selector)?.textContent?.trim() ===
        String(expected),
      { timeout: config.timeoutMs },
      sel.history.pageIndicator,
      number,
    );
    await waitForHistoryList(page);

    if (await exists(page, sel.history.row(tracking))) {
      return text(page, sel.history.row(tracking));
    }
  }

  return null;
}

/**
 * The list renders immediately and fills in after the request lands, so the
 * suite waits for a row or for the documented empty state.
 */
function waitForHistoryList(page) {
  return page.waitForFunction(
    (selector) => {
      const list = document.querySelector(selector);
      if (!list) return false;
      if (list.querySelector("li[data-tracking]")) return true;
      return (list.textContent ?? "").includes("Belum ada pengiriman");
    },
    { timeout: config.timeoutMs },
    sel.history.list,
  );
}

/** Reads the shipment the way the app does, to aim the mock GPS fix at it. */
export function shipmentSnapshot(page, tracking) {
  return page.evaluate(async (key) => {
    const response = await fetch(`/api/v1/courier/tasks/${key}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok)
      throw new Error(`task ${key} answered ${response.status}`);
    const payload = await response.json();
    return payload.data;
  }, tracking);
}

export function text(page, selector) {
  return page.$eval(selector, (element) => {
    // innerText keeps the spacing a reader sees; textContent would glue the
    // adjacent nodes of a task card or a history row together.
    const rendered = element.innerText;
    const raw =
      rendered && rendered.trim().length > 0
        ? rendered
        : (element.textContent ?? "");
    return raw.replace(/\s+/g, " ").trim();
  });
}

export function attr(page, selector, name) {
  return page.$eval(
    selector,
    (element, attribute) => element.getAttribute(attribute),
    name,
  );
}

export function value(page, selector) {
  return page.$eval(selector, (element) => element.value);
}

export async function exists(page, selector) {
  const handle = await page.$(selector);
  return handle !== null;
}

export function waitFor(page, selector) {
  return page.waitForSelector(selector);
}

export function waitForToast(page, needle) {
  return page.waitForFunction(
    (selector, value) =>
      [...document.querySelectorAll(selector)].some((node) =>
        (node.textContent ?? "").includes(value),
      ),
    { timeout: config.timeoutMs },
    sel.toast,
    needle,
  );
}

export function toastText(page) {
  return page.$$eval(sel.toast, (nodes) =>
    nodes
      .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .join(" | "),
  );
}

/**
 * `Button` marks a disabled control with `aria-disabled` and
 * `pointer-events-none`, so the suite waits on that attribute rather than on a
 * native `disabled` property.
 */
export function waitForEnabled(page, selector) {
  return page.waitForFunction(
    (css) => {
      const element = document.querySelector(css);
      if (!element) return false;
      return (
        element.getAttribute("aria-disabled") !== "true" &&
        element.disabled !== true
      );
    },
    { timeout: config.timeoutMs },
    selector,
  );
}
