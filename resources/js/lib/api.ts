/** Reads a cookie value (used for the Laravel XSRF token). */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function jsonHeaders(): Record<string, string> {
  const token = readCookie("XSRF-TOKEN");

  return {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(token ? { "X-XSRF-TOKEN": token } : {}),
  };
}

export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    signal,
    credentials: "same-origin",
    headers: jsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  return (await response.json()) as T;
}

export async function sendJson<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { ...jsonHeaders(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };
    return (
      payload.error?.message ??
      payload.message ??
      `Permintaan gagal (${response.status} ${response.statusText})`
    );
  } catch {
    return `Permintaan gagal (${response.status} ${response.statusText})`;
  }
}
