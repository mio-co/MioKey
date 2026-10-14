/** Storefront tab titles: "页面 · 店铺名" so each page has a unique, descriptive title (SEO + browser tabs). */
const PAGE_LABELS: Record<string, string> = {
  "/login": "登录",
  "/signup": "注册",
  "/order": "订单查询",
  "/account": "账户设置",
  "/account/order": "我的订单",
  "/forgot-password": "找回密码",
  "/reset-password": "重设密码",
  "/two-factor": "双重验证",
  "/checkout": "确认订单",
  "/payment-result": "支付结果",
  "/setup": "初始化",
};

export function storefrontPageTitle(pathname: string | undefined, site?: { name?: string | null; subtitle?: string | null } | null) {
  const siteName = site?.name || "MioKey";
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  if (path === "/") return site?.subtitle?.trim() ? `${siteName} - ${site.subtitle.trim()}` : siteName;
  const label = PAGE_LABELS[path];
  return label ? `${label} · ${siteName}` : siteName;
}
