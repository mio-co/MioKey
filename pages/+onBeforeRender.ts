import type { PageContextServer } from "vike/types";
import { env } from "@/server/env";
import { DEFAULT_SUPPORT_CONTACT, getSiteSettings, toPublicSiteSettings } from "@/server/site/public-settings";

export async function onBeforeRender(_pageContext: PageContextServer) {
  try {
    return { pageContext: { site: toPublicSiteSettings(await getSiteSettings(env.DB)) } };
  } catch {
    return {
      pageContext: {
        site: {
          name: "MioKey",
          subtitle: null,
          siteUrl: null,
          logo: null,
          logoIcon: null,
          notice: null,
          supportContact: DEFAULT_SUPPORT_CONTACT,
          footerText: null,
          orderNotice: null,
        },
      },
    };
  }
}
