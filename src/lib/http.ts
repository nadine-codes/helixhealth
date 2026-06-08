// Client-side fetch helpers that never throw a cryptic JSON parse error when a
// platform error (e.g. a Vercel function timeout) returns a non-JSON body.

export interface JsonResult<T = unknown> {
  res: Response;
  data: T | null;
  raw: string;
}

// Read the response body as text first, then attempt JSON.parse. If the body is
// not valid JSON (Vercel timeout/crash pages start with "An error o..."), data is
// null and the raw text is preserved for messaging.
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<JsonResult<T>> {
  const res = await fetch(input, init);
  const raw = await res.text();
  let data: T | null = null;
  try {
    data = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    data = null;
  }
  return { res, data, raw };
}

// Build a friendly error message from a JsonResult, preferring the API's own
// {error} field, then falling back to a status-aware hint for non-JSON bodies.
export function errorMessage(
  result: JsonResult<{ error?: string }>,
  fallback = "Something went wrong"
): string {
  const { res, data } = result;
  if (data?.error) return data.error;
  if (res.status === 504 || res.status === 408 || res.status === 503) {
    return `The reasoning step took too long (status ${res.status}). Please try again.`;
  }
  if (res.status >= 500) {
    return `The server hit an error (status ${res.status}). The reasoning step may have taken too long, please try again.`;
  }
  return `${fallback} (status ${res.status}).`;
}
