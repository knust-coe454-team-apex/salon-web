import { useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, clearToken } from "./api";
import { AuthCtx, type User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());

  async function refresh() {
    if (!getToken()) {
      setUser(null);
      return;
    }
    const r = await api<{ user: User }>("/auth/me");
    if (r.ok) setUser(r.data.user);
    else clearToken();
  }

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api<{ user: User }>("/auth/me").then((r) => {
      if (cancelled) return;
      if (r.ok) setUser(r.data.user);
      else clearToken();
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(email: string, password: string) {
    const r = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) return r.error;
    setToken(r.data.token);
    setUser(r.data.user);
    return null;
  }

  function signOut() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}
