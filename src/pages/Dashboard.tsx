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
  }[];
};

type StaffDash = {
  role: "staff";
  salesCountToday: number;
  lowStockCount: number;
  recentActivity: { id: string; date: string; paymentMethod: string; itemCount: number }[];
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<OwnerDash | StaffDash | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<OwnerDash | StaffDash>("/dashboard").then((r) => {
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
  }, []);

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
