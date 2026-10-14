import { onMounted, watch } from "vue";
import { usePageContext } from "vike-vue/usePageContext";
import { localizedStorefrontPageTitle } from "@/lib/seo/page-title";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

/** Cycle 4: keeps fixed-label tab titles (登录 / 订单查询 / 确认订单 ...) in the visitor's storefront language. */
export function useLocalizedDocumentTitle() {
  const pageContext = usePageContext() as ReturnType<typeof usePageContext> & { site?: { name?: string | null } | null };
  const { locale } = useStorefrontPreferences();
  const apply = () => {
    const title = localizedStorefrontPageTitle(pageContext.urlPathname, pageContext.site, locale.value);
    if (title && typeof document !== "undefined") document.title = title;
  };
  onMounted(apply);
  watch(() => [locale.value, pageContext.urlPathname], apply);
}
