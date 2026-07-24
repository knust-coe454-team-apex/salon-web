import { useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, clearToken } from "./api";
import { AuthCtx, type User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Derive the initial value rather than correcting it inside the effect:
  // if there's no stored token there is nothing to restore, so we're not loading.
  const [loading, setLoading] = useState(() => !!getToken());

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
    <AuthCtx.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
