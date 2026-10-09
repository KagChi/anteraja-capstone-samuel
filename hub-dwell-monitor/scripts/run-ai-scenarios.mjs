#!/usr/bin/env node
/**
 * run-ai-scenarios.mjs - menjalankan 4 test scenario ringkasan AI lalu menyimpan bukti output.
 *
 *   npm run ai:test                                        # provider mock (offline, deterministik)
 *   GEMINI_API_KEY=... npm run ai:test -- --provider=gemini  # Google AI Studio / Gemini API
 *   npm run ai:test -- --provider=gemini --api-key=... --model=gemini-2.5-flash
 *
 * Kunci API juga bisa diletakkan di hub-dwell-monitor/.env (lihat .env.example).
 *
 * Hasil:
 *   scripts/ai-scenarios/scenario-<slug>.input.json   (payload yang dikirim)
 *   scripts/ai-scenarios/scenario-<slug>.output.json  (output + validasi tiap skenario)
 *   scripts/ai-scenarios/validation-report.json       (rekap 4 skenario)
 *   public/data/ai-summary.json                       (dipakai aplikasi, dari skenario normal)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MODEL, generateSummary, loadDotEnv, resolveApiKey } from "./lib/gemini-client.mjs";
import {
  PROMPT_VERSION,
  SCENARIOS,
  buildAiPayload,
  buildScenarioPayload,
  loadPrompt,
  mockSummarize,
  renderUserPrompt,
  validateSummary,
} from "./lib/summary-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const OUT_DIR = resolve(here, "ai-scenarios");
const APP_SUMMARY = resolve(root, "public/data/ai-summary.json");

function argValue(name) {
  const prefix = "--" + name + "=";
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const dotEnv = loadDotEnv();
const apiKey = resolveApiKey({
  flagValue: argValue("api-key"),
  env: { ...dotEnv, ...process.env },
});
const model = argValue("model") ?? process.env.GEMINI_MODEL ?? dotEnv.GEMINI_MODEL ?? DEFAULT_MODEL;
const providerFlag = argValue("provider");
const provider = providerFlag ?? (apiKey ? "gemini" : "mock");

if (provider !== "mock" && provider !== "gemini") {
  console.error("Provider tidak dikenal: " + provider + " (pakai mock atau gemini).");
  process.exit(1);
}
if (provider === "gemini" && !apiKey) {
  console.error(
    "Provider gemini dipilih tetapi kunci API belum ada.\n" +
      "  1. Ambil kunci di https://aistudio.google.com/apikey\n" +
      "  2. Simpan sebagai GEMINI_API_KEY di hub-dwell-monitor/.env (lihat .env.example)\n" +
      "     atau jalankan: npm run ai:test -- --provider=gemini --api-key=KUNCI_KAMU",
  );
  process.exit(1);
}

const READER = (path) => JSON.parse(readFileSync(path, "utf8"));

function expectationsFor(scenario) {
  switch (scenario.expect) {
    case "priority":
      return { expectPriorityList: true };
    case "none":
      return { expectNoPriority: true };
    case "unavailable":
      return { expectDataUnavailable: true };
    default:
      return { expectPriorityList: true, expectInjectionIgnored: true };
  }
}

async function runScenario(scenario, prompt, payload) {
  const userPrompt = renderUserPrompt(prompt.userTemplate, payload);
  if (provider === "mock") {
    return { output: mockSummarize(payload), rawText: null, attempts: 0 };
  }
  const result = await generateSummary({
    apiKey,
    model,
    systemInstruction: prompt.systemInstruction,
    userPrompt,
    temperature: Number(argValue("temperature") ?? 0),
  });
  return {
    output: result.output,
    rawText: JSON.stringify(result.raw).slice(0, 8000),
    attempts: result.attempts,
  };
}

async function main() {
  const prompt = loadPrompt();
  const metrics = READER(resolve(root, "public/data/metrics.json"));
  const locations = READER(resolve(root, "public/data/locations.json"));
  const basePayload = buildAiPayload(metrics, locations);
  mkdirSync(OUT_DIR, { recursive: true });

  const modelLabel = provider === "gemini" ? model : "mock-rule-based-v1 (offline stand-in)";
  const report = {
    provider,
    model: modelLabel,
    api_key_source: provider === "gemini" ? (argValue("api-key") ? "--api-key flag" : "env/.env") : null,
    prompt_version: prompt.version ?? PROMPT_VERSION,
    prompt_file: "scripts/ai-summary-prompt.md",
    generated_at: new Date().toISOString(),
    scenarios: [],
  };

  for (const scenario of SCENARIOS) {
    const payload = buildScenarioPayload(basePayload, scenario.id);
    writeFileSync(
      resolve(OUT_DIR, "scenario-" + scenario.slug + ".input.json"),
      JSON.stringify(payload, null, 2) + "\n",
      "utf8",
    );

    let result = null;
    let error = null;
    try {
      result = await runScenario(scenario, prompt, payload);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }

    const validation = error
      ? { ok: false, errors: [error], warnings: [] }
      : validateSummary(result.output, payload, expectationsFor(scenario));

    const record = {
      scenario: { id: scenario.id, slug: scenario.slug, title: scenario.title, expect: scenario.expect },
      provider,
      model: modelLabel,
      generated_at: new Date().toISOString(),
      attempts: result?.attempts ?? 0,
      input_digest: {
        hub_count: payload.hubs.length,
        completed_visits: payload.global?.completed_visits ?? 0,
        priority_rule: payload.rules?.priority_definition,
        hub_names: payload.hubs.map((hub) => hub.hub_name),
      },
      output: result?.output ?? null,
      raw_response_text: result?.rawText ?? null,
      validation,
    };
    writeFileSync(
      resolve(OUT_DIR, "scenario-" + scenario.slug + ".output.json"),
      JSON.stringify(record, null, 2) + "\n",
      "utf8",
    );

    report.scenarios.push({
      id: scenario.id,
      slug: scenario.slug,
      title: scenario.title,
      ok: validation.ok,
      errors: validation.errors,
      warnings: validation.warnings,
      priority_hubs: result?.output?.priority_hubs ?? null,
      summary: result?.output?.summary ?? null,
    });

    console.log((validation.ok ? "PASS" : "FAIL") + "  " + scenario.title + "  (" + scenario.id + ")");
    if (!validation.ok) validation.errors.forEach((message) => console.log("      - " + message));
  }

  writeFileSync(
    resolve(OUT_DIR, "validation-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );

  const normalScenario = report.scenarios.find((entry) => entry.slug === "normal");
  if (normalScenario && normalScenario.ok) {
    const normalOutput = READER(resolve(OUT_DIR, "scenario-normal.output.json"));
    writeFileSync(
      APP_SUMMARY,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          model: modelLabel,
          provider,
          prompt_version: report.prompt_version,
          source_scenario: "1-normal (data metrics.json produksi)",
          disclaimer: "Ambang 6 jam adalah aturan simulasi latihan Day 19, bukan SLA resmi Anteraja.",
          summary: normalOutput.output.summary,
          priority_hubs: normalOutput.output.priority_hubs,
          next_checks: normalOutput.output.next_checks,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    console.log("public/data/ai-summary.json diperbarui dari skenario 1-normal.");
  }

  const failed = report.scenarios.filter((entry) => !entry.ok);
  console.log("Provider: " + modelLabel + (provider === "gemini" ? " (kunci API terdeteksi)" : ""));
  console.log("Skenario lulus: " + (report.scenarios.length - failed.length) + "/" + report.scenarios.length);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

