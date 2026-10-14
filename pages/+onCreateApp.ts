import type { PageContext } from "vike/types";
import { translatePageText } from "@/lib/i18n/page-text";
import { currentStorefrontLocale } from "@/lib/storefront-preferences";

/**
 * Cycle 4: registers `$tr(中文)` for templates (see lib/i18n/page-text.ts). Reading the locale ref inside
 * render keeps it reactive, so switching language re-renders the page text like the rest of the storefront.
 */
export function onCreateApp(pageContext: PageContext & { app?: import("vue").App }) {
  const app = pageContext.app;
  if (!app) return;
  app.config.globalProperties.$tr = (text: string | null | undefined, params?: Record<string, string | number>) => translatePageText(text, currentStorefrontLocale(), params);
}
