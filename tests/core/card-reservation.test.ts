// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import { afterEach, describe, expect, test } from "bun:test";
// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import type { Database } from "bun:sqlite";
import { getPublicCatalog, getPublicProductDetail } from "../../server/catalog/public.ts";
import { countAvailableCards } from "../../server/inventory/allocator.ts";
import { closeExpiredPendingOrders, closePendingOrder, confirmOrderPayment, createOrder, getOrderForQuery } from "../../server/order/service.ts";
import { PaymentFlowService } from "../../server/payment/flow-service.ts";
import { createTestDatabase } from "../helpers/sqlite-d1.ts";

const databases: Array<ReturnType<typeof createTestDatabase>> = [];

afterEach(() => {
  while (databases.length) databases.pop()!.close();
});

function setup(cardCount: number) {
  const context = createTestDatabase();
  databases.push(context);
  const now = Date.now();
  context.sqlite.query("INSERT INTO siteSetting (id, siteName, siteUrl, registrationEnabled, timezone, createdAt, updatedAt) VALUES (1, 'Shop', 'https://shop.example.com', 1, 'Asia/Shanghai', ?, ?)").run(now, now);
  context.sqlite.query("INSERT INTO category (id, name, slug, status, sort, createdAt, updatedAt) VALUES (1, 'Cards', 'cards', 'ACTIVE', 0, ?, ?)").run(now, now);
  context.sqlite.query("INSERT INTO product_v2 (categoryId, name, slug, status, sort, createdAt, updatedAt) VALUES (1, 'Card product', 'card-product', 'ACTIVE', 0, ?, ?)").run(now, now);
  const productId = (context.sqlite.query("SELECT id FROM product_v2 WHERE slug = 'card-product'").get() as { id: number }).id;
  context.sqlite.query("INSERT INTO productSku (productId, name, price, status, deliveryType, minBuy, maxBuy, sort, createdAt, updatedAt) VALUES (?, 'Default', 1000, 'ACTIVE', 'CARD_AUTO', 1, 5, 0, ?, ?)").run(productId, now, now);
  const productSkuId = (context.sqlite.query("SELECT id FROM productSku WHERE productId = ?").get(productId) as { id: number }).id;
  for (let index = 1; index <= cardCount; index += 1) {
    context.sqlite.query("INSERT INTO card (productId, productSkuId, content, status, createdAt, updatedAt) VALUES (?, ?, ?, 'UNUSED', ?, ?)").run(productId, productSkuId, `CARD-${index}`, now, now);
  }
  return { ...context, productId, productSkuId };
}

function buy(context: ReturnType<typeof setup>, email: string, quantity = 1) {
  return createOrder(context.database, {
    productId: context.productId,
    productSkuId: context.productSkuId,
    quantity,
    paymentProvider: "ALIPAY",
    contactType: "EMAIL",
    contactValue: email,
  }, null);
}

function cards(sqlite: Database) {
  return sqlite.query("SELECT content, status, orderId FROM card ORDER BY id").all() as Array<{ content: string; status: string; orderId: number | null }>;
}

function errorCode(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}

describe("CARD_AUTO reservation", () => {
  test("concurrent creates for the last card: only one order is created, the other gets PRODUCT_STOCK_NOT_ENOUGH", async () => {
    const context = setup(1);
    const results = await Promise.allSettled([buy(context, "a@example.com"), buy(context, "b@example.com")]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.map((result) => errorCode(result.reason))).toEqual(["PRODUCT_STOCK_NOT_ENOUGH"]);
    const winner = (fulfilled[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof buy>>>).value;
    expect(cards(context.sqlite)).toEqual([{ content: "CARD-1", status: "RESERVED", orderId: winner.id }]);
    expect(context.sqlite.query("SELECT count(*) AS n FROM `order`").get()).toEqual({ n: 1 });
  });

  test("a create that needs more cards than remain unreserved is rejected and reserves nothing", async () => {
    const context = setup(2);
    await buy(context, "a@example.com");
    expect(await buy(context, "b@example.com", 2).then(() => "OK", errorCode)).toBe("PRODUCT_STOCK_NOT_ENOUGH");
    expect(cards(context.sqlite).map((item) => item.status)).toEqual(["RESERVED", "UNUSED"]);
  });

  test("available stock counts exclude reserved cards", async () => {
    const context = setup(3);
    await buy(context, "a@example.com", 2);
    expect(await countAvailableCards(context.database, context.productSkuId)).toBe(1);
    const detail = await getPublicProductDetail(context.database, "card-product");
    expect(detail?.skus[0]?.availableStock).toBe(1);
    const catalog = await getPublicCatalog(context.database);
    expect(catalog.products[0]?.availableStock).toBe(1);
  });

  test("closing a pending order releases its reserved cards", async () => {
    const context = setup(1);
    const created = await buy(context, "a@example.com");
    expect(await closePendingOrder(context.database, created.id)).toEqual({ closed: true });
    expect(cards(context.sqlite)).toEqual([{ content: "CARD-1", status: "UNUSED", orderId: null }]);
    const next = await buy(context, "b@example.com");
    expect(cards(context.sqlite)).toEqual([{ content: "CARD-1", status: "RESERVED", orderId: next.id }]);
  });

  test("expiring pending orders releases their reserved cards", async () => {
    const context = setup(2);
    const created = await buy(context, "a@example.com", 2);
    expect(cards(context.sqlite).map((item) => [item.status, item.orderId])).toEqual([["RESERVED", created.id], ["RESERVED", created.id]]);
    expect(await closeExpiredPendingOrders(context.database, new Date(Date.now() + 60_000), 100, [created.id])).toEqual({ scanned: 1, closed: 1 });
    expect(cards(context.sqlite).map((item) => [item.status, item.orderId])).toEqual([["UNUSED", null], ["UNUSED", null]]);
    expect(await countAvailableCards(context.database, context.productSkuId)).toBe(2);
  });

  test("closing an already paid order does not release its cards", async () => {
    const context = setup(1);
    const created = await buy(context, "a@example.com");
    expect(await confirmOrderPayment(context.database, created.id)).toEqual({ outcome: "CONFIRMED" });
    expect(await closePendingOrder(context.database, created.id)).toEqual({ closed: false });
    expect(cards(context.sqlite)).toEqual([{ content: "CARD-1", status: "SOLD", orderId: created.id }]);
  });

  test("delivery uses the order's own reserved cards", async () => {
    const context = setup(2);
    const first = await buy(context, "a@example.com");
    const second = await buy(context, "b@example.com");
    expect(await confirmOrderPayment(context.database, second.id)).toEqual({ outcome: "CONFIRMED" });
    expect((await getOrderForQuery(context.database, second.orderNo, null, "b@example.com"))?.deliveries).toEqual(["CARD-2"]);
    expect(await confirmOrderPayment(context.database, first.id)).toEqual({ outcome: "CONFIRMED" });
    expect((await getOrderForQuery(context.database, first.orderNo, null, "a@example.com"))?.deliveries).toEqual(["CARD-1"]);
    expect(cards(context.sqlite)).toEqual([
      { content: "CARD-1", status: "SOLD", orderId: first.id },
      { content: "CARD-2", status: "SOLD", orderId: second.id },
    ]);
  });

  test("a pending order created before reservations existed still delivers from unreserved stock", async () => {
    const context = setup(1);
    const legacy = await buy(context, "a@example.com");
    context.sqlite.query("UPDATE card SET status = 'UNUSED', orderId = NULL").run();
    expect(await confirmOrderPayment(context.database, legacy.id)).toEqual({ outcome: "CONFIRMED" });
    expect(cards(context.sqlite)).toEqual([{ content: "CARD-1", status: "SOLD", orderId: legacy.id }]);
  });

  test("resume keeps an order whose cards are already reserved, even when no unreserved stock remains", async () => {
    const context = setup(1);
    const created = await buy(context, "a@example.com");
    const flow = new PaymentFlowService(context.database);
    // No payment provider is configured, so a resume that passes the stock check stops at the provider lookup.
    expect(await flow.resume(created.orderNo, null, "a@example.com").then(() => "OK", errorCode)).toBe("PAYMENT_PROVIDER_NOT_AVAILABLE");
    expect(cards(context.sqlite)).toEqual([{ content: "CARD-1", status: "RESERVED", orderId: created.id }]);
  });

  test("resume of a pending order without a reservation reserves cards atomically or fails out of stock", async () => {
    const context = setup(1);
    const legacy = await buy(context, "a@example.com");
    const other = await buy(context, "b@example.com").then(() => "OK", errorCode);
    expect(other).toBe("PRODUCT_STOCK_NOT_ENOUGH");
    context.sqlite.query("UPDATE card SET status = 'UNUSED', orderId = NULL").run();
    const flow = new PaymentFlowService(context.database);
    expect(await flow.resume(legacy.orderNo, null, "a@example.com").then(() => "OK", errorCode)).toBe("PAYMENT_PROVIDER_NOT_AVAILABLE");
    expect(cards(context.sqlite)).toEqual([{ content: "CARD-1", status: "RESERVED", orderId: legacy.id }]);

    context.sqlite.query("UPDATE card SET status = 'SOLD', orderId = NULL").run();
    expect(await flow.resume(legacy.orderNo, null, "a@example.com").then(() => "OK", errorCode)).toBe("PRODUCT_STOCK_NOT_ENOUGH");
  });
});
