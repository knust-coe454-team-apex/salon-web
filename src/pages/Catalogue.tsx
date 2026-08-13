import { useEffect, useState } from "react";
import { api, cedi } from "../lib/api";

type Product = {
  id: string;
  name: string;
  category: string | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
};
type Service = { id: string; name: string; price: number };

export default function Catalogue() {
  const [tab, setTab] = useState<"services" | "products">("services");
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null); // "new" | item id | null

  async function load(signal?: { cancelled: boolean }) {
    const [s, p] = await Promise.all([
      api<Service[]>("/services"),
      api<Product[]>("/products"),
    ]);
    if (signal?.cancelled) return;
    if (s.ok) setServices(s.data);
    if (p.ok) setProducts(p.data);
    if (!s.ok) setError(s.error);
    else if (!p.ok) setError(p.error);
    setLoading(false);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    const timer = window.setTimeout(() => void load(signal), 0);
    return () => {
      window.clearTimeout(timer);
      signal.cancelled = true;
    };
  }, []);

  function switchTab(t: "services" | "products") {
    setTab(t);
    setOpen(null);
    setError(null);
  }

  if (loading) return <p className="muted">Loading the shop menu…</p>;

  return (
    <div>
      <p className="eyebrow">Shop menu</p>

      <div className="segmented">
        <button
          className={tab === "services" ? "seg on" : "seg"}
          onClick={() => switchTab("services")}
        >
          Services
        </button>
        <button
          className={tab === "products" ? "seg on" : "seg"}
          onClick={() => switchTab("products")}
        >
          Products
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {tab === "services" ? (
        <ServicesTab
          services={services}
          open={open}
          setOpen={setOpen}
          reload={load}
          setError={setError}
        />
      ) : (
        <ProductsTab
          products={products}
          open={open}
          setOpen={setOpen}
          reload={load}
          setError={setError}
        />
      )}
    </div>
  );
}

/* ---------------- services ---------------- */

function ServicesTab({
  services,
  open,
  setOpen,
  reload,
  setError,
}: {
  services: Service[];
  open: string | null;
  setOpen: (v: string | null) => void;
  reload: () => Promise<void>;
  setError: (v: string | null) => void;
}) {
  return (
    <>
      {open === "new" ? (
        <ServiceForm
          onCancel={() => setOpen(null)}
          onSaved={async () => {
            setOpen(null);
            await reload();
          }}
          setError={setError}
        />
      ) : (
        <button
          className="ghost"
          style={{ width: "100%", marginBottom: 12 }}
          onClick={() => setOpen("new")}
        >
          + Add a service
        </button>
      )}

      {services.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No services yet.</p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Add the treatments you offer and their prices, so they can be put on a bill.
          </p>
        </div>
      ) : (
        <div className="picker">
          {services.map((s) =>
            open === s.id ? (
              <ServiceForm
                key={s.id}
                service={s}
                onCancel={() => setOpen(null)}
                onSaved={async () => {
                  setOpen(null);
                  await reload();
                }}
                setError={setError}
              />
            ) : (
              <button key={s.id} className="pick" onClick={() => setOpen(s.id)}>
                <span className="pick-name">{s.name}</span>
                <span className="pick-price">{cedi(s.price)}</span>
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

function ServiceForm({
  service,
  onCancel,
  onSaved,
  setError,
}: {
  service?: Service;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  setError: (v: string | null) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const body = JSON.stringify({ name: name.trim(), price: Number(price) });
    const r = service
      ? await api(`/services/${service.id}`, { method: "PATCH", body })
      : await api("/services", { method: "POST", body });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    await onSaved();
  }

  const valid = name.trim().length > 0 && Number(price) > 0;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <label className="field">
        <span>Service name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gel manicure"
        />
      </label>
      <label className="field">
        <span>Price (GH₵)</span>
        <input
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="80"
        />
      </label>
      <div className="row-actions">
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <button disabled={!valid || busy} onClick={save}>
          {busy ? "Saving…" : service ? "Save changes" : "Add service"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- products ---------------- */

function ProductsTab({
  products,
  open,
  setOpen,
  reload,
  setError,
}: {
  products: Product[];
  open: string | null;
  setOpen: (v: string | null) => void;
  reload: () => Promise<void>;
  setError: (v: string | null) => void;
}) {
  return (
    <>
      {open === "new" ? (
        <ProductForm
          onCancel={() => setOpen(null)}
          onSaved={async () => {
            setOpen(null);
            await reload();
          }}
          setError={setError}
        />
      ) : (
        <button
          className="ghost"
          style={{ width: "100%", marginBottom: 12 }}
          onClick={() => setOpen("new")}
        >
          + Add a product
        </button>
      )}

      {products.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No products yet.</p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Add the items you sell, with how many you have in the shop right now.
          </p>
        </div>
      ) : (
        <div className="picker">
          {products.map((p) =>
            open === p.id ? (
              <ProductForm
                key={p.id}
                product={p}
                onCancel={() => setOpen(null)}
                onSaved={async () => {
                  setOpen(null);
                  await reload();
                }}
                setError={setError}
              />
            ) : (
              <button key={p.id} className="pick" onClick={() => setOpen(p.id)}>
                <span className="pick-name">
                  {p.name}
                  <span className={p.quantity <= p.minStockLevel ? "stock low" : "stock"}>
                    {p.quantity} in stock · reorder at {p.minStockLevel}
                  </span>
                </span>
                <span className="pick-price">{cedi(p.sellingPrice)}</span>
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

function ProductForm({
  product,
  onCancel,
  onSaved,
  setError,
}: {
  product?: Product;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  setError: (v: string | null) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sellingPrice, setSelling] = useState(product ? String(product.sellingPrice) : "");
  const [costPrice, setCost] = useState(product ? String(product.costPrice) : "");
  const [quantity, setQuantity] = useState(product ? "" : "0");
  const [minStockLevel, setMin] = useState(product ? String(product.minStockLevel) : "5");
  const [addStock, setAddStock] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);

    if (product) {
      const r = await api(`/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          sellingPrice: Number(sellingPrice),
          costPrice: Number(costPrice || 0),
          minStockLevel: Number(minStockLevel),
        }),
      });
      if (!r.ok) {
        setBusy(false);
        return setError(r.error);
      }

      // Restocking is a separate, logged movement — never a silent edit.
      const delta = Number(addStock);
      if (delta) {
        const rs = await api(`/products/${product.id}/restock`, {
          method: "POST",
          body: JSON.stringify({ delta, reason: delta > 0 ? "restock" : "correction" }),
        });
        if (!rs.ok) {
          setBusy(false);
          return setError(rs.error);
        }
      }
    } else {
      const r = await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          sellingPrice: Number(sellingPrice),
          costPrice: Number(costPrice || 0),
          quantity: Number(quantity || 0),
          minStockLevel: Number(minStockLevel),
        }),
      });
      if (!r.ok) {
        setBusy(false);
        return setError(r.error);
      }
    }

    setBusy(false);
    await onSaved();
  }

  const valid = name.trim().length > 0 && Number(sellingPrice) > 0;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <label className="field">
        <span>Product name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Perfume"
        />
      </label>

      <div className="two-up">
        <label className="field">
          <span>Selling price (GH₵)</span>
          <input
            type="number"
            inputMode="decimal"
            value={sellingPrice}
            onChange={(e) => setSelling(e.target.value)}
            placeholder="40"
          />
        </label>
        <label className="field">
          <span>You paid (GH₵)</span>
          <input
            type="number"
            inputMode="decimal"
            value={costPrice}
            onChange={(e) => setCost(e.target.value)}
            placeholder="25"
          />
        </label>
      </div>

      <div className="two-up">
        {product ? (
          <label className="field">
            <span>Add stock</span>
            <input
              type="number"
              inputMode="numeric"
              value={addStock}
              onChange={(e) => setAddStock(e.target.value)}
              placeholder="0"
            />
          </label>
        ) : (
          <label className="field">
            <span>In shop now</span>
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
        )}
        <label className="field">
          <span>Warn me at</span>
          <input
            type="number"
            inputMode="numeric"
            value={minStockLevel}
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
      </div>

      {product && (
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          {product.quantity} in stock now. Adding stock is recorded in the item's history.
        </p>
      )}

      <div className="row-actions">
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <button disabled={!valid || busy} onClick={save}>
          {busy ? "Saving…" : product ? "Save changes" : "Add product"}
        </button>
      </div>
    </div>
  );
}
