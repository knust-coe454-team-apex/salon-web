import { useState } from "react";
import { api, setToken } from "../lib/api";
import { useAuth } from "../lib/auth-context";

export default function Register({ onBack }: { onBack: () => void }) {
  const { refresh } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const t = setTimeout(() => setSlow(true), 4000);
    const r = await api<{ token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        businessName: businessName.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    clearTimeout(t);
    setSlow(false);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setToken(r.data.token);
    await refresh();
  }

  const valid =
    businessName.trim().length >= 2 &&
    name.trim().length >= 2 &&
    email.includes("@") &&
    password.length >= 8;

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <h1 className="wordmark">Salon</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
          Set up your business. You'll be the owner.
        </p>

        <form onSubmit={submit}>
          <label className="field">
            <span>Business name</span>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Adjoa's Nails & More"
            />
          </label>

          <label className="field">
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password (at least 8 characters)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={!valid || busy} style={{ width: "100%", marginTop: 8 }}>
            {busy ? "Creating…" : "Create my business"}
          </button>

          {slow && (
            <p className="muted" style={{ fontSize: 14, textAlign: "center" }}>
              Waking the server — this can take up to a minute the first time.
            </p>
          )}
        </form>

        <p style={{ textAlign: "center", marginTop: 20 }}>
          <button className="linklike" onClick={onBack} type="button">
            Already set up? Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
