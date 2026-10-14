import { storefrontPageTitle } from "@/lib/seo/page-title";

export default function title(pageContext: { urlPathname?: string; site?: { name?: string; subtitle?: string | null } }) {
  return storefrontPageTitle(pageContext.urlPathname, pageContext.site);
}
