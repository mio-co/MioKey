import { traditionalize } from "@/lib/i18n/zh-TW";

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

const PAGE_LABELS_EN: Record<string, string> = {
  "/login": "Sign in", "/signup": "Create account", "/order": "Order lookup", "/account": "Account settings", "/account/order": "My orders",
  "/forgot-password": "Reset password", "/reset-password": "Reset password", "/two-factor": "Two-factor authentication",
  "/checkout": "Checkout", "/payment-result": "Payment result", "/setup": "Setup",
};

/**
 * Cycle 4: the same title in the visitor's storefront language. SSR always renders zh-CN (the locale lives in
 * localStorage); StoreShell/AuthShell re-apply this on the client. Returns null for pages without a fixed label
 * (home, product pages), whose titles come from store data.
 */
export function localizedStorefrontPageTitle(pathname: string | undefined, site: { name?: string | null } | null | undefined, locale: "zh-CN" | "zh-TW" | "en-US") {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const label = PAGE_LABELS[path];
  if (!label) return null;
  const text = locale === "en-US" ? PAGE_LABELS_EN[path] ?? label : locale === "zh-TW" ? traditionalize(label) : label;
  return `${text} · ${site?.name || "MioKey"}`;
}
