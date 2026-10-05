/** Reads a cookie value (used for the Laravel XSRF token). */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  errors?: unknown;
}

/**
 * Structured API failure: the PRD envelope carries a machine code and, for
 * the fake-GPS gate (FRD-06), the list of reasons behind the block.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null = null,
    readonly status: number = 0,
    readonly details: ApiErrorPayload | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
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
    throw await apiError(response);
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
    throw await apiError(response);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

/**
 * Multipart POST/PUT/PATCH (used for the POD photo upload). The browser sets
 * the multipart boundary, so no Content-Type header is passed here.
 */
export async function sendForm<T>(
  method: "POST" | "PUT" | "PATCH",
  url: string,
  form: FormData,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: jsonHeaders(),
    body: form,
  });

  if (!response.ok) {
    throw await apiError(response);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function apiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as {
      error?: ApiErrorPayload;
      message?: string;
    };
    const message =
      payload.error?.message ??
      payload.message ??
      `Permintaan gagal (${response.status} ${response.statusText})`;

    return new ApiError(
      message,
      payload.error?.code ?? null,
      response.status,
      payload.error ?? null,
    );
  } catch {
    return new ApiError(
      `Permintaan gagal (${response.status} ${response.statusText})`,
      null,
      response.status,
    );
  }
}
