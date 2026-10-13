# Shipment Regression Test (Puppeteer)

Automation suite for the business-critical shipment request workflow of the
courier app: open the task, verify the recipient PIN, capture the proof of
delivery, finish, then check the result in Riwayat.

It is the Day 21 deliverable: browser automation first, automated testing on
top of it.

| Script | What it does |
| --- | --- |
| `session-1-fundamentals.mjs` | Drives the browser with no assertions: open page → wait for element → interact → continue, plus a DOM-selector walkthrough. |
| `session-2-shipment-e2e.mjs` | Runs one scenario end to end, then compares the manual baseline with what the app actually did (PASS/FAIL). |
| `session-3-regression.mjs` | Data-driven suite: every scenario in `data/shipment-cases.json`, each with PASS/FAIL, screenshots and `test-results.json`. |

## Prerequisites

1. The app is served and reachable:

   ```bash
   php artisan serve --host=127.0.0.1 --port=8123
   ```

   The suite drives the real app against its real database, so the app needs
   whatever `.env` points at (local PostGIS or the Supabase pooler).

2. `bun install` has run; Puppeteer ships its own Chrome for Testing.

## Running

```bash
bun run automation:basics        # Sesi 1 — fundamentals
bun run automation:e2e           # Sesi 2 — one end-to-end scenario
bun run automation:regression    # Sesi 3 — the reusable regression suite

# a single scenario, or a whole category
node tests/automation/session-3-regression.mjs happy-path-delivery
node tests/automation/session-3-regression.mjs negative
```

The suite resets every shipment it touches with
`php artisan demo:reset-shipments <tracking>` before the scenario runs, which
clears the POD, the exceptions, the GPS lock request and the flow events and
re-issues the PIN. That is what makes the run repeatable.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTOMATION_BASE_URL` | `http://127.0.0.1:8123` | Where the app is served. |
| `AUTOMATION_HEADLESS` | `true` | Set `0` to watch the run in a real window. |
| `AUTOMATION_SLOWMO` | `0` | Milliseconds of delay per Puppeteer action. |
| `AUTOMATION_TIMEOUT_MS` | `30000` | Wait budget for selectors, URLs and toasts. |
| `AUTOMATION_RESET` | `1` | Set `0` to inspect a failure without resetting data. |
| `AUTOMATION_ARTIFACTS` | `tests/automation/artifacts` | Where runs are written. |
| `AUTOMATION_BLOCK_EXTERNAL` | `1` | Aborts third-party requests (fonts, avatars). |
| `AUTOMATION_COURIER_EMAIL` | demo courier | Login used by the suite. |

## Layout

```
tests/automation/
  config.mjs                  # base URL, credentials, timeouts, artifact paths
  data/shipment-cases.json    # test data + expected result per scenario
  lib/selectors.mjs           # the DOM contract the suite drives
  lib/browser.mjs             # launch, phone viewport, fake camera, request blocking
  lib/actions.mjs             # login, task list, PIN, POD, history, assertions
  lib/scenario-runner.mjs     # the flows + expected-vs-actual checks
  lib/reset.mjs               # demo:reset-shipments wrapper
  lib/artifacts.mjs           # run folder, screenshots, test-results.json
  session-1-fundamentals.mjs
  session-2-shipment-e2e.mjs
  session-3-regression.mjs
  artifacts/                  # one folder per run (git-ignored)
```

## Result format

Each run writes `artifacts/<timestamp>-<session>/test-results.json`:

```json
{
  "suite": "Anteraja Shipment Request — Regression Test",
  "runId": "2026-10-12T15-04-11-session-3",
  "baseUrl": "http://127.0.0.1:8123",
  "gitCommit": "2592ae3",
  "summary": { "total": 6, "passed": 6, "failed": 0 },
  "scenarios": [
    {
      "id": "happy-path-delivery",
      "category": "happy",
      "status": "PASS",
      "checks": [
        {
          "name": "riwayat status label",
          "expected": "contains \"Terverifikasi\"",
          "actual": "AJ2509000011 Terverifikasi ...",
          "status": "PASS"
        }
      ],
      "screenshots": ["screenshots/happy-path-delivery--01-form-loaded.png"]
    }
  ]
}
```

The screenshots next to it are the evidence for each step: the form before
submit, the proof capture, the success screen, the Riwayat row, and a
`--99-failure.png` whenever a scenario throws.
