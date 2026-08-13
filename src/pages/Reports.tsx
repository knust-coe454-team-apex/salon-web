import { useEffect, useState } from "react";
import { api, cedi } from "../lib/api";

type RangeReport = {
  period: { from: string; to: string };
  sales: {
    total: number;
    count: number;
    byPaymentMethod: { cash: number; momo: number };
    byType: { product: number; service: number };
  };
  expenses: {
    total: number;
    count: number;
    byCategory: Record<string, number>;
  };
  net: number;
  topProducts: { name: string; quantity: number; income: number }[];
  topServices: { name: string; quantity: number; income: number }[];
  pendingSales?: number;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presets() {
  const today = new Date();
  const week = new Date(today);
  week.setDate(today.getDate() - 6);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    today: { from: iso(today), to: iso(today) },
    week: { from: iso(week), to: iso(today) },
    month: { from: iso(month), to: iso(today) },
  };
}

export default function Reports() {
  const p = presets();
  const [which, setWhich] = useState<"today" | "week" | "month">("week");
  const [data, setData] = useState<RangeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExpense, setShowExpense] = useState(false);

  async function load(range: { from: string; to: string }, signal?: { cancelled: boolean }) {
    setLoading(true);
    const r = await api<RangeReport>(`/reports/range?from=${range.from}&to=${range.to}`);
    if (signal?.cancelled) return;
    if (r.ok) {
      setData(r.data);
      setError(null);
    } else setError(r.error);
    setLoading(false);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    const timer = window.setTimeout(() => void load(p[which], signal), 0);
    const refresh = () => void load(p[which], signal);
    window.addEventListener("nailflow-data-refresh", refresh);
    return () => {
      window.clearTimeout(timer);
      signal.cancelled = true;
      window.removeEventListener("nailflow-data-refresh", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [which]);

  const categories = data ? Object.entries(data.expenses.byCategory) : [];

  return (
    <div>
      <p className="eyebrow">Reports</p>

      <div className="segmented">
        <button className={which === "today" ? "seg on" : "seg"} onClick={() => setWhich("today")}>
          Today
        </button>
        <button className={which === "week" ? "seg on" : "seg"} onClick={() => setWhich("week")}>
          Last 7 days
        </button>
        <button className={which === "month" ? "seg on" : "seg"} onClick={() => setWhich("month")}>
          This month
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Working it out…</p>}

      {data && !loading && (
        <>
          {!!data.pendingSales && (
            <div className="alert pending-report">
              Includes {data.pendingSales} offline sale{data.pendingSales === 1 ? "" : "s"} waiting to sync
            </div>
          )}
          {/* Net is the answer to "am I making money", so it leads. */}
          <div className="netbox">
            <span className="split-label">
              {data.net >= 0 ? "Left after expenses" : "Short after expenses"}
            </span>
            <div className="takings" style={{ marginBottom: 0 }}>
              <span className="takings-sign">GH₵</span>
              <span className="takings-value" style={{ color: data.net >= 0 ? "var(--ink)" : "var(--lacquer-dark)" }}>
                {Math.abs(data.net).toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="split">
            <div>
              <span className="split-label">Money in</span>
              <strong>{cedi(data.sales.total)}</strong>
            </div>
            <div>
              <span className="split-label">Money out</span>
              <strong>{cedi(data.expenses.total)}</strong>
            </div>
            <div>
              <span className="split-label">Sales</span>
              <strong>{data.sales.count}</strong>
            </div>
          </div>

          <div className="split">
            <div>
              <span className="split-label">Cash</span>
              <strong>{cedi(data.sales.byPaymentMethod.cash)}</strong>
            </div>
            <div>
              <span className="split-label">Mobile money</span>
              <strong>{cedi(data.sales.byPaymentMethod.momo)}</strong>
            </div>
          </div>

          <div className="split">
            <div>
              <span className="split-label">From services</span>
              <strong>{cedi(data.sales.byType.service)}</strong>
            </div>
            <div>
              <span className="split-label">From products</span>
              <strong>{cedi(data.sales.byType.product)}</strong>
            </div>
          </div>

          {data.topServices.length > 0 && (
            <>
              <h2 className="section-head">Best services</h2>
              <ul className="list">
                {data.topServices.map((t) => (
                  <li key={t.name}>
                    <div>
                      <strong>{t.name}</strong>
                      <span className="muted" style={{ display: "block", fontSize: 13 }}>
                        {t.quantity} time{t.quantity === 1 ? "" : "s"}
                      </span>
                    </div>
                    <strong>{cedi(t.income)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data.topProducts.length > 0 && (
            <>
              <h2 className="section-head">Best products</h2>
              <ul className="list">
                {data.topProducts.map((t) => (
                  <li key={t.name}>
                    <div>
                      <strong>{t.name}</strong>
                      <span className="muted" style={{ display: "block", fontSize: 13 }}>
                        {t.quantity} sold
                      </span>
                    </div>
                    <strong>{cedi(t.income)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="section-head">Money out</h2>
          {showExpense ? (
            <ExpenseForm
              onCancel={() => setShowExpense(false)}
              onSaved={async () => {
                setShowExpense(false);
                await load(p[which]);
              }}
              setError={setError}
            />
          ) : (
            <button
              className="ghost"
              style={{ width: "100%", marginBottom: 12 }}
              onClick={() => setShowExpense(true)}
            >
              + Record an expense
            </button>
          )}

          {categories.length === 0 ? (
            <div className="card">
              <p style={{ margin: 0 }}>Nothing recorded for this period.</p>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                Add what you spend on stock, transport and bills to see real profit.
              </p>
            </div>
          ) : (
            <ul className="list">
              {categories.map(([cat, amount]) => (
                <li key={cat}>
                  <strong style={{ textTransform: "capitalize" }}>{cat}</strong>
                  <strong>{cedi(amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function ExpenseForm({
  onCancel,
  onSaved,
  setError,
}: {
  onCancel: () => void;
  onSaved: () => Promise<void>;
  setError: (v: string | null) => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("stock purchase");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const r = await api("/expenses", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(amount),
        category,
        note: note.trim() || undefined,
      }),
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    await onSaved();
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <label className="field">
        <span>Amount (GH₵)</span>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50"
        />
      </label>

      <label className="field">
        <span>What for</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="stock purchase">Stock purchase</option>
          <option value="transport">Transport</option>
          <option value="utilities">Light and water</option>
          <option value="rent">Rent</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="field">
        <span>Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Polish from Adum"
        />
      </label>

      <div className="row-actions">
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <button disabled={!Number(amount) || busy} onClick={save}>
          {busy ? "Saving…" : "Record expense"}
        </button>
      </div>
    </div>
  );
}
