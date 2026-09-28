export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Permintaan gagal (${response.status} ${response.statusText})`,
    );
  }

  return (await response.json()) as T;
}
