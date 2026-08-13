import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
    <div className="auth-layout register-layout">
      <section className="auth-brand-panel register-panel">
        <div className="auth-brand"><span className="brand-mark"><img src="/nailflow-mark.svg" alt="" /></span><span>NailFlow</span></div>
        <div className="auth-pitch">
          <span className="pill">Start simply</span>
          <h1>A calmer way to manage your growing salon.</h1>
          <p>Create your workspace, add your services and products, then start recording sales in minutes.</p>
        </div>
        <p className="auth-footer-note">Stock. Sales. Success.</p>
      </section>
      <section className="auth-form-panel register-form-panel">
      <div className="auth-box register-box">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={18} /> Back to sign in</button>
        <div className="auth-mobile-brand"><span className="brand-mark"><img src="/nailflow-mark.svg" alt="" /></span><strong>NailFlow</strong></div>
        <p className="auth-eyebrow">Create your workspace</p>
        <h2>Set up your business</h2>
        <p className="muted auth-subtitle">You will be registered as the business owner.</p>

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

          <button className="primary-button" type="submit" disabled={!valid || busy}>
            {busy ? "Creating…" : <><span>Create my business</span><ArrowRight size={18} /></>}
          </button>

          {slow && (
            <p className="muted" style={{ fontSize: 14, textAlign: "center" }}>
              Waking the server — this can take up to a minute the first time.
            </p>
          )}
        </form>

      </div>
      </section>
    </div>
  );
}
