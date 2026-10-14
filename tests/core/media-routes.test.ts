import assert from "node:assert/strict";
// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import { describe, mock, spyOn, test } from "bun:test";
import { Hono } from "hono";
import { AppError } from "../../lib/app-error";

// server/env.ts (pulled in through the auth handler) imports the Workers-only module.
mock.module("cloudflare:workers", () => ({ env: { BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123" } }));

type Bindings = Record<string, unknown> & { DB: D1Database };

async function mediaApp() {
  const authHandler = await import("../../server/better-auth-handler");
  const admin = await import("../../server/admin");
  const service = await import("../../server/media/service");
  const { registerMediaRoutes } = await import("../../server/media/routes");
  const spies = [
    spyOn(authHandler, "getRequestSession").mockResolvedValue({ user: { id: "root" } } as never),
    spyOn(admin, "isRoot").mockResolvedValue(true),
    spyOn(service, "getMediaConfig").mockResolvedValue({ configured: true, credentialStatus: { accessKeyConfigured: true, secretKeyConfigured: true } } as never),
  ];
  const app = new Hono<{ Bindings: Bindings }>();
  const unhandled: unknown[] = [];
  app.onError((error, context) => {
    unhandled.push(error);
    return context.json({ code: "INTERNAL_ERROR", message: "接口异常，请稍后重试。", data: null }, 500);
  });
  registerMediaRoutes(app);
  const env = { DB: {} as D1Database };
  const upload = () => {
    const form = new FormData();
    form.set("file", new File(["x"], "a.png", { type: "image/png" }));
    return app.request("/api/media/upload", { method: "POST", body: form }, env);
  };
  const remove = () => app.request("/api/media/7", { method: "DELETE" }, env);
  return { service, spies, unhandled, upload, remove };
}

describe("media routes error split", () => {
  test("upload: a business AppError is a 400 with its code; any other error goes to app.onError as a 500", async () => {
    const { service, spies, unhandled, upload } = await mediaApp();
    const uploadSpy = spyOn(service, "uploadMedia");
    try {
      uploadSpy.mockRejectedValue(new AppError("MEDIA_FILE_TYPE_INVALID"));
      const business = await upload();
      assert.equal(business.status, 400);
      assert.equal((await business.json() as { code: string }).code, "MEDIA_FILE_TYPE_INVALID");
      assert.equal(unhandled.length, 0);

      uploadSpy.mockRejectedValue(new Error("S3 socket hang up"));
      const failure = await upload();
      assert.equal(failure.status, 500);
      assert.equal((await failure.json() as { code: string }).code, "INTERNAL_ERROR");
      assert.equal(unhandled.length, 1);
      assert.equal((unhandled[0] as Error).message, "S3 socket hang up");
    } finally {
      uploadSpy.mockRestore();
      for (const spy of spies) spy.mockRestore();
    }
  });

  test("delete: a business AppError is a 400 with its code; any other error goes to app.onError as a 500", async () => {
    const { service, spies, unhandled, remove } = await mediaApp();
    const deleteSpy = spyOn(service, "deleteMedia");
    const globals = globalThis as unknown as { caches?: unknown };
    const originalCaches = globals.caches;
    globals.caches = { default: {} };
    try {
      deleteSpy.mockRejectedValue(new AppError("MEDIA_NOT_FOUND"));
      const business = await remove();
      assert.equal(business.status, 400);
      assert.equal((await business.json() as { code: string }).code, "MEDIA_NOT_FOUND");
      assert.equal(unhandled.length, 0);

      deleteSpy.mockRejectedValue(new Error("S3 delete failed"));
      const failure = await remove();
      assert.equal(failure.status, 500);
      assert.equal((await failure.json() as { code: string }).code, "INTERNAL_ERROR");
      assert.equal(unhandled.length, 1);
      assert.equal((unhandled[0] as Error).message, "S3 delete failed");
    } finally {
      globals.caches = originalCaches;
      deleteSpy.mockRestore();
      for (const spy of spies) spy.mockRestore();
    }
  });
});
