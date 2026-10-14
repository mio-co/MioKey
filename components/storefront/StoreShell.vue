<script setup lang="ts">
import StoreHeader, { type HeaderCategory, type HeaderProduct } from "@/components/storefront/StoreHeader.vue";
import StorefrontFooter from "@/components/storefront/StorefrontFooter.vue";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";
import { useLocalizedDocumentTitle } from "@/lib/seo/use-localized-title";

/** Shared storefront frame: announcement bar + sticky header, page content, footer. */
withDefaults(defineProps<{ products?: HeaderProduct[]; categories?: HeaderCategory[]; productTotal?: number | null; narrow?: boolean; tone?: "plain" | "muted"; bottomBar?: boolean }>(), { products: () => [], categories: () => [], productTotal: null, narrow: false, tone: "plain", bottomBar: false });
const { messages } = useStorefrontPreferences();
useLocalizedDocumentTitle();
</script>

<template>
  <div :class="['mk-store flex min-h-dvh flex-col', tone === 'muted' ? 'bg-muted/40' : 'bg-background', bottomBar ? 'max-lg:pb-[calc(76px+env(safe-area-inset-bottom))]' : '']">
    <a href="#main" class="mk-skip-link">{{ messages.shop.skipToContent }}</a>
    <StoreHeader :products="products" :categories="categories" :product-total="productTotal" :narrow="narrow" />
    <main id="main" tabindex="-1" class="flex flex-1 flex-col outline-none">
      <slot />
    </main>
    <StorefrontFooter />
  </div>
</template>
