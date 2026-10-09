/**
 * gemini-client.mjs - klien tipis untuk Google AI Studio (Gemini API).
 *
 * Dipakai runner `scripts/run-ai-scenarios.mjs` ketika provider gemini dipilih:
 *
 *   GEMINI_API_KEY=... npm run ai:test -- --provider=gemini
 *   npm run ai:test -- --provider=gemini --api-key=... --model=gemini-2.5-flash
 *
 * Kunci bisa datang dari (urut prioritas): flag --api-key, environment variable
 * GEMINI_API_KEY / GOOGLE_API_KEY / AI_STUDIO_API_KEY, atau file .env di folder aplikasi.
 * Kunci TIDAK pernah dicetak ke console maupun disimpan ke berkas bukti.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseModelJson } from "./summary-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = resolve(here, "../..");

export const DEFAULT_MODEL = "gemini-2.5-flash";
export const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Skema JSON yang diminta ke Gemini (tipe harus uppercase sesuai REST API). */
export const SUMMARY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    priority_hubs: { type: "ARRAY", items: { type: "STRING" } },
    next_checks: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["summary", "priority_hubs", "next_checks"],
};

const KEY_VARIABLES = ["GEMINI_API_KEY", "GOOGLE_API_KEY", "AI_STUDIO_API_KEY", "AISTUDIO_API_KEY"];

export function resolveApiKey({ flagValue, env = {} } = {}) {
  const candidates = [flagValue, ...KEY_VARIABLES.map((name) => env[name])];
  const found = candidates.find((value) => typeof value === "string" && value.trim() !== "");
  return found ? found.trim() : null;
}

/** Parser .env sederhana (KEY=VALUE, dukung tanda kutip, abaikan komentar). */
export function parseDotEnv(text) {
  const result = {};
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key !== "") result[key] = value;
  }
  return result;
}

export function loadDotEnv(path = resolve(APP_ROOT, ".env")) {
  try {
    return parseDotEnv(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

export function buildGenerateContentRequest({ systemInstruction, userPrompt, temperature = 0 }) {
  return {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
      responseSchema: SUMMARY_RESPONSE_SCHEMA,
    },
  };
}

export function extractCandidateText(responseJson) {
  const candidate = responseJson?.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (text.trim() === "") {
    const reason = candidate?.finishReason ?? responseJson?.promptFeedback?.blockReason ?? "tidak diketahui";
    throw new Error("Model tidak mengembalikan teks JSON (finishReason: " + reason + ").");
  }
  return text;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Memanggil Gemini dan mengembalikan objek JSON hasil parse.
 * fetchImpl bisa disuntik pada unit test supaya tidak menyentuh jaringan.
 */
export async function generateSummary(options) {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    systemInstruction,
    userPrompt,
    temperature = 0,
    fetchImpl = globalThis.fetch,
    maxAttempts = 3,
    retryDelayMs = 700,
    sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  } = options ?? {};

  if (!apiKey) throw new Error("Kunci API belum tersedia untuk provider gemini.");
  if (typeof fetchImpl !== "function") throw new Error("fetch tidak tersedia di runtime ini.");

  const url = API_BASE + "/" + model + ":generateContent";
  const body = JSON.stringify(buildGenerateContentRequest({ systemInstruction, userPrompt, temperature }));
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body,
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 600);
        const retryable = RETRYABLE_STATUS.has(response.status);
        lastError = new Error(
          "Gemini API gagal (HTTP " +
            response.status +
            ")" +
            (response.status === 400 || response.status === 403
              ? " - periksa kunci API dan pastikan Generative Language API aktif"
              : "") +
            ": " +
            detail,
        );
        if (retryable && attempt < maxAttempts) {
          await sleep(retryDelayMs * attempt);
          continue;
        }
        throw lastError;
      }

      const json = await response.json();
      return { output: parseModelJson(extractCandidateText(json)), raw: json, attempts: attempt };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /HTTP (429|5\d\d)/.test(message) || /fetch failed|network/i.test(message);
      if (retryable && attempt < maxAttempts) {
        await sleep(retryDelayMs * attempt);
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Permintaan ke Gemini gagal.");
}

