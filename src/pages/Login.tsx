import { useState } from "react";
import { useAuth } from "../lib/auth-context";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    // The free hosting tier sleeps when idle; say so instead of looking frozen.
    const t = setTimeout(() => setSlow(true), 4000);
    const err = await signIn(email.trim(), password);
    clearTimeout(t);
    setSlow(false);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <h1 className="wordmark">Salon</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
          Sign in to record sales and see the day's takings.
        </p>

        <form onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          {slow && (
            <p className="muted" style={{ fontSize: 14, textAlign: "center" }}>
              Waking the server — this can take up to a minute the first time.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
