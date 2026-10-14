import {
  enhance,
  type RuntimeAdapter,
  type UniversalHandler,
  type UniversalMiddleware,
} from "@universal-middleware/core";
import { betterAuth } from "better-auth";
import { getAuthConfig } from "./better-auth";
import { resolveAuthOrigin, rewriteRequestOrigin, withAuthNoStore } from "./auth-origin";
import { eq, sql } from "drizzle-orm";
import { schema } from "../database/drizzle/schema";
import { getDrizzleDb } from "../database/drizzle";
import { hasRoot } from "./admin";

// On Cloudflare the D1 binding is request-scoped (fresh instance per request); elsewhere it's memoized.
function getAuth(runtime: RuntimeAdapter, publicOrigin?: string) {
  return betterAuth(getAuthConfig(runtime, publicOrigin));
}

// Note: You can directly define a server middleware instead of defining a Universal Middleware. (You can remove @universal-middleware/* — Vike's scaffolder uses it only to simplify its internal logic, see https://github.com/vikejs/vike/discussions/3116)
/**
 * Add the Better Auth user to the context.
 * @link {@see https://better-auth.com/docs/concepts/session-management}
 */
export async function getRequestSession(request: Request, runtime: RuntimeAdapter) {
  const publicOrigin = await resolveAuthOrigin(request, runtime);
  const authRequest = rewriteRequestOrigin(request, publicOrigin);
  return getAuth(runtime, publicOrigin).api.getSession({ headers: authRequest.headers });
}

export const betterAuthSessionMiddleware: UniversalMiddleware = enhance(
  // The context we add here is automatically merged into pageContext
  async (request, context, runtime) => {
    if (!request.headers.get("cookie")) {
      return {
        ...context,
        user: null,
        isAdmin: false,
      };
    }

    try {
      const data = await getRequestSession(request, runtime);
      const userId = data?.user?.id;
      const [account] = userId
        ? await getDrizzleDb(runtime)
            .select({
              disabledAt: schema.user.disabledAt,
              rootUserId: schema.adminBootstrap.userId,
            })
            .from(schema.user)
            .leftJoin(schema.adminBootstrap, eq(schema.adminBootstrap.userId, schema.user.id))
            .where(eq(schema.user.id, userId))
            .limit(1)
        : [];
      const isDisabled = Boolean(account?.disabledAt);
      return {
        ...context,
        // Disabled accounts are treated as signed out, including existing sessions.
        user: isDisabled ? null : data?.user ?? null,
        isAdmin: !isDisabled && account?.rootUserId === userId,
      };
    } catch (error) {
      console.debug("betterAuthSessionMiddleware:", error);
      return {
        ...context,
        user: null,
        isAdmin: false,
      };
    }
  },
  {
    name: "my-app:better-auth-middleware",
    immutable: false,
  },
);

// Note: You can directly define a server middleware instead of defining a Universal Middleware. (You can remove @universal-middleware/* — Vike's scaffolder uses it only to simplify its internal logic, see https://github.com/vikejs/vike/discussions/3116)
/**
 * Better Auth route
 * @link {@see https://better-auth.com/docs/installation}
 **/
export const betterAuthHandler = enhance(
  async (request, _context, runtime) => {
    const publicOrigin = await resolveAuthOrigin(request, runtime);
    const authRequest = rewriteRequestOrigin(request, publicOrigin);
    const authPath = new URL(authRequest.url).pathname;
    const isEmailSignUp = authRequest.method === "POST" && authPath.endsWith("/sign-up/email");

    if (isEmailSignUp && !(await hasRoot(runtime))) {
      return withAuthNoStore(Response.json(
        { code: "SIGN_UP_UNAVAILABLE", message: "Sign-up is currently unavailable." },
        { status: 503 },
      ));
    }

    if (authRequest.method === "POST" && authPath.endsWith("/sign-in/email")) {
      const body = await authRequest.clone().json().catch(() => null) as { email?: unknown; password?: unknown } | null;
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body?.password === "string" ? body.password : null;
      const isAdminLogin = authRequest.headers.get("x-cffk-admin-login") === "1";
      // A non-string password fails Better Auth's body validation for every account alike.
      if (email && password !== null) {
        const [account] = await getDrizzleDb(runtime)
          .select({ disabledAt: schema.user.disabledAt, rootUserId: schema.adminBootstrap.userId })
          .from(schema.user)
          .leftJoin(schema.adminBootstrap, eq(schema.adminBootstrap.userId, schema.user.id))
          .where(sql`lower(${schema.user.email}) = ${email}`)
          .limit(1);
        // Every rejection here must look exactly like Better Auth's own wrong-password
        // answer, so callers cannot tell root, other accounts and disabled accounts apart.
        const rejected = (isAdminLogin && (!account || !account.rootUserId))
          || (!isAdminLogin && Boolean(account?.rootUserId))
          || Boolean(account?.disabledAt);
        if (rejected) {
          // Better Auth hashes the submitted password for unknown users so the
          // answer takes as long as a real password check; do the same work.
          const auth = getAuth(runtime, publicOrigin);
          await (await auth.$context).password.hash(password);
          // Same status, body bytes and Content-Type as Better Auth's wrong-password APIError.
          return withAuthNoStore(new Response(
            JSON.stringify({ message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" }),
            { status: 401, headers: { "content-type": "application/json" } },
          ));
        }
      }
    }

    return withAuthNoStore(await getAuth(runtime, publicOrigin).handler(authRequest));
  },
  {
    name: "my-app:better-auth-handler",
    path: "/api/auth/**",
    method: ["GET", "POST"],
    immutable: false,
  },
) satisfies UniversalHandler;
