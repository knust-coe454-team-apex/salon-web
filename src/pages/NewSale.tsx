import { useEffect, useState } from "react";
import { api, cedi } from "../lib/api";

type Product = {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
};
type Service = { id: string; name: string; price: number };

type Line = {
  key: string;
  type: "product" | "service";
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  stock: number | null; // null for services — nothing to run out of
};

export default function NewSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tab, setTab] = useState<"services" | "products">("services");
  const [lines, setLines] = useState<Line[]>([]);
  const [payment, setPayment] = useState<"cash" | "momo">("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api<Service[]>("/services"), api<Product[]>("/products")]).then(
      ([s, p]) => {
        if (s.ok) setServices(s.data);
        if (p.ok) setProducts(p.data);
        if (!s.ok) setError(s.error);
        else if (!p.ok) setError(p.error);
        setLoading(false);
      }
    );
  }, []);

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  function addService(s: Service) {
    setLines((prev) => {
      const key = `service:${s.id}`;
      const found = prev.find((l) => l.key === key);
      if (found)
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + 1 } : l
        );
      return [
        ...prev,
        { key, type: "service", id: s.id, name: s.name, unitPrice: s.price, quantity: 1, stock: null },
      ];
    });
  }

  function addProduct(p: Product) {
    setLines((prev) => {
      const key = `product:${p.id}`;
      const found = prev.find((l) => l.key === key);
      if (found) {
        if (found.quantity >= p.quantity) return prev; // don't exceed stock
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          key,
          type: "product",
          id: p.id,
          name: p.name,
          unitPrice: p.sellingPrice,
          quantity: 1,
          stock: p.quantity,
        },
      ];
    });
  }

  function step(key: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;
          const next = l.quantity + delta;
          if (l.stock !== null && next > l.stock) return l;
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  async function record() {
    setBusy(true);
    setError(null);
    const r = await api<{ id: string; total: number }>("/sales", {
      method: "POST",
      body: JSON.stringify({
        paymentMethod: payment,
        items: lines.map((l) => ({ type: l.type, id: l.id, quantity: l.quantity })),
      }),
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setDone(r.data.total);
    setLines([]);
    // Refresh stock counts so the next sale sees the new numbers
    const p = await api<Product[]>("/products");
    if (p.ok) setProducts(p.data);
  }

  if (done !== null) {
    return (
      <div className="done">
        <p className="eyebrow">Sale recorded</p>
        <div className="takings">
          <span className="takings-sign">GH₵</span>
          <span className="takings-value">
            {done.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="muted">Added to today's takings.</p>
        <button style={{ width: "100%" }} onClick={() => setDone(null)}>
          Record another sale
        </button>
      </div>
    );
  }

  if (loading) return <p className="muted">Loading the menu…</p>;

  return (
    <div>
      <p className="eyebrow">New sale</p>

      <div className="segmented">
        <button
          className={tab === "services" ? "seg on" : "seg"}
          onClick={() => setTab("services")}
        >
          Services
        </button>
        <button
          className={tab === "products" ? "seg on" : "seg"}
          onClick={() => setTab("products")}
        >
          Products
        </button>
      </div>

      <div className="picker">
        {tab === "services" ? (
          services.length === 0 ? (
            <p className="muted">No services yet. Add them from the shop menu.</p>
          ) : (
            services.map((s) => (
              <button key={s.id} className="pick" onClick={() => addService(s)}>
                <span className="pick-name">{s.name}</span>
                <span className="pick-price">{cedi(s.price)}</span>
              </button>
            ))
          )
        ) : products.length === 0 ? (
          <p className="muted">No products yet.</p>
        ) : (
          products.map((p) => {
            const out = p.quantity <= 0;
            return (
              <button
                key={p.id}
                className="pick"
                disabled={out}
                onClick={() => addProduct(p)}
              >
                <span className="pick-name">
                  {p.name}
                  <span className={p.quantity <= p.minStockLevel ? "stock low" : "stock"}>
                    {out ? "out of stock" : `${p.quantity} left`}
                  </span>
                </span>
                <span className="pick-price">{cedi(p.sellingPrice)}</span>
              </button>
            );
          })
        )}
      </div>

      {/* The ticket builds as you tap — products and services on one bill. */}
      {lines.length > 0 && (
        <div className="ticket">
          {lines.map((l) => (
            <div key={l.key} className="ticket-line">
              <div>
                <strong>{l.name}</strong>
                <span className="muted" style={{ display: "block", fontSize: 13 }}>
                  {cedi(l.unitPrice)} each
                  {l.type === "service" && " · service"}
                </span>
              </div>
              <div className="stepper">
                <button className="ghost step" onClick={() => step(l.key, -1)} aria-label={`One less ${l.name}`}>−</button>
                <span>{l.quantity}</span>
                <button className="ghost step" onClick={() => step(l.key, 1)} aria-label={`One more ${l.name}`}>+</button>
              </div>
            </div>
          ))}

          <div className="ticket-total">
            <span>Total</span>
            <strong>{cedi(total)}</strong>
          </div>

          <p className="pay-label">Paid with</p>
          <div className="segmented">
            <button
              className={payment === "cash" ? "seg on" : "seg"}
              onClick={() => setPayment("cash")}
            >
              Cash
            </button>
            <button
              className={payment === "momo" ? "seg on" : "seg"}
              onClick={() => setPayment("momo")}
            >
              Mobile money
            </button>
          </div>

          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

          <button
            style={{ width: "100%", marginTop: 12 }}
            disabled={busy}
            onClick={record}
          >
            {busy ? "Recording…" : `Record sale · ${cedi(total)}`}
          </button>
        </div>
      )}

      {lines.length === 0 && (
        <p className="muted" style={{ marginTop: 20, fontSize: 14 }}>
          Tap a service or product to start the bill.
        </p>
      )}
    </div>
  );
}
