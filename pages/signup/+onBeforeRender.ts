import type { PageContextServer } from "vike/types";
import { eq } from "drizzle-orm";
import { createDrizzleDb } from "@/database/drizzle";
import { adminBootstrap } from "@/database/drizzle/schema";
import { getSiteSettings, toPublicSiteSettings } from "@/server/site/public-settings";

export async function onBeforeRender(pageContext: PageContextServer) {
  const [root] = await createDrizzleDb(pageContext.env.DB)
    .select({ id: adminBootstrap.id })
    .from(adminBootstrap)
    .where(eq(adminBootstrap.id, 1))
    .limit(1);

  const settings = await getSiteSettings(pageContext.env.DB);
  return {
    pageContext: {
      // A page-level onBeforeRender replaces the global one, so pass the public site settings on too
      // (header/footer brand, <title>, meta) — otherwise this page falls back to the default "MioKey".
      site: toPublicSiteSettings(settings),
      rootInitialized: Boolean(root),
      registrationEnabled: settings.registrationEnabled,
    },
  };
}
