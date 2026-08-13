import { useState } from "react";
import { ArrowRight, BarChart3, Eye, EyeOff, PackageCheck } from "lucide-react";
import { useAuth } from "../lib/auth-context";

export default function Login({ onRegister }: { onRegister: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const t = setTimeout(() => setSlow(true), 4000);
    const err = await signIn(email.trim(), password);
    clearTimeout(t);
    setSlow(false);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="auth-layout">
      <section className="auth-brand-panel">
        <div className="auth-brand"><span className="brand-mark"><img src="/nailflow-mark.svg" alt="" /></span><span>NailFlow</span></div>
        <div className="auth-pitch">
          <span className="pill">Built for modern nail businesses</span>
          <h1>Run your salon with clarity and confidence.</h1>
          <p>Keep sales, stock and business performance organised in one beautiful workspace.</p>
          <div className="feature-row"><PackageCheck size={21} /><span><strong>Know what is in stock</strong><small>Stay ahead of low inventory.</small></span></div>
          <div className="feature-row"><BarChart3 size={21} /><span><strong>Understand every cedi</strong><small>See sales and expenses clearly.</small></span></div>
        </div>
        <p className="auth-footer-note">Your salon, perfectly managed.</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-box">
          <div className="auth-mobile-brand"><span className="brand-mark"><img src="/nailflow-mark.svg" alt="" /></span><strong>NailFlow</strong></div>
          <p className="auth-eyebrow">Welcome back</p>
          <h2>Sign in to NailFlow</h2>
          <p className="muted auth-subtitle">Access your salon workspace and continue where you left off.</p>

          <form onSubmit={submit}>
            <label className="field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@salon.com" required /></label>
            <label className="field"><span>Password</span><div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
            {error && <p className="error">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in…" : <><span>Sign in</span><ArrowRight size={18} /></>}</button>
            {slow && <p className="muted helper-text">Connecting to your workspace—this may take a moment.</p>}
          </form>

          <p className="auth-switch">New to NailFlow? <button className="linklike" onClick={onRegister} type="button">Set up your business</button></p>
        </div>
      </section>
    </div>
  );
}
