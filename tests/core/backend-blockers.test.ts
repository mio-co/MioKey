import assert from "node:assert/strict";
// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import { describe, mock, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { AppError } from "../../lib/app-error";
import { errorMessages } from "../../lib/error-messages";
import { isExpectedServerError } from "../../server/error-handling";
import { orderRequestLimit } from "../../server/order/rate-limit";
import { createOrder, normalizeOrderContact } from "../../server/order/service";
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

describe("admin sign-in does not reveal accounts", () => {
  async function signIn(database: D1Database, email: string, admin: boolean) {
    // server/env.ts imports the Workers-only module; the sign-in branch under test never reads it.
    mock.module("cloudflare:workers", () => ({ env: {} }));
    const { betterAuthHandler } = await import("../../server/better-auth-handler");
    const handler = betterAuthHandler as unknown as (request: Request, context: unknown, runtime: unknown) => Promise<Response>;
    const request = new Request("https://shop.example/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", ...(admin ? { "x-cffk-admin-login": "1" } : {}) },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });
    const response = await handler(request, {}, { runtime: "workerd", env: { DB: database } });
    return { status: response.status, body: await response.json() };
  }

  test("non-root, unknown and disabled accounts get the same 401 as a wrong password", async () => {
    const context = createTestDatabase();
    try {
      const now = Date.now();
      context.sqlite.query("INSERT INTO user (id, name, email, emailVerified, twoFactorEnabled, createdAt, updatedAt) VALUES ('root', 'Root', 'root@example.com', 1, 0, ?, ?)").run(now, now);
      context.sqlite.query("INSERT INTO user (id, name, email, emailVerified, twoFactorEnabled, createdAt, updatedAt) VALUES ('member', 'Member', 'member@example.com', 1, 0, ?, ?)").run(now, now);
      context.sqlite.query("INSERT INTO user (id, name, email, emailVerified, twoFactorEnabled, disabledAt, createdAt, updatedAt) VALUES ('off', 'Off', 'off@example.com', 1, 0, ?, ?, ?)").run(now, now, now);
      context.sqlite.query("INSERT INTO adminBootstrap (id, userId, createdAt) VALUES (1, 'root', ?)").run(now);
      // Better Auth's own wrong-password answer, which the public path also returns for root.
      const wrongPassword = { status: 401, body: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" } };
      assert.deepEqual(await signIn(context.database, "root@example.com", false), wrongPassword);
      assert.deepEqual(await signIn(context.database, "member@example.com", true), wrongPassword);
      assert.deepEqual(await signIn(context.database, "nobody@example.com", true), wrongPassword);
      assert.deepEqual(await signIn(context.database, "off@example.com", true), wrongPassword);
      assert.deepEqual(await signIn(context.database, "off@example.com", false), wrongPassword);
    } finally {
      context.close();
    }
  }, 30_000);
});

describe("error classification", () => {
  test("a plain Error with an UPPER_SNAKE message is reported, an AppError is not", () => {
    assert.equal(isExpectedServerError(new Error("STRIPE_CREATE_FAILED")), false);
    assert.equal(isExpectedServerError(new AppError("STRIPE_CREATE_FAILED")), true);
  });
});
