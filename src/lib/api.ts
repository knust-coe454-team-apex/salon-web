import { applyOptimisticChange, getCached, queueMutation, setCached, syncMutations } from "./offline-store";

const BASE = import.meta.env.VITE_API_URL;

export type ApiResult<T> =
  | { ok: true; data: T; offline?: boolean; queued?: boolean }
  | { ok: false; error: string; status: number };

export const getToken = () => localStorage.getItem("salon_token");
export const setToken = (t: string) => localStorage.setItem("salon_token", t);
export const clearToken = () => localStorage.removeItem("salon_token");

const isAuthWrite = (path: string) => path === "/auth/login" || path === "/auth/register";

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<ApiResult<T>> {
  const token = getToken();
  const method = (opts.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (method === "GET") {
    try {
      const res = await fetch(`${BASE}${path}`, { ...opts, headers });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const cached = await getCached<T>(path);
        if (cached !== undefined && res.status >= 500) return { ok: true, data: cached, offline: true };
        return { ok: false, error: (body.error as string) ?? `Request failed (${res.status})`, status: res.status };
      }
      await setCached(path, body);
      return { ok: true, data: body as T };
    } catch {
      const cached = await getCached<T>(path);
      if (cached !== undefined) return { ok: true, data: cached, offline: true };
      return { ok: false, error: "This information is not available offline yet. Connect once to download it.", status: 0 };
    }
  }

  try {
    if (!navigator.onLine) throw new TypeError("Offline");
    const res = await fetch(`${BASE}${path}`, { ...opts, method, headers });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: (body.error as string) ?? `Request failed (${res.status})`, status: res.status };
    return { ok: true, data: body as T };
  } catch {
    if (isAuthWrite(path)) return { ok: false, error: "Connect to the internet to sign in or create a business.", status: 0 };
    const queueId = await queueMutation({ path, method, body: opts.body as string | undefined, token });
    const localId = `offline-${queueId}`;
    await applyOptimisticChange(path, method, opts.body as string | undefined, localId);
    return {
      ok: true,
      data: { id: localId, queued: true, offline: true } as T,
      offline: true,
      queued: true,
    };
  }
}

export const syncOfflineQueue = () => syncMutations(BASE);

export const cedi = (n: number) =>
  `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
