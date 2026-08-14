import { useEffect, useState } from "react";
import { api, cedi } from "../lib/api";
import { useAuth } from "../lib/auth-context";

type OwnerDash = {
  role: "owner";
  today: { totalTakings: number; salesCount: number; cash: number; momo: number };
  lowStockCount: number;
  recentActivity: {
    id: string;
    date: string;
    total: number;
    paymentMethod: string;
    itemCount: number;
    pending?: boolean;
  }[];
};

type StaffDash = {
  role: "staff";
  salesCountToday: number;
  lowStockCount: number;
  recentActivity: { id: string; date: string; paymentMethod: string; itemCount: number; pending?: boolean }[];
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<OwnerDash | StaffDash | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Daily-summary SMS state
  const [phone, setPhone] = useState("");
  const [showSms, setShowSms] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsResult, setSmsResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const load = () => api<OwnerDash | StaffDash>("/dashboard").then((r) => {
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
    void load();
    const refresh = () => void load();
    window.addEventListener("nailflow-data-refresh", refresh);
    return () => window.removeEventListener("nailflow-data-refresh", refresh);
  }, []);

  async function sendSummary() {
    setSmsBusy(true);
    setSmsResult(null);
    const r = await api<{ sent: boolean; error?: string; preview: string }>(
      "/notify/daily-summary",
      { method: "POST", body: JSON.stringify({ phone: phone.trim() }) }
    );
    setSmsBusy(false);
    if (r.ok && r.data.sent) {
      setSmsResult({ ok: true, text: `Sent to ${phone.trim()}.` });
    } else {
      // Show the composed preview even when the provider hasn't sent —
      // the summary is real; only delivery is pending.
      const preview = (r.ok ? r.data.preview : "") || "";
      setSmsResult({
        ok: false,
        text: preview
          ? `Couldn't send yet, but here's today's summary:\n\n${preview}`
          : "Couldn't send the summary. Please try again.",
      });
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GH", { hour: "numeric", minute: "2-digit" });

  return (
    <div>
      <p className="eyebrow">Today</p>

      {data.role === "owner" ? (
        <>
          {/* The number she currently gets by counting cash at closing. */}
          <div className="takings">
            <span className="takings-sign">GH₵</span>
            <span className="takings-value">
              {data.today.totalTakings.toLocaleString("en-GH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="split">
            <div>
              <span className="split-label">Cash</span>
              <strong>{cedi(data.today.cash)}</strong>
            </div>
            <div>
              <span className="split-label">Mobile money</span>
              <strong>{cedi(data.today.momo)}</strong>
            </div>
            <div>
              <span className="split-label">Sales</span>
              <strong>{data.today.salesCount}</strong>
            </div>
          </div>

          {/* Send today's takings to the owner's phone at closing. */}
          <div className="card" style={{ marginTop: 12, marginBottom: 4 }}>
            {!showSms ? (
              <button className="ghost" style={{ width: "100%" }} onClick={() => setShowSms(true)}>
                Text me today's summary
              </button>
            ) : (
              <div>
                <p className="split-label" style={{ marginBottom: 8 }}>
                  Send today's takings by SMS
                </p>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 55 000 0000"
                  style={{ marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="ghost"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowSms(false);
                      setSmsResult(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    style={{ flex: 1 }}
                    disabled={smsBusy || phone.trim().length < 8}
                    onClick={sendSummary}
                  >
                    {smsBusy ? "Sending…" : "Send"}
                  </button>
                </div>

                {smsResult && (
                  <p
                    className={smsResult.ok ? "muted" : "muted"}
                    style={{
                      marginTop: 12,
                      marginBottom: 0,
                      fontSize: 14,
                      whiteSpace: "pre-wrap",
                      color: smsResult.ok ? "var(--jade)" : "var(--ink-soft)",
                    }}
                  >
                    {smsResult.text}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            <strong>{data.salesCountToday}</strong> sales recorded today
          </p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Takings are visible to the owner only.
          </p>
        </div>
      )}

      {data.lowStockCount > 0 && (
        <div className="alert">
          {data.lowStockCount} {data.lowStockCount === 1 ? "item is" : "items are"} running low
        </div>
      )}

      <h2 className="section-head">Recent sales</h2>
      {data.recentActivity.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No sales yet today.</p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Record one and it will appear here.
          </p>
        </div>
      ) : (
        <ul className="list">
          {data.recentActivity.map((s) => (
            <li key={s.id}>
              <div>
                <strong>
                  {"total" in s ? cedi(s.total) : s.paymentMethod === "cash" ? "Cash sale" : "MoMo sale"}
                </strong>
                <span className="muted" style={{ fontSize: 14, display: "block" }}>
                  {s.itemCount} item{s.itemCount === 1 ? "" : "s"} · {s.paymentMethod === "cash" ? "Cash" : "MoMo"}
                </span>
                {s.pending && <span className="pending-badge">Pending sync</span>}
              </div>
              <span className="muted" style={{ fontSize: 14 }}>{time(s.date)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>
        Signed in as {user?.name} ({user?.role})
      </p>
    </div>
  );
}
