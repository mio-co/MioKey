import { getAdminPageMeta } from "@/lib/admin-navigation";

/** Admin tab titles name the section ("订单管理 · 后台 · 店铺名") so several open admin tabs stay distinguishable. */
export default function title(pageContext: { urlPathname?: string; routeParams?: { adminPath?: string }; site?: { name?: string } }) {
  const siteName = pageContext.site?.name || "MioKey";
  const basePath = `/${pageContext.routeParams?.adminPath ?? ""}`;
  const pathname = (pageContext.urlPathname || basePath).replace(/\/$/, "");
  if (pathname === basePath) return `后台登录 · ${siteName}`;
  const meta = getAdminPageMeta(pathname, basePath);
  return meta ? `${meta.pageTitle} · 后台 · ${siteName}` : `后台 · ${siteName}`;
}
