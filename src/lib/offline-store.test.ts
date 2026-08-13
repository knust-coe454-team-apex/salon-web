import "fake-indexeddb/auto";
import { beforeAll, expect, test } from "vitest";

beforeAll(() => {
  Object.defineProperty(globalThis, "window", { value: new EventTarget(), configurable: true });
});

test("offline sale updates stock, dashboard, reports and pending sale storage", async () => {
  const { applyOptimisticChange, getCached, setCached } = await import("./offline-store");
  const today = new Date().toISOString().slice(0, 10);

  await setCached("/products", [
    { id: "product-1", name: "Gel Polish", sellingPrice: 40, quantity: 8, minStockLevel: 5 },
  ]);
  await setCached("/services", [
    { id: "service-1", name: "Gel Manicure", price: 80 },
  ]);
  await setCached("/dashboard", {
    role: "owner",
    today: { totalTakings: 100, salesCount: 2, cash: 60, momo: 40 },
    lowStockCount: 0,
    recentActivity: [],
  });
  const reportKey = `/reports/range?from=${today}&to=${today}`;
  await setCached(reportKey, {
    period: { from: today, to: today },
    sales: {
      total: 100,
      count: 2,
      byPaymentMethod: { cash: 60, momo: 40 },
      byType: { product: 20, service: 80 },
    },
    expenses: { total: 20, count: 1, byCategory: {} },
    net: 80,
    topProducts: [],
    topServices: [],
  });

  await applyOptimisticChange("/sales", "POST", JSON.stringify({
    paymentMethod: "momo",
    items: [
      { type: "product", id: "product-1", quantity: 2 },
      { type: "service", id: "service-1", quantity: 1 },
    ],
  }), "offline-sale-1");

  const products = await getCached<Array<{ quantity: number }>>("/products");
  expect(products?.[0].quantity).toBe(6);

  const dashboard = await getCached<{
    today: { totalTakings: number; salesCount: number; cash: number; momo: number };
    recentActivity: Array<{ id: string; total: number; pending: boolean }>;
  }>("/dashboard");
  expect(dashboard?.today).toEqual({ totalTakings: 260, salesCount: 3, cash: 60, momo: 200 });
  expect(dashboard?.recentActivity[0]).toMatchObject({ id: "offline-sale-1", total: 160, pending: true });

  const report = await getCached<{
    sales: { total: number; count: number; byPaymentMethod: { momo: number }; byType: { product: number; service: number } };
    net: number;
    pendingSales: number;
  }>(reportKey);
  expect(report?.sales.total).toBe(260);
  expect(report?.sales.count).toBe(3);
  expect(report?.sales.byPaymentMethod.momo).toBe(200);
  expect(report?.sales.byType).toEqual({ product: 100, service: 160 });
  expect(report?.net).toBe(240);
  expect(report?.pendingSales).toBe(1);

  const offlineSales = await getCached<Array<{ id: string; total: number; pending: boolean }>>("/offline/sales");
  expect(offlineSales?.[0]).toMatchObject({ id: "offline-sale-1", total: 160, pending: true });
});
