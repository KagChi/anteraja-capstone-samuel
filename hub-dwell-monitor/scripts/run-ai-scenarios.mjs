#!/usr/bin/env node
/**
 * run-ai-scenarios.mjs - menjalankan 4 test scenario ringkasan AI lalu menyimpan bukti output.
 *
 *   npm run ai:test                          # provider mock (tanpa jaringan, deterministik)
 *   GEMINI_API_KEY=... npm run ai:test -- --provider=gemini   # Google AI Studio / Gemini API
 *
 * Hasil:
 *   scripts/ai-scenarios/scenario-<slug>.output.json  (output tiap skenario + validasi)
 *   scripts/ai-scenarios/validation-report.json       (rekap 4 skenario)
 *   public/data/ai-summary.json                       (dipakai aplikasi, dari skenario normal)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROMPT_VERSION,
  SCENARIOS,
  buildAiPayload,
  buildScenarioPayload,
  loadPrompt,
  mockSummarize,
  parseModelJson,
  renderUserPrompt,
  validateSummary,
} from "./lib/summary-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const OUT_DIR = resolve(here, "ai-scenarios");
const APP_SUMMARY = resolve(root, "public/data/ai-summary.json");

const providerArg = process.argv.slice(2).find((arg) => arg.startsWith("--provider="));
const provider = providerArg
  ? providerArg.split("=")[1]
  : process.env.GEMINI_API_KEY
    ? "gemini"
    : "mock";
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const READER = (path) => JSON.parse(readFileSync(path, "utf8"));

async function callGemini(systemInstruction, userPrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum diisi untuk provider gemini.");
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    geminiModel +
    ":generateContent?key=" +
    key;
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          priority_hubs: { type: "array", items: { type: "string" } },
          next_checks: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "priority_hubs", "next_checks"],
      },
    },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Gemini API gagal (" + response.status + "): " + (await response.text()));
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return parseModelJson(text);
}

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

async function main() {
  const prompt = loadPrompt();
  const metrics = READER(resolve(root, "public/data/metrics.json"));
  const locations = READER(resolve(root, "public/data/locations.json"));
  const basePayload = buildAiPayload(metrics, locations);
  mkdirSync(OUT_DIR, { recursive: true });

  const report = {
    provider,
    model: provider === "gemini" ? geminiModel : "mock-rule-based-v1 (offline stand-in)",
    prompt_version: prompt.version ?? PROMPT_VERSION,
    prompt_file: "scripts/ai-summary-prompt.md",
    generated_at: new Date().toISOString(),
    scenarios: [],
  };

  for (const scenario of SCENARIOS) {
    const payload = buildScenarioPayload(basePayload, scenario.id);
    const userPrompt = renderUserPrompt(prompt.userTemplate, payload);
    let raw;
    let error = null;
    try {
      raw =
        provider === "gemini"
          ? await callGemini(prompt.systemInstruction, userPrompt)
          : mockSummarize(payload);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      raw = null;
    }
    const validation = error
      ? { ok: false, errors: [error], warnings: [] }
      : validateSummary(raw, payload, expectationsFor(scenario));

    const record = {
      scenario: { id: scenario.id, slug: scenario.slug, title: scenario.title, expect: scenario.expect },
      provider: report.model,
      generated_at: new Date().toISOString(),
      input_digest: {
        hub_count: payload.hubs.length,
        completed_visits: payload.global?.completed_visits ?? 0,
        priority_rule: payload.rules?.priority_definition,
        hub_names: payload.hubs.map((hub) => hub.hub_name),
      },
      output: raw,
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
      priority_hubs: raw?.priority_hubs ?? null,
      summary: raw?.summary ?? null,
    });

    console.log(
      (validation.ok ? "PASS" : "FAIL") + "  " + scenario.title + "  (" + scenario.id + ")",
    );
    if (!validation.ok) validation.errors.forEach((message) => console.log("      - " + message));
  }

  writeFileSync(
    resolve(OUT_DIR, "validation-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );

  const normalScenario = report.scenarios.find((entry) => entry.slug === "normal");
  if (normalScenario && normalScenario.ok) {
    const normalOutput = JSON.parse(
      readFileSync(resolve(OUT_DIR, "scenario-normal.output.json"), "utf8"),
    );
    writeFileSync(
      APP_SUMMARY,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          model: report.model,
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
  console.log("Provider: " + report.model);
  console.log("Skenario lulus: " + (report.scenarios.length - failed.length) + "/" + report.scenarios.length);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

