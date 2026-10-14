<template>
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)" />
  <!-- Pre-paint boot: enables reveal motion and applies the saved theme before first paint (no dark-mode flash). -->
  <!-- `:innerHTML` (not v-html): v-html on a dynamic <component> renders empty during SSR. -->
  <!-- eslint-disable-next-line vue/attribute-hyphenation -->
  <component :is="'script'" :innerHTML="bootScript" />
  <link rel="preload" href="/fonts/archivo-Medium.woff2" as="font" type="font/woff2" crossorigin="" />
  <link rel="preload" href="/fonts/poppins-600-normal.woff2" as="font" type="font/woff2" crossorigin="" />
  <link rel="icon" :href="iconUrl" />
  <link rel="apple-touch-icon" :href="iconUrl" />
  <link v-if="seo.canonicalUrl" rel="canonical" :href="seo.canonicalUrl" />
  <meta v-if="seo.robots" name="robots" :content="seo.robots" />
  <template v-if="!seo.robots">
    <meta property="og:type" :content="seo.ogType" />
    <!-- og:title / og:description come from +title / +description (Vike emits them); not repeated here. -->
    <meta property="og:site_name" :content="seo.siteName" />
    <meta v-if="seo.canonicalUrl" property="og:url" :content="seo.canonicalUrl" />
    <meta v-if="seo.imageUrl" property="og:image" :content="seo.imageUrl" />
    <meta name="twitter:card" :content="seo.imageUrl ? 'summary_large_image' : 'summary'" />
    <meta name="twitter:title" :content="seo.title" />
    <meta name="twitter:description" :content="seo.description" />
    <meta v-if="seo.imageUrl" name="twitter:image" :content="seo.imageUrl" />
    <!-- eslint-disable-next-line vue/attribute-hyphenation -->
    <component :is="'script'" v-if="structuredData" type="application/ld+json" :innerHTML="structuredData" />
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePageContext } from "vike-vue/usePageContext";
import defaultLogoUrl from "@/assets/logo.svg?url";

type Site = { name?: string; subtitle?: string | null; siteUrl?: string | null; logo?: string | null; logoIcon?: string | null };
type ProductData = { name?: string; slug?: string; subtitle?: string | null; description?: string | null; coverImage?: string | null; categoryName?: string | null; skus?: { name?: string; price?: string; availableStock?: number | null; minBuy?: number }[] };
type SeoPageContext = { site?: Site; data?: ProductData; urlPathname?: string; routeParams?: { adminPath?: string }; urlParsed?: { origin?: string } };

const pageContext = usePageContext() as SeoPageContext;
const bootScript = "try{var d=document.documentElement;d.classList.add('mk-js');if(localStorage.getItem('storefront-theme')==='dark')d.classList.add('dark')}catch(e){}";
const isPrivatePage = computed(() => {
  const pathname = pageContext.urlPathname || "/";
  return Boolean(pageContext.routeParams?.adminPath) || pathname === "/setup" || pathname === "/order" || pathname === "/checkout" || pathname === "/payment-result" || pathname.startsWith("/_error");
});
const siteUrl = computed(() => normalizeOrigin(pageContext.site?.siteUrl) || normalizeOrigin(pageContext.urlParsed?.origin));
const iconUrl = computed(() => pageContext.site?.logoIcon || pageContext.site?.logo || defaultLogoUrl);
const seo = computed(() => {
  const siteName = pageContext.site?.name || "MioKey";
  const product = pageContext.data;
  const isProductPage = Boolean(product?.name && (pageContext.urlPathname || "").startsWith("/product/"));
  const title = isProductPage ? `${product?.name} - ${siteName}` : siteName;
  const description = isProductPage
    ? product?.subtitle?.trim() || toPlainText(product?.description) || pageContext.site?.subtitle || "自动发卡系统"
    : pageContext.site?.subtitle || "自动发卡系统";
  const canonicalUrl = !isPrivatePage.value && siteUrl.value ? new URL(pageContext.urlPathname || "/", `${siteUrl.value}/`).toString() : null;
  const imageUrl = !isPrivatePage.value ? toAbsoluteUrl(product?.coverImage || pageContext.site?.logoIcon || pageContext.site?.logo || defaultLogoUrl, siteUrl.value) : null;

  return {
    title,
    description,
    siteName,
    canonicalUrl,
    imageUrl,
    ogType: isProductPage ? "product" : "website",
    robots: isPrivatePage.value ? "noindex,nofollow,noarchive" : null,
  };
});

/** schema.org Product + BreadcrumbList for product pages (rich results). Prices are already formatted yuan strings. */
const structuredData = computed(() => {
  const product = pageContext.data;
  const pathname = pageContext.urlPathname || "";
  if (isPrivatePage.value || !product?.name || !pathname.startsWith("/product/")) return null;
  const origin = siteUrl.value;
  const pageUrl = origin ? new URL(pathname, `${origin}/`).toString() : undefined;
  const prices = (product.skus ?? []).map((sku) => Number(sku.price)).filter((value) => Number.isFinite(value));
  const inStock = (product.skus ?? []).some((sku) => sku.availableStock == null || sku.availableStock >= (sku.minBuy ?? 1));
  const availability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const image = toAbsoluteUrl(product.coverImage, origin);
  const graph: Record<string, unknown>[] = [{
    "@type": "Product",
    name: product.name,
    description: seo.value.description,
    ...(image ? { image } : {}),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    brand: { "@type": "Brand", name: seo.value.siteName },
    ...(prices.length ? {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "CNY",
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        offerCount: prices.length,
        availability,
        ...(pageUrl ? { url: pageUrl } : {}),
      },
    } : {}),
  }];
  if (origin) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: seo.value.siteName, item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: product.name, item: pageUrl },
      ],
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
});

function toPlainText(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "";
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function toAbsoluteUrl(value: string | null | undefined, origin: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, origin || undefined);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
</script>
