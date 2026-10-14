import type { User } from "better-auth";

declare global {
  const __APP_VERSION__: string;

  namespace Vike {
    interface PageContextServer {
      env: Env;
    }
    interface PageContext {
      // Set by `betterAuthSessionMiddleware`; only `user` is passed to public clients.
      user?: User | null;
      // Server-side authorization state. Never include this in global `passToClient`.
      isAdmin?: boolean;
      rootInitialized?: boolean;
    }
  }
}

export {};

declare module "vue" {
  interface ComponentCustomProperties {
    /** Template-only page text translation (Cycle 4, lib/i18n/page-text.ts). */
    $tr: (text: string | null | undefined, params?: Record<string, string | number>) => string;
  }
}
