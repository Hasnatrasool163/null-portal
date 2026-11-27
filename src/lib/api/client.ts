import type { UseFormSetError, FieldValues, Path } from "react-hook-form";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** fetch wrapper for our { ok, data | error } API format. Throws ApiClientError on failure. */
export async function api<T>(
  url: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK",
      "Network error. Check your connection.",
    );
  }
  const json = await res.json().catch(() => null);
  if (!json?.ok) {
    const e = json?.error;
    throw new ApiClientError(
      res.status,
      e?.code ?? "UNKNOWN",
      e?.message ?? "Something went wrong",
      e?.fields,
    );
  }
  return json.data as T;
}

/** Show server-side field errors (409/400) next to the matching form inputs. */
export function applyFieldErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
) {
  if (err instanceof ApiClientError && err.fields) {
    for (const [k, message] of Object.entries(err.fields))
      setError(k as Path<T>, { message });
    return true;
  }
  return false;
}

/** Build a `?a=1&b=2` query string, dropping empty/undefined values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
