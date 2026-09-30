import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, sendJson } from "./api";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchJson", () => {
  it("returns the parsed payload", async () => {
    mockFetch(200, { success: true, data: [1, 2] });

    await expect(fetchJson("/api/v1/x")).resolves.toEqual({
      success: true,
      data: [1, 2],
    });
  });

  it("throws the envelope error message", async () => {
    mockFetch(422, {
      success: false,
      data: null,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid." },
    });

    await expect(fetchJson("/api/v1/x")).rejects.toThrow("Data tidak valid.");
  });
});

describe("sendJson", () => {
  it("posts JSON with credentials and the XSRF header", async () => {
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=token%2Bvalue" });
    const fn = mockFetch(201, { success: true, data: { id: "1" } });

    await sendJson("POST", "/api/v1/x", { a: 1 });

    const call = fn.mock.calls[0] as unknown as [string, RequestInit];
    const init = call[1];
    const headers = init.headers as Record<string, string>;

    expect(call[0]).toBe("/api/v1/x");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(headers["X-XSRF-TOKEN"]).toBe("token+value");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });
});
