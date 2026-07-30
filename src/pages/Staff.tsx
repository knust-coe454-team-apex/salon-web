import { useEffect, useState } from "react";
import { api } from "../lib/api";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  active: boolean;
};

export default function Staff() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load(signal?: { cancelled: boolean }) {
    const r = await api<StaffMember[]>("/auth/users");
    if (signal?.cancelled) return;
    if (r.ok) setMembers(r.data);
    else setError(r.error);
    setLoading(false);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, []);

  async function deactivate(id: string) {
    setError(null);
    const r = await api(`/auth/staff/${id}/deactivate`, { method: "PATCH" });
    if (!r.ok) return setError(r.error);
    await load();
  }

  if (loading) return <p className="muted">Loading…</p>;

  const staff = members.filter((m) => m.role === "staff");

  return (
    <div>
      <p className="eyebrow">Your team</p>

      {error && <p className="error">{error}</p>}

      {showForm ? (
        <StaffForm
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await load();
          }}
          setError={setError}
        />
      ) : (
        <button
          className="ghost"
          style={{ width: "100%", marginBottom: 12 }}
          onClick={() => setShowForm(true)}
        >
          + Add a staff member
        </button>
      )}

      {staff.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No staff yet.</p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Add your assistant so she can record sales — she won't see your money or reports.
          </p>
        </div>
      ) : (
        <ul className="list">
          {staff.map((m) => (
            <li key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <span className="muted" style={{ display: "block", fontSize: 13 }}>
                  {m.email} {m.active ? "" : "· deactivated"}
                </span>
              </div>
              {m.active && (
                <button className="ghost small" onClick={() => deactivate(m.id)}>
                  Deactivate
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StaffForm({
  onCancel,
  onSaved,
  setError,
}: {
  onCancel: () => void;
  onSaved: () => Promise<void>;
  setError: (v: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const r = await api("/auth/staff", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    await onSaved();
  }

  const valid = name.trim().length >= 2 && email.includes("@") && password.length >= 8;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <label className="field">
        <span>Staff member's name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Akosua" />
      </label>
      <label className="field">
        <span>Email (their login)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
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
      <div className="row-actions">
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <button disabled={!valid || busy} onClick={save}>
          {busy ? "Adding…" : "Add staff member"}
        </button>
      </div>
    </div>
  );
}
