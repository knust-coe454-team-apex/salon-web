const BASE = import.meta.env.VITE_API_URL;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export const getToken = () => localStorage.getItem("salon_token");
export const setToken = (t: string) => localStorage.setItem("salon_token", t);
export const clearToken = () => localStorage.removeItem("salon_token");

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<ApiResult<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, headers });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        error: (body.error as string) ?? `Request failed (${res.status})`,
        status: res.status,
      };
    }
    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection and try again.",
      status: 0,
    };
  }
}

// Amounts are always Ghana cedis.
export const cedi = (n: number) =>
  `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
