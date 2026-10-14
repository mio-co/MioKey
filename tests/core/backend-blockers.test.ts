import assert from "node:assert/strict";
// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import { describe, mock, spyOn, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { provideTelefuncContext } from "telefunc";
import { createDrizzleDb } from "../../database/drizzle";
import { category, productV2, supplierAccount } from "../../database/drizzle/schema";
import { AppError, errorCode } from "../../lib/app-error";
import { errorMessages } from "../../lib/error-messages";
import { onPreviewDiscount } from "../../server/discount/preview.telefunc";
import { isExpectedServerError, reportUnexpectedServerError } from "../../server/error-handling";
import { allocateCardsForPaidOrder } from "../../server/inventory/allocator";
import { onImportCards } from "../../server/inventory/admin.telefunc";
import { orderRequestLimit } from "../../server/order/rate-limit";
import { createOrder, normalizeOrderContact } from "../../server/order/service";
import { onCreatePayment } from "../../server/payment/checkout.telefunc";
import { PaymentFlowService } from "../../server/payment/flow-service";
import { createPerpayAdapter } from "../../server/payment/perpay";
import { createProviderAdapter } from "../../server/payment/providers";
import { paymentRepository } from "../../server/payment/repository";
import { importSupplierProduct, type SupplierDb } from "../../server/supplier/import";
import { createTestDatabase } from "../helpers/sqlite-d1";

const testKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const testPrivateKey = testKeyPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const testPublicKey = testKeyPair.publicKey.export({ type: "spki", format: "pem" }).toString();

function rawPemBody(pem: string) {
  return pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
}

// Built with the merchant public key only, exactly what an attacker can do.
async function encryptHashpayCallback(value: unknown) {
  const publicKey = await crypto.subtle.importKey("spki", Buffer.from(rawPemBody(testPublicKey), "base64"), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const aesRaw = await crypto.subtle.exportKey("raw", aesKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(JSON.stringify(value)));
  const key = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, aesRaw);
  return JSON.stringify({ key: Buffer.from(key).toString("base64"), iv: Buffer.from(iv).toString("base64"), data: Buffer.from(data).toString("base64") });
}

const hashpayConfig = { schemaVersion: 1, baseUrl: "https://hashpay.example", merchantId: "merchant-1", privateKey: testPrivateKey, currency: "USD", notifyUrl: "https://shop.example/api/payments/hashpay/notify", returnUrl: "https://shop.example/result" };

async function codeOf(operation: () => unknown) {
  try {
    await operation();
    return null;
  } catch (cause) {
    return cause instanceof AppError ? cause.code : `NON_APP_ERROR:${String(cause)}`;
  }
}

describe("HashPay callback authenticity", () => {
  test("a callback without the HashPay orderId is rejected", async () => {
    const adapter = createProviderAdapter("HASHPAY", hashpayConfig);
    const rawBody = await encryptHashpayCallback({ timestamp: Math.floor(Date.now() / 1000), payload: { merchantNo: "ORD-HP-1", amount: 9.99, currency: "USD", status: "paid" } });
    const result = await adapter.verify({ payload: {}, rawBody });
    assert.equal(result.verified, false);
  });

  test("a callback with orderId passes verify and carries it as paymentOrderNo", async () => {
    const adapter = createProviderAdapter("HASHPAY", hashpayConfig);
    const rawBody = await encryptHashpayCallback({ timestamp: Math.floor(Date.now() / 1000), payload: { merchantNo: "ORD-HP-1", orderId: "HP-1", amount: 9.99, currency: "USD", status: "paid" } });
    const result = await adapter.verify({ payload: {}, rawBody });
    assert.equal(result.verified, true);
    assert.equal(result.paymentOrderNo, "HP-1");
  });

  test("HASHPAY attempts only match the HashPay order id stored at create", async () => {
    const context = createTestDatabase();
    try {
      context.sqlite.run("PRAGMA foreign_keys = OFF");
      const now = Date.now();
      context.sqlite.query("INSERT INTO paymentAttempt (orderId, provider, channel, paymentOrderNo, status, createdAt, updatedAt) VALUES (1, 'HASHPAY', NULL, 'HP-1', 'PENDING', ?, ?)").run(now, now);
      const repository = paymentRepository(context.database);
      assert.equal(await repository.findMatchingAttempt(1, "HASHPAY", undefined), null);
      assert.equal(await repository.findMatchingAttempt(1, "HASHPAY", "HP-OTHER"), null);
      assert.equal((await repository.findMatchingAttempt(1, "HASHPAY", "HP-1"))?.paymentOrderNo, "HP-1");
    } finally {
      context.close();
    }
  });
});

describe("rate limits for checkout and discount preview", () => {
  test("CREATE and DISCOUNT have guest and account limits", () => {
    for (const action of ["CREATE", "DISCOUNT"] as const) {
      assert.ok(orderRequestLimit(action, false) > 0);
      assert.ok(orderRequestLimit(action, true) >= orderRequestLimit(action, false));
    }
  });
});

describe("order input validation", () => {
  test("contactType must be one of the supported values", async () => {
    assert.equal(await codeOf(() => normalizeOrderContact("PHONE" as never, "123")), "CONTACT_TYPE_INVALID");
  });

  test("contactValue must be a string of at most 320 characters", async () => {
    assert.equal(await codeOf(() => normalizeOrderContact("OTHER", 123 as never)), "CONTACT_VALUE_INVALID");
    assert.equal(await codeOf(() => normalizeOrderContact("OTHER", "x".repeat(321))), "CONTACT_VALUE_TOO_LONG");
    assert.equal(normalizeOrderContact("OTHER", "x".repeat(320)), "x".repeat(320));
  });

  test("buyerNote is limited to 500 characters", async () => {
    const context = createTestDatabase();
    try {
      const base = { productId: 1, productSkuId: 1, quantity: 1, paymentProvider: "ALIPAY" as const, contactType: "OTHER" as const, contactValue: "qq-1" };
      assert.equal(await codeOf(() => createOrder(context.database, { ...base, buyerNote: "x".repeat(501) }, null)), "BUYER_NOTE_TOO_LONG");
      assert.equal(await codeOf(() => createOrder(context.database, { ...base, buyerNote: 42 as never }, null)), "BUYER_NOTE_INVALID");
    } finally {
      context.close();
    }
  });

  test("supplier markupBps must be an integer", async () => {
    const product = { id: "p-1", name: "P", description: "", active: true, categoryNames: [], imageUrls: [], skus: [{ id: "s-1", name: "S", costMinor: "100", stockQuantity: 1, active: true }] };
    const input = { provider: "acg" as const, normalizedApiOrigin: "https://supplier.example", protocolVersion: "v1", productId: "p-1", skuIds: ["s-1"], fixedMarkupMinor: "0", markupBps: 1.5, publish: false };
    assert.equal(await codeOf(() => importSupplierProduct({} as SupplierDb, input, product)), "SUPPLIER_MARKUP_INVALID");
  });

  test("new error codes have user messages", () => {
    for (const code of ["CONTACT_TYPE_INVALID", "CONTACT_VALUE_INVALID", "CONTACT_VALUE_TOO_LONG", "BUYER_NOTE_INVALID", "BUYER_NOTE_TOO_LONG", "CARD_CONTENT_INVALID", "CARD_CONTENT_TOO_LONG"]) {
      assert.ok(errorMessages[code], code);
    }
  });
});

function insertShopFixtures(sqlite: { query: (sql: string) => { run: (...values: unknown[]) => unknown; get: (...values: unknown[]) => unknown } }, deliveryType = "FIXED_CARD") {
  const now = Date.now();
  sqlite.query("INSERT INTO siteSetting (id, siteName, siteUrl, registrationEnabled, timezone, createdAt, updatedAt) VALUES (1, 'Shop', 'https://shop.example', 1, 'Asia/Shanghai', ?, ?)").run(now, now);
  sqlite.query("INSERT INTO product_v2 (name, slug, status, sort, createdAt, updatedAt) VALUES ('P', 'p', 'ACTIVE', 0, ?, ?)").run(now, now);
  const product = sqlite.query("SELECT id FROM product_v2 WHERE slug = 'p'").get() as { id: number };
  sqlite.query("INSERT INTO productSku (productId, name, price, status, deliveryType, fixedDeliveryContent, minBuy, maxBuy, sort, createdAt, updatedAt) VALUES (?, 'Default', 1000, 'ACTIVE', ?, 'KEY-1', 1, 1, 0, ?, ?)").run(product.id, deliveryType, now, now);
  const sku = sqlite.query("SELECT id FROM productSku WHERE productId = ?").get(product.id) as { id: number };
  return { productId: product.id, productSkuId: sku.id };
}

describe("HashPay order id stays server-side", () => {
  test("create and resume results carry no paymentOrderNo, while the attempt and log keep it", async () => {
    const context = createTestDatabase();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ checkoutUrl: "https://hashpay.example/checkout/session", order: { id: "HP-SECRET-1" } }), { status: 200 });
    try {
      const ids = insertShopFixtures(context.sqlite);
      const now = Date.now();
      context.sqlite.query("INSERT INTO paymentProvider (provider, name, isEnabled, sort, configJson, createdAt, updatedAt) VALUES ('HASHPAY', 'HashPay', 1, 0, ?, ?, ?)").run(JSON.stringify(hashpayConfig), now, now);
      const service = new PaymentFlowService(context.database);
      const created = await service.create({ ...ids, quantity: 1, paymentProvider: "HASHPAY", contactType: "EMAIL", contactValue: "buyer@example.com" }, null);
      assert.equal(created.payment?.url, "https://hashpay.example/checkout/session");
      assert.equal("paymentOrderNo" in (created.payment ?? {}), false);
      assert.equal(JSON.stringify(created).includes("HP-SECRET-1"), false);

      const resumed = await service.resume(created.orderNo, null, "buyer@example.com");
      assert.equal(resumed.payment?.url, "https://hashpay.example/checkout/session");
      assert.equal("paymentOrderNo" in (resumed.payment ?? {}), false);
      assert.equal(JSON.stringify(resumed).includes("HP-SECRET-1"), false);

      const attempts = context.sqlite.query("SELECT paymentOrderNo, status FROM paymentAttempt ORDER BY id").all() as Array<{ paymentOrderNo: string; status: string }>;
      assert.deepEqual(attempts.map((attempt) => attempt.paymentOrderNo), ["HP-SECRET-1", "HP-SECRET-1"]);
      const logs = context.sqlite.query("SELECT eventType, paymentOrderNo FROM paymentLog ORDER BY id").all();
      assert.deepEqual(logs, [{ eventType: "CREATE", paymentOrderNo: "HP-SECRET-1" }, { eventType: "RESUME", paymentOrderNo: "HP-SECRET-1" }]);
    } finally {
      globalThis.fetch = originalFetch;
      context.close();
    }
  });
});

describe("admin sign-in does not reveal accounts", () => {
  type RawResponse = { status: number; contentType: string | null; headers: string[]; text: string; ms: number };

  async function signIn(database: D1Database, email: string, admin: boolean, password = "wrong-password"): Promise<RawResponse> {
    // server/env.ts imports the Workers-only module; Better Auth only needs a secret from it.
    mock.module("cloudflare:workers", () => ({ env: { BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123" } }));
    const { betterAuthHandler } = await import("../../server/better-auth-handler");
    const handler = betterAuthHandler as unknown as (request: Request, context: unknown, runtime: unknown) => Promise<Response>;
    const request = new Request("https://shop.example/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", ...(admin ? { "x-cffk-admin-login": "1" } : {}) },
      body: JSON.stringify({ email, password }),
    });
    const started = performance.now();
    const response = await handler(request, {}, { runtime: "workerd", env: { DB: database } });
    const text = await response.text();
    return { status: response.status, contentType: response.headers.get("content-type"), headers: [...response.headers.entries()].map(([name, value]) => `${name}: ${value}`).sort(), text, ms: performance.now() - started };
  }

  test("non-root, unknown and disabled accounts get byte-identical responses to Better Auth's real wrong-password answer for root", async () => {
    const context = createTestDatabase();
    try {
      const now = Date.now();
      context.sqlite.query("INSERT INTO user (id, name, email, emailVerified, twoFactorEnabled, createdAt, updatedAt) VALUES ('root', 'Root', 'root@example.com', 1, 0, ?, ?)").run(now, now);
      context.sqlite.query("INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES ('root-credential', 'root', 'credential', 'root', ?, ?, ?)").run(await hashPassword("correct-password"), now, now);
      context.sqlite.query("INSERT INTO user (id, name, email, emailVerified, twoFactorEnabled, createdAt, updatedAt) VALUES ('member', 'Member', 'member@example.com', 1, 0, ?, ?)").run(now, now);
      context.sqlite.query("INSERT INTO user (id, name, email, emailVerified, twoFactorEnabled, disabledAt, createdAt, updatedAt) VALUES ('off', 'Off', 'off@example.com', 1, 0, ?, ?, ?)").run(now, now, now);
      context.sqlite.query("INSERT INTO adminBootstrap (id, userId, createdAt) VALUES (1, 'root', ?)").run(now);

      // Root on the admin path is not rejected early: this response comes from Better Auth itself.
      const real = await signIn(context.database, "root@example.com", true);
      assert.equal(real.status, 401);
      const rejected = [
        await signIn(context.database, "root@example.com", false),
        await signIn(context.database, "member@example.com", true),
        await signIn(context.database, "nobody@example.com", true),
        await signIn(context.database, "off@example.com", true),
        await signIn(context.database, "off@example.com", false),
      ];
      for (const response of rejected) {
        assert.deepEqual({ status: response.status, contentType: response.contentType, text: response.text }, { status: real.status, contentType: real.contentType, text: real.text });
        assert.deepEqual(response.headers, real.headers);
        // The early reject must spend comparable password-hash time; a bare response takes ~0 ms.
        assert.ok(response.ms >= real.ms * 0.25, `reject took ${response.ms.toFixed(1)} ms vs Better Auth ${real.ms.toFixed(1)} ms`);
      }
    } finally {
      context.close();
    }
  }, 60_000);
});

describe("error classification", () => {
  test("provider and network failures are reported; only business AppErrors are not", async () => {
    const originalFetch = globalThis.fetch;
    const errors = spyOn(console, "error").mockImplementation(() => undefined);
    try {
      globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 500 });
      const stripe = createProviderAdapter("STRIPE", { schemaVersion: 1, secretKey: "sk_test_1", webhookSecret: "whsec_1", currency: "usd", notifyUrl: "https://shop.example/api/payments/stripe/notify", returnUrl: "https://shop.example/result" });
      const failure = await stripe.create({ orderNo: "ORD-R-1", amount: 100, subject: "Order", notifyUrl: "https://shop.example/api/payments/stripe/notify", returnUrl: "https://shop.example/result" }).then(() => null, (cause: unknown) => cause);
      assert.ok(failure instanceof Error);
      assert.equal((failure as Error).message, "STRIPE_CREATE_FAILED");
      assert.equal(isExpectedServerError(failure), false);
      reportUnexpectedServerError("payment-create", failure);
      assert.equal(errors.mock.calls.length, 1);

      globalThis.fetch = async () => new Response("<html>", { status: 502, headers: { "content-type": "text/html" } });
      const perpay = createPerpayAdapter({ schemaVersion: 1, baseUrl: "https://perpay.example", apiSecret: "secret", webhookSecret: "webhook", notifyUrl: "", returnUrl: "" } as never);
      const perpayFailure = await perpay.create({ orderNo: "ORD-R-2", amount: 100, subject: "Order", notifyUrl: "", returnUrl: "" }).then(() => null, (cause: unknown) => cause);
      assert.equal((perpayFailure as Error).message, "PERPAY_INVALID_RESPONSE");
      assert.equal(isExpectedServerError(perpayFailure), false);

      assert.equal(isExpectedServerError(new AppError("ORDER_NOT_FOUND")), true);
    } finally {
      globalThis.fetch = originalFetch;
      errors.mockRestore();
    }
  });

  test("HashPay verify reports key misconfiguration but not attacker-supplied envelopes", async () => {
    const errors = spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const adapter = createProviderAdapter("HASHPAY", hashpayConfig);
      const junk = JSON.stringify({ key: Buffer.from("x".repeat(256)).toString("base64"), iv: Buffer.from("y".repeat(12)).toString("base64"), data: Buffer.from("z".repeat(32)).toString("base64") });
      assert.equal((await adapter.verify({ payload: {}, rawBody: junk })).message, "HASHPAY_CALLBACK_INVALID");
      assert.equal((await adapter.verify({ payload: {}, rawBody: "not json" })).message, "HASHPAY_CALLBACK_INVALID");
      const wrongKeyEnvelope = await encryptHashpayCallback({ timestamp: Math.floor(Date.now() / 1000), payload: { merchantNo: "ORD-1", orderId: "HP-1", amount: 1, status: "paid" } });
      const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
      assert.equal((await createProviderAdapter("HASHPAY", { ...hashpayConfig, privateKey: otherKey }).verify({ payload: {}, rawBody: wrongKeyEnvelope })).verified, false);
      assert.equal((await adapter.verify({ payload: {}, rawBody: await encryptHashpayCallback(null) })).message, "HASHPAY_CALLBACK_INVALID");
      assert.equal(errors.mock.calls.length, 0);

      const misconfigured = createProviderAdapter("HASHPAY", { ...hashpayConfig, privateKey: testPublicKey });
      const valid = await encryptHashpayCallback({ timestamp: Math.floor(Date.now() / 1000), payload: { merchantNo: "ORD-1", orderId: "HP-1", amount: 1, status: "paid" } });
      assert.equal((await misconfigured.verify({ payload: {}, rawBody: valid })).verified, false);
      assert.equal(errors.mock.calls.length, 1);
    } finally {
      errors.mockRestore();
    }
  });
});

describe("review follow-up behaviour", () => {
  test("checkout CREATE and discount DISCOUNT limits are enforced at the telefunc entry", async () => {
    const context = createTestDatabase();
    try {
      // Telefunc's sync context lasts one macrotask; the telefunctions read it synchronously on entry.
      const guest = { env: { DB: context.database }, user: null, clientIp: "203.0.113.9" };
      const createInput = { productId: 999, productSkuId: 999, quantity: 1, paymentProvider: "ALIPAY" as const, contactType: "OTHER" as const, contactValue: "qq" };
      const createCodes: string[] = [];
      for (let call = 0; call <= orderRequestLimit("CREATE", false); call += 1) {
        provideTelefuncContext(guest);
        createCodes.push(await onCreatePayment(createInput).then(() => "OK", errorCode));
      }
      assert.equal(createCodes.at(-1), "ORDER_QUERY_RATE_LIMITED");
      assert.deepEqual(new Set(createCodes.slice(0, -1)), new Set(["PAYMENT_PROVIDER_NOT_AVAILABLE"]));

      const discountInput = { productId: 999, productSkuId: 999, quantity: 1, discountCode: "NOPE" };
      const discountCodes: string[] = [];
      for (let call = 0; call <= orderRequestLimit("DISCOUNT", false); call += 1) {
        provideTelefuncContext(guest);
        discountCodes.push(await onPreviewDiscount(discountInput).then(() => "OK", errorCode));
      }
      assert.equal(discountCodes.at(-1), "ORDER_QUERY_RATE_LIMITED");
      assert.deepEqual(new Set(discountCodes.slice(0, -1)), new Set(["PRODUCT_NOT_AVAILABLE"]));
    } finally {
      context.close();
    }
  });

  test("card import rejects a card over 2,000 characters", async () => {
    const context = createTestDatabase();
    try {
      const ids = insertShopFixtures(context.sqlite, "CARD_AUTO");
      const admin = { env: { DB: context.database }, user: { id: "root" }, isAdmin: true };
      provideTelefuncContext(admin);
      assert.equal(await onImportCards({ ...ids, content: `ok-card\n${"x".repeat(2001)}` }).then(() => "OK", errorCode), "CARD_CONTENT_TOO_LONG");
      assert.equal(context.sqlite.query("SELECT count(*) AS n FROM card").get().n, 0);
      provideTelefuncContext(admin);
      assert.deepEqual(await onImportCards({ ...ids, content: `ok-card\n${"x".repeat(2000)}` }), { imported: 2 });
    } finally {
      context.close();
    }
  });

  test("allocator maps only the transaction guard to CARD_INVENTORY_SHORTAGE and rethrows other batch errors", async () => {
    const context = createTestDatabase();
    const errors = spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const ids = insertShopFixtures(context.sqlite, "CARD_AUTO");
      const now = Date.now();
      context.sqlite.query("INSERT INTO card (productId, productSkuId, content, status, createdAt, updatedAt) VALUES (?, ?, 'C-1', 'UNUSED', ?, ?)").run(ids.productId, ids.productSkuId, now, now);
      const d1Failure = new Error("D1_ERROR: storage operation exceeded timeout");
      const failing = { ...context.database, prepare: context.database.prepare.bind(context.database), batch: async () => { throw d1Failure; } } as unknown as D1Database;
      const rethrown = await allocateCardsForPaidOrder(failing, 1, 1, ids.productSkuId).then(() => null, (cause: unknown) => cause);
      assert.equal(rethrown, d1Failure);
      assert.equal(errors.mock.calls.length, 1);

      const guard = { ...failing, batch: async () => { throw new Error("D1_ERROR: CHECK constraint failed: transactionGuard_value_check"); } } as unknown as D1Database;
      assert.equal(await codeOf(() => allocateCardsForPaidOrder(guard, 1, 1, ids.productSkuId)), "CARD_INVENTORY_SHORTAGE");
    } finally {
      errors.mockRestore();
      context.close();
    }
  });

  test("supplier import strips <script> from the upstream description", async () => {
    const context = createTestDatabase();
    try {
      const db = createDrizzleDb(context.database);
      const now = new Date();
      await db.insert(category).values({ name: "Default", slug: "default", status: "ACTIVE", createdAt: now, updatedAt: now });
      const source = { provider: "acg" as const, normalizedApiOrigin: "https://supplier.example", protocolVersion: "acg_v3.1.2_plus" };
      await db.insert(supplierAccount).values({ id: "account-1", ...source, baseUrl: source.normalizedApiOrigin, name: "A", credentialsJson: "{}", enabled: true, balanceMinor: "1000", healthStatus: "healthy", createdAt: now, updatedAt: now });
      const product = { id: "p-x", name: "P", description: "<p>Safe text</p><script>alert(document.cookie)</script><img src=x onerror=alert(1)>", active: true, categoryNames: [], imageUrls: [], skus: [{ id: "s-1", name: "S", costMinor: "100", stockQuantity: 1, active: true }] };
      await importSupplierProduct(db, { ...source, productId: "p-x", skuIds: ["s-1"], fixedMarkupMinor: "0", markupBps: 0, publish: false }, product);
      const [stored] = await db.select({ description: productV2.description }).from(productV2);
      assert.ok(stored?.description?.includes("Safe text"));
      assert.equal(/<script|onerror/i.test(stored?.description ?? ""), false);
    } finally {
      context.close();
    }
  });

  test("a second attempt paid between the first check and this attempt's write is flagged as PAYMENT_EXCEPTION", async () => {
    const context = createTestDatabase();
    try {
      const ids = insertShopFixtures(context.sqlite);
      const created = await createOrder(context.database, { ...ids, quantity: 1, paymentProvider: "ALIPAY", contactType: "OTHER", contactValue: "qq-1", allowPendingPayment: true } as never, null);
      const now = Date.now();
      context.sqlite.query("INSERT INTO paymentAttempt (orderId, provider, paymentOrderNo, status, createdAt, updatedAt) VALUES (?, 'ALIPAY', 'A', 'PENDING', ?, ?)").run(created.id, now, now);
      context.sqlite.query("INSERT INTO paymentAttempt (orderId, provider, paymentOrderNo, status, createdAt, updatedAt) VALUES (?, 'ALIPAY', 'B', 'PENDING', ?, ?)").run(created.id, now, now);
      const [attemptA, attemptB] = (context.sqlite.query("SELECT id FROM paymentAttempt ORDER BY id").all() as Array<{ id: number }>).map((row) => row.id);
      // Attempt B's callback lands after A's first duplicate check but before A marks itself PAID.
      let raced = false;
      const racing = {
        ...context.database,
        batch: context.database.batch.bind(context.database),
        prepare(sql: string) {
          if (!raced && /update "paymentAttempt" set "status"/i.test(sql)) {
            raced = true;
            context.sqlite.query("UPDATE paymentAttempt SET status = 'PAID' WHERE id = ?").run(attemptB);
          }
          return context.database.prepare(sql);
        },
      } as unknown as D1Database;
      const outcome = await new PaymentFlowService(racing).confirm(created.orderNo, "CALLBACK", created.amount, attemptA);
      assert.ok(raced);
      assert.equal(outcome, "PAYMENT_EXCEPTION");
      assert.deepEqual(context.sqlite.query("SELECT eventKey FROM orderEvent WHERE scene = 'PAYMENT_EXCEPTION'").all(), [{ eventKey: `payment-exception:${attemptA}` }]);
    } finally {
      context.close();
    }
  });
});
