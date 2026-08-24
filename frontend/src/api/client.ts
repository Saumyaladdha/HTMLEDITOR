const BASE = "/api";

/** Carries the HTTP status alongside the message, so callers can tell a
 * recoverable, specific failure apart from a generic one — a 409 from a
 * concurrent save needs an "overwrite?" prompt, not the same red toast as a
 * network blip. A plain Error threw all of that away. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = localStorage.getItem("access_token");
let refreshToken: string | null = localStorage.getItem("refresh_token");

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isLoggedIn() {
  return accessToken !== null;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
}

/** Thin fetch wrapper: attaches the bearer token, retries once on 401 after
 * a silent refresh, and throws a readable Error on any non-2xx response
 * (with the server's own detail message when available) so callers don't
 * have to re-parse fetch's awkward error shape at every call site. */
export async function apiFetch<T>(path: string, opts: RequestOpts = {}, _retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.isFormData) {
      body = opts.body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(`${BASE}${path}`, { method: opts.method ?? "GET", headers, body });

  if (res.status === 401 && !_retried && (await refreshAccessToken())) {
    return apiFetch<T>(path, opts, true);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      /* response wasn't JSON, keep statusText */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}
