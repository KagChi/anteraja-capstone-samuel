import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL,
  SUMMARY_RESPONSE_SCHEMA,
  buildGenerateContentRequest,
  extractCandidateText,
  generateSummary,
  parseDotEnv,
  resolveApiKey,
} from "../scripts/lib/gemini-client.mjs";

const SUMMARY = { summary: "Ringkasan uji", priority_hubs: ["HUB_MKS"], next_checks: ["a", "b"] };

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function successPayload(text = JSON.stringify(SUMMARY)) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe("kunci API Google AI Studio", () => {
  it("menerima kunci dari flag, env umum, maupun alias AI Studio", () => {
    expect(resolveApiKey({ flagValue: "flag-key", env: { GEMINI_API_KEY: "env-key" } })).toBe("flag-key");
    expect(resolveApiKey({ env: { GEMINI_API_KEY: "a" } })).toBe("a");
    expect(resolveApiKey({ env: { GOOGLE_API_KEY: "b" } })).toBe("b");
    expect(resolveApiKey({ env: { AI_STUDIO_API_KEY: "c" } })).toBe("c");
    expect(resolveApiKey({ env: { GEMINI_API_KEY: "   " } })).toBeNull();
    expect(resolveApiKey({})).toBeNull();
  });

  it("membaca .env dengan komentar, tanda kutip, dan nilai kosong", () => {
    const parsed = parseDotEnv(
      [
        "# komentar",
        'GEMINI_API_KEY="kunci-123"',
        "GEMINI_MODEL='gemini-2.5-flash'",
        "KOSONG=",
        "TANPA_SAMA_DENGAN",
      ].join("\n"),
    );
    expect(parsed.GEMINI_API_KEY).toBe("kunci-123");
    expect(parsed.GEMINI_MODEL).toBe("gemini-2.5-flash");
    expect(parsed.KOSONG).toBe("");
    expect(Object.keys(parsed)).toHaveLength(3);
  });
});

describe("bentuk permintaan ke Gemini", () => {
  it("meminta JSON terstruktur dengan skema uppercase", () => {
    const request = buildGenerateContentRequest({
      systemInstruction: "instruksi sistem",
      userPrompt: "DATA: {...}",
      temperature: 0,
    });
    expect(request.systemInstruction.parts[0].text).toBe("instruksi sistem");
    expect(request.contents[0].role).toBe("user");
    expect(request.contents[0].parts[0].text).toBe("DATA: {...}");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseSchema).toBe(SUMMARY_RESPONSE_SCHEMA);
    expect(request.generationConfig.responseSchema.type).toBe("OBJECT");
    expect(request.generationConfig.responseSchema.properties.priority_hubs.items.type).toBe("STRING");
    expect(request.generationConfig.responseSchema.required).toEqual([
      "summary",
      "priority_hubs",
      "next_checks",
    ]);
  });

  it("mengirim kunci lewat header, bukan query string", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return response(successPayload());
    };
    const result = await generateSummary({
      apiKey: "kunci-rahasia",
      systemInstruction: "s",
      userPrompt: "u",
      fetchImpl,
    });

    expect(calls).toHaveLength(1);
    const expectedUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/" + DEFAULT_MODEL + ":generateContent";
    expect(calls[0].url).toBe(expectedUrl);
    expect(calls[0].url).not.toContain("kunci-rahasia");
    expect(calls[0].init.headers["x-goog-api-key"]).toBe("kunci-rahasia");
    expect(JSON.parse(calls[0].init.body).contents[0].parts[0].text).toBe("u");
    expect(result.output).toEqual(SUMMARY);
    expect(result.attempts).toBe(1);
  });

  it("menerima jawaban yang terbalut pagar markdown", async () => {
    const fenced = "\u0060\u0060\u0060json\n" + JSON.stringify(SUMMARY) + "\n\u0060\u0060\u0060";
    const fetchImpl = async () => response(successPayload(fenced));
    const result = await generateSummary({
      apiKey: "k",
      systemInstruction: "s",
      userPrompt: "u",
      fetchImpl,
    });
    expect(result.output.summary).toBe("Ringkasan uji");
  });

  it("mencoba ulang saat rate limit lalu berhasil", async () => {
    let attempt = 0;
    const sleeps = [];
    const fetchImpl = async () => {
      attempt += 1;
      if (attempt === 1) return response({ error: { message: "rate limited" } }, 429);
      return response(successPayload());
    };
    const result = await generateSummary({
      apiKey: "k",
      systemInstruction: "s",
      userPrompt: "u",
      fetchImpl,
      sleep: async (ms) => sleeps.push(ms),
      retryDelayMs: 5,
    });
    expect(result.attempts).toBe(2);
    expect(sleeps).toHaveLength(1);
  });

  it("memberi pesan jelas saat kunci ditolak dan tidak mengulang", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return response({ error: { message: "API key not valid" } }, 400);
    };
    await expect(
      generateSummary({ apiKey: "salah", systemInstruction: "s", userPrompt: "u", fetchImpl }),
    ).rejects.toThrow(/periksa kunci API/);
    expect(calls).toBe(1);
  });

  it("menolak panggilan tanpa kunci API", async () => {
    await expect(generateSummary({ systemInstruction: "s", userPrompt: "u" })).rejects.toThrow(
      /Kunci API belum tersedia/,
    );
  });

  it("melaporkan alasan ketika model tidak mengembalikan teks", () => {
    expect(() => extractCandidateText({ candidates: [{ finishReason: "SAFETY" }] })).toThrow(/SAFETY/);
  });
});

