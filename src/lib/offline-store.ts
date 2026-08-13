const DB_NAME = "nailflow-offline";
const DB_VERSION = 1;
const RESPONSE_STORE = "responses";
const MUTATION_STORE = "mutations";

export type PendingMutation = {
  id: string;
  path: string;
  method: string;
  body?: string;
  token: string | null;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RESPONSE_STORE)) db.createObjectStore(RESPONSE_STORE);
      if (!db.objectStoreNames.contains(MUTATION_STORE)) db.createObjectStore(MUTATION_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCached<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(RESPONSE_STORE, "readonly");
  return requestResult(tx.objectStore(RESPONSE_STORE).get(key)) as Promise<T | undefined>;
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(RESPONSE_STORE, "readwrite");
  tx.objectStore(RESPONSE_STORE).put(value, key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedEntries<T = unknown>(prefix: string): Promise<Array<{ key: string; value: T }>> {
  const db = await openDb();
  const tx = db.transaction(RESPONSE_STORE, "readonly");
  const store = tx.objectStore(RESPONSE_STORE);
  const keys = await requestResult(store.getAllKeys());
  const matching = keys.filter((key): key is string => typeof key === "string" && key.startsWith(prefix));
  return Promise.all(matching.map(async (key) => ({ key, value: await requestResult(store.get(key)) as T })));
}

export async function queueMutation(mutation: Omit<PendingMutation, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  tx.objectStore(MUTATION_STORE).add({
    ...mutation,
    id,
    createdAt: Date.now(),
  });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new Event("nailflow-queue-change"));
  return id;
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readonly");
  const rows = await requestResult(tx.objectStore(MUTATION_STORE).getAll()) as PendingMutation[];
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getPendingCount() {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readonly");
  return requestResult(tx.objectStore(MUTATION_STORE).count());
}

async function removeMutation(id: string) {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  tx.objectStore(MUTATION_STORE).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateMutation(mutation: PendingMutation) {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  tx.objectStore(MUTATION_STORE).put(mutation);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replaceTemporaryId(pending: PendingMutation[], temporaryId: string, serverId: string) {
  for (const mutation of pending) {
    if (!mutation.body?.includes(temporaryId)) continue;
    mutation.body = mutation.body.replaceAll(temporaryId, serverId);
    await updateMutation(mutation);
  }
  const products = await getCached<LocalProduct[]>("/products");
  if (products) await setCached("/products", products.map((p) => p.id === temporaryId ? { ...p, id: serverId } : p));
  const services = await getCached<LocalService[]>("/services");
  if (services) await setCached("/services", services.map((s) => s.id === temporaryId ? { ...s, id: serverId } : s));
}

export async function syncMutations(baseUrl: string) {
  if (!navigator.onLine) return { synced: 0, remaining: await getPendingCount() };
  const pending = await getPendingMutations();
  let synced = 0;

  for (const item of pending) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (item.token) headers.Authorization = `Bearer ${item.token}`;
      const response = await fetch(`${baseUrl}${item.path}`, {
        method: item.method,
        headers,
        body: item.body,
      });
      if (!response.ok) break;
      const responseBody = await response.json().catch(() => ({})) as { id?: string };
      if ((item.path === "/products" || item.path === "/services") && item.method === "POST" && responseBody.id) {
        await replaceTemporaryId(pending, `offline-${item.id}`, responseBody.id);
      }
      if (item.path === "/sales" && item.method === "POST") {
        await removeLocalSale(`offline-${item.id}`);
      }
      await removeMutation(item.id);
      synced += 1;
    } catch {
      break;
    }
  }

  const remaining = await getPendingCount();
  if (synced > 0 && remaining === 0) await refreshFinancialCaches(baseUrl, pending.at(-1)?.token ?? null);
  window.dispatchEvent(new Event("nailflow-queue-change"));
  if (synced > 0) window.dispatchEvent(new Event("nailflow-data-refresh"));
  return { synced, remaining };
}

type LocalProduct = { id: string; name?: string; quantity: number; minStockLevel?: number; sellingPrice?: number; [key: string]: unknown };
type LocalService = { id: string; name?: string; price?: number; [key: string]: unknown };
type SaleLine = { type: "product" | "service"; id: string; name: string; quantity: number; unitPrice: number };
type LocalSale = { id: string; date: string; total: number; paymentMethod: "cash" | "momo"; items: SaleLine[]; pending: true };
type DashboardCache = {
  role: "owner" | "staff";
  lowStockCount: number;
  recentActivity: Array<Record<string, unknown>>;
  today?: { totalTakings: number; salesCount: number; cash: number; momo: number };
  salesCountToday?: number;
};
type ReportCache = {
  period: { from: string; to: string };
  sales: {
    total: number;
    count: number;
    byPaymentMethod: { cash: number; momo: number };
    byType: { product: number; service: number };
  };
  net: number;
  topProducts: Array<{ name: string; quantity: number; income: number }>;
  topServices: Array<{ name: string; quantity: number; income: number }>;
  pendingSales?: number;
};

async function removeLocalSale(id: string) {
  const sales = await getCached<LocalSale[]>("/offline/sales") ?? [];
  await setCached("/offline/sales", sales.filter((sale) => sale.id !== id));
}

async function refreshFinancialCaches(baseUrl: string, token: string | null) {
  const entries = await getCachedEntries("/reports/range?");
  const paths = ["/dashboard", ...entries.map((entry) => entry.key)];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  await Promise.all(paths.map(async (path) => {
    try {
      const response = await fetch(`${baseUrl}${path}`, { headers });
      if (response.ok) await setCached(path, await response.json());
    } catch {
      // The queue is already safe; a later page visit will retry this refresh.
    }
  }));
}

function dateInside(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function addRankedItem(rows: Array<{ name: string; quantity: number; income: number }>, line: SaleLine) {
  const found = rows.find((row) => row.name === line.name);
  const income = line.unitPrice * line.quantity;
  if (found) {
    found.quantity += line.quantity;
    found.income += income;
  } else rows.push({ name: line.name, quantity: line.quantity, income });
  rows.sort((a, b) => b.quantity - a.quantity || b.income - a.income);
}

async function applyOfflineSale(body: Record<string, unknown>, localId: string) {
  const products = await getCached<LocalProduct[]>("/products") ?? [];
  const services = await getCached<LocalService[]>("/services") ?? [];
  const requested = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
  const lines: SaleLine[] = requested.flatMap((item) => {
    const type = item.type === "service" ? "service" : "product";
    const source = type === "product" ? products.find((p) => p.id === item.id) : services.find((s) => s.id === item.id);
    if (!source) return [];
    return [{
      type,
      id: String(item.id),
      name: source.name ?? (type === "product" ? "Product" : "Service"),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(type === "product" ? (source as LocalProduct).sellingPrice ?? 0 : (source as LocalService).price ?? 0),
    }];
  });
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const paymentMethod = body.paymentMethod === "momo" ? "momo" : "cash";
  const date = new Date().toISOString();
  const localSale: LocalSale = { id: localId, date, total, paymentMethod, items: lines, pending: true };
  const offlineSales = await getCached<LocalSale[]>("/offline/sales") ?? [];
  await setCached("/offline/sales", [localSale, ...offlineSales]);

  const updatedProducts = products.map((product) => {
    const sold = lines.find((line) => line.type === "product" && line.id === product.id);
    return sold ? { ...product, quantity: Math.max(0, product.quantity - sold.quantity) } : product;
  });
  await setCached("/products", updatedProducts);

  const dashboard = await getCached<DashboardCache>("/dashboard");
  if (dashboard) {
    const lowStockCount = updatedProducts.filter((p) => p.quantity <= Number(p.minStockLevel ?? 5)).length;
    const activity = { id: localId, date, total, paymentMethod, itemCount: lines.length, pending: true };
    dashboard.lowStockCount = lowStockCount;
    dashboard.recentActivity = [activity, ...(dashboard.recentActivity ?? [])].slice(0, 5);
    if (dashboard.role === "owner" && dashboard.today) {
      dashboard.today.totalTakings = Number(dashboard.today.totalTakings ?? 0) + total;
      dashboard.today.salesCount = Number(dashboard.today.salesCount ?? 0) + 1;
      dashboard.today[paymentMethod] = Number(dashboard.today[paymentMethod] ?? 0) + total;
    } else if (dashboard.role === "staff") dashboard.salesCountToday = Number(dashboard.salesCountToday ?? 0) + 1;
    await setCached("/dashboard", dashboard);
  }

  const reportEntries = await getCachedEntries<ReportCache>("/reports/range?");
  const saleDay = date.slice(0, 10);
  for (const entry of reportEntries) {
    const report = entry.value;
    if (!report?.period || !dateInside(saleDay, report.period.from, report.period.to)) continue;
    report.sales.total = Number(report.sales.total ?? 0) + total;
    report.sales.count = Number(report.sales.count ?? 0) + 1;
    report.sales.byPaymentMethod[paymentMethod] = Number(report.sales.byPaymentMethod[paymentMethod] ?? 0) + total;
    for (const line of lines) {
      const income = line.unitPrice * line.quantity;
      report.sales.byType[line.type] = Number(report.sales.byType[line.type] ?? 0) + income;
      addRankedItem(line.type === "product" ? report.topProducts : report.topServices, line);
    }
    report.net = Number(report.net ?? 0) + total;
    report.pendingSales = Number(report.pendingSales ?? 0) + 1;
    await setCached(entry.key, report);
  }
  window.dispatchEvent(new Event("nailflow-data-refresh"));
}

export async function applyOptimisticChange(path: string, method: string, rawBody?: string, localId?: string) {
  const body = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};

  if (path === "/products" && method === "POST") {
    const products = await getCached<LocalProduct[]>("/products") ?? [];
    await setCached("/products", [...products, { id: localId ?? `offline-${crypto.randomUUID()}`, quantity: 0, ...body }]);
    return;
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch && method === "PATCH") {
    const products = await getCached<LocalProduct[]>("/products") ?? [];
    await setCached("/products", products.map((p) => p.id === productMatch[1] ? { ...p, ...body } : p));
    return;
  }

  const restockMatch = path.match(/^\/products\/([^/]+)\/restock$/);
  if (restockMatch && method === "POST") {
    const products = await getCached<LocalProduct[]>("/products") ?? [];
    const delta = Number(body.delta ?? 0);
    await setCached("/products", products.map((p) => p.id === restockMatch[1] ? { ...p, quantity: p.quantity + delta } : p));
    return;
  }

  if (path === "/services" && method === "POST") {
    const services = await getCached<LocalService[]>("/services") ?? [];
    await setCached("/services", [...services, { id: localId ?? `offline-${crypto.randomUUID()}`, ...body }]);
    return;
  }

  const serviceMatch = path.match(/^\/services\/([^/]+)$/);
  if (serviceMatch && method === "PATCH") {
    const services = await getCached<LocalService[]>("/services") ?? [];
    await setCached("/services", services.map((s) => s.id === serviceMatch[1] ? { ...s, ...body } : s));
    return;
  }

  if (path === "/sales" && method === "POST") {
    await applyOfflineSale(body, localId ?? `offline-${crypto.randomUUID()}`);
  }
}
