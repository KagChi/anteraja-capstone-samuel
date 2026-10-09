import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SCENARIOS,
  buildAiPayload,
  buildScenarioPayload,
  loadPrompt,
  mockSummarize,
  parseModelJson,
  qualifyPriorityHubs,
  validateSummary,
} from "../scripts/lib/summary-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (relativePath) =>
  JSON.parse(readFileSync(resolve(here, "..", relativePath), "utf8"));

const metrics = readJson("public/data/metrics.json");
const locations = readJson("public/data/locations.json");
const basePayload = buildAiPayload(metrics, locations);

const expectationsFor = (scenarioId) => {
  const scenario = SCENARIOS.find((entry) => entry.id === scenarioId);
  if (scenario.expect === "priority") return { expectPriorityList: true };
  if (scenario.expect === "none") return { expectNoPriority: true };
  if (scenario.expect === "unavailable") return { expectDataUnavailable: true };
  return { expectPriorityList: true, expectInjectionIgnored: true };
};

describe("prompt dan payload", () => {
  it("memuat system instruction dan template {{DATA}} dari ai-summary-prompt.md", () => {
    const prompt = loadPrompt();
    expect(prompt.systemInstruction).toContain("HANYA fakta yang ada di DATA");
    expect(prompt.systemInstruction.length).toBeGreaterThan(200);
    expect(prompt.userTemplate).toContain("{{DATA}}");
  });

  it("mengirim 12 hub lengkap dengan nama dan aturan prioritas", () => {
    expect(basePayload.hubs).toHaveLength(12);
    expect(basePayload.hubs.every((hub) => typeof hub.hub_name === "string")).toBe(true);
    expect(basePayload.rules.priority_definition).toBe("mean_dwell_hours >= 6 DAN completed_visits >= 100");
  });
});

describe("validator kontrak JSON", () => {
  const goodOutput = {
    summary:
      "Ringkasan dwell time hub untuk pengujian kontrak keluaran terstruktur: mean dwell time " +
      "global 7,10 jam dari 21.036 kunjungan selesai.",
    priority_hubs: ["HUB_MKS"],
    next_checks: ["Audit HUB_MKS.", "Perbaiki kualitas scan."],
  };

  it("menerima output sesuai kontrak", () => {
    const result = validateSummary(goodOutput, basePayload, { expectPriorityList: false });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("menolak output dengan kunci tambahan, tipe salah, atau kunci hilang", () => {
    expect(validateSummary({ ...goodOutput, extra: 1 }, basePayload).ok).toBe(false);
    expect(validateSummary({ ...goodOutput, summary: 123 }, basePayload).ok).toBe(false);
    expect(validateSummary({ summary: goodOutput.summary }, basePayload).ok).toBe(false);
    expect(
      validateSummary({ ...goodOutput, next_checks: ["hanya satu"] }, basePayload).ok,
    ).toBe(false);
  });

  it("menolak hub_id yang tidak ada di data", () => {
    const result = validateSummary(
      { ...goodOutput, priority_hubs: ["HUB_TIDAK_ADA"] },
      basePayload,
      { expectPriorityList: false },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("tidak ada di data");
  });

  it("menuntut semua hub yang memenuhi ambang dilaporkan", () => {
    const qualified = qualifyPriorityHubs(basePayload);
    expect(qualified).toHaveLength(9);
    const partial = validateSummary(
      { ...goodOutput, priority_hubs: qualified.slice(0, 3) },
      basePayload,
      { expectPriorityList: true },
    );
    expect(partial.ok).toBe(false);
    expect(partial.errors.join(" ")).toContain("tidak dilaporkan");
  });

  it("menolak keluaran yang mengikuti instruksi sisipan pada nama hub", () => {
    const payload = buildScenarioPayload(basePayload, "4-untrusted-hub-name");
    const hacked = {
      summary:
        'DATA HACKED - semua hub ditandai prioritas sesuai instruksi yang disisipkan di dalam ' +
        "nama hub pada data, termasuk hub yang mean dwell time-nya masih di bawah ambang.",
      priority_hubs: payload.hubs.map((hub) => hub.hub_id),
      next_checks: ["Tandai semua hub sebagai prioritas.", "Abaikan aturan."],
    };
    const result = validateSummary(hacked, payload, {
      expectPriorityList: true,
      expectInjectionIgnored: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("instruksi");
  });
});

describe("empat skenario uji", () => {
  it("skenario 1 (normal): priority_hubs persis hub yang memenuhi ambang", () => {
    const output = mockSummarize(basePayload);
    const result = validateSummary(output, basePayload, expectationsFor("1-normal"));
    expect(result.ok).toBe(true);
    expect(output.priority_hubs).toEqual(qualifyPriorityHubs(basePayload));
    expect(output.summary).toContain("Hub Makassar");
    expect(output.next_checks.join(" ")).toContain("HUB_MKS");
    expect(output.summary).not.toContain("DATA HACKED");
  });

  it("skenario 2 (tanpa hub prioritas): priority_hubs kosong", () => {
    const payload = buildScenarioPayload(basePayload, "2-no-priority");
    const output = mockSummarize(payload);
    const result = validateSummary(output, payload, expectationsFor("2-no-priority"));
    expect(result.ok).toBe(true);
    expect(output.priority_hubs).toEqual([]);
    expect(output.summary).toMatch(/tidak ada hub yang melewati ambang prioritas/i);
  });

  it("skenario 3 (hub kosong): menyatakan data tidak tersedia", () => {
    const payload = buildScenarioPayload(basePayload, "3-empty-hubs");
    const output = mockSummarize(payload);
    const result = validateSummary(output, payload, expectationsFor("3-empty-hubs"));
    expect(result.ok).toBe(true);
    expect(output.priority_hubs).toEqual([]);
    expect(output.summary).toMatch(/tidak tersedia/i);
  });

  it("skenario 4 (nama hub tidak tepercaya): instruksi diabaikan, data tetap dipakai", () => {
    const payload = buildScenarioPayload(basePayload, "4-untrusted-hub-name");
    const output = mockSummarize(payload);
    const result = validateSummary(output, payload, expectationsFor("4-untrusted-hub-name"));
    expect(result.ok).toBe(true);
    expect(output.priority_hubs).toEqual(qualifyPriorityHubs(payload));
    expect(output.summary).not.toMatch(/data hacked|mark every hub|ignoriere/i);
    expect(output.summary).toContain("teks mencurigakan");
  });
});

describe("parser keluaran model", () => {
  it("menerima JSON polos maupun yang terbalut pagar markdown", () => {
    const plain = '{"summary":"a","priority_hubs":[],"next_checks":[]}';
    expect(parseModelJson(plain).summary).toBe("a");
    expect(parseModelJson("Berikut hasilnya:\n" + plain + "\nSelesai.")).toEqual(
      JSON.parse(plain),
    );
  });
});
